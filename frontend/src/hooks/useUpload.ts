import { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import type { FileUploadState, JobEvent } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE;

let localIdCounter = 0;
const nextLocalId = () => `local-${++localIdCounter}`;

export function useUpload() {
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  // Keep refs to EventSource instances so we can close them on unmount.
  const esRefs = useRef<Map<string, EventSource>>(new Map());

  /** Add files to the queue (merge – no duplicates by name+size). */
  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.file.name}-${f.file.size}`));
      const novel = incoming.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      const newEntries: FileUploadState[] = novel.map((f) => ({
        localId: nextLocalId(),
        file: f,
        status: 'pending',
        uploadProgress: 0,
        processProgress: 0,
      }));
      return [...prev, ...newEntries];
    });
  }, []);

  /** Remove a file from the queue (only while not actively importing). */
  const removeFile = useCallback((localId: string) => {
    setFiles((prev) => prev.filter((f) => f.localId !== localId));
  }, []);

  /** Clear all completed/failed files from the list. */
  const clearFinished = useCallback(() => {
    setFiles((prev) =>
      prev.filter((f) => f.status !== 'completed' && f.status !== 'failed'),
    );
  }, []);

  /** Upload one file, open SSE, and stream processing progress. */
  const uploadOne = useCallback(async (entry: FileUploadState) => {
    const { localId, file } = entry;

    const patch = (delta: Partial<FileUploadState>) =>
      setFiles((prev) =>
        prev.map((f) => (f.localId === localId ? { ...f, ...delta } : f)),
      );

    // ── 1. Upload ────────────────────────────────────────────────────────
    // Capture start time in a local variable — entry.uploadStartTime would
    // always be undefined here because patch() is async (React setState).
    const uploadStartTime = performance.now();
    patch({ status: 'uploading', uploadStartTime });

    const formData = new FormData();
    formData.append('file', file);

    let jobId: string;
    try {
      const { data } = await axios.post<{ job_id: string }>(
        `${API_BASE}/upload`,
        formData,
        {
          onUploadProgress(e) {
            if (e.total) {
              patch({ uploadProgress: Math.round((e.loaded / e.total) * 100) });
            }
          },
        },
      );
      jobId = data.job_id;
    } catch (err: unknown) {
      let msg = 'Upload failed';
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      patch({ status: 'failed', error: msg });
      return;
    }

    const uploadEndTime = performance.now();
    const uploadDurationMs = Math.round(uploadEndTime - uploadStartTime);

    patch({
      jobId,
      status: 'uploaded',
      uploadProgress: 100,
      uploadEndTime,
      uploadDurationMs,
    });

    // ── 2. Stream processing progress via SSE ────────────────────────────
    patch({ status: 'processing' });

    await new Promise<void>((resolve) => {
      const es = new EventSource(`${API_BASE}/progress/${jobId}`);
      esRefs.current.set(jobId, es);

      es.onmessage = (e) => {
        try {
          const event: JobEvent = JSON.parse(e.data);

          patch({
            status: event.status,
            processProgress: Math.min(Math.round(event.progress_pct), 100),
            totalRows: event.total_rows,
            processedRows: event.processed_rows,
            processDurationMs: Math.round(event.process_duration_ms),
            overallDurationMs: Math.round(event.overall_duration_ms),
          });

          if (event.status === 'completed' || event.status === 'failed') {
            if (event.status === 'failed') {
              patch({ error: event.error });
            }
            es.close();
            esRefs.current.delete(jobId);
            resolve();
          }
        } catch {
          // malformed event – ignore
        }
      };

      es.onerror = () => {
        patch({ status: 'failed', error: 'SSE connection lost' });
        es.close();
        esRefs.current.delete(jobId);
        resolve();
      };
    });
  }, []);

  /** Kick off all pending files in parallel. */
  const startImport = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;

    setIsImporting(true);
    await Promise.all(pending.map(uploadOne));
    setIsImporting(false);
  }, [files, uploadOne]);

  return { files, isImporting, addFiles, removeFile, clearFinished, startImport };
}
