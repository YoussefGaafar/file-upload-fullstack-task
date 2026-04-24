import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { FileUploadState, JobEvent, UploadStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE;

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'grade_importer_jobs';

interface StoredJob {
  localId: string;
  jobId: string;
  fileName: string;
  fileSize: number;
}

function loadStoredJobs(): StoredJob[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persistJob(job: StoredJob) {
  const existing = loadStoredJobs().filter((j) => j.jobId !== job.jobId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, job]));
}

function removeStoredJob(jobId: string) {
  const remaining = loadStoredJobs().filter((j) => j.jobId !== jobId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}

// ── counter ───────────────────────────────────────────────────────────────────

let localIdCounter = 0;
const nextLocalId = () => `local-${++localIdCounter}`;

// ── hook ──────────────────────────────────────────────────────────────────────

export function useUpload() {
  // Initialise from localStorage so restored jobs appear immediately on mount.
  const [files, setFiles] = useState<FileUploadState[]>(() =>
    loadStoredJobs().map((job) => ({
      localId: job.localId,
      fileName: job.fileName,
      fileSize: job.fileSize,
      jobId: job.jobId,
      status: 'processing' as UploadStatus,
      uploadProgress: 100,
      processProgress: 0,
    })),
  );
  const esRefs = useRef<Map<string, EventSource>>(new Map());

  // Derived — true while any file is actively uploading or processing.
  const isImporting = files.some(
    (f) => f.status === 'uploading' || f.status === 'uploaded' || f.status === 'processing',
  );

  // ── SSE streaming (shared between new uploads and restored jobs) ────────────
  const streamProgress = useCallback((localId: string, jobId: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      const patch = (delta: Partial<FileUploadState>) =>
        setFiles((prev) =>
          prev.map((f) => (f.localId === localId ? { ...f, ...delta } : f)),
        );

      const es = new EventSource(`${API_BASE}/progress/${jobId}`);
      esRefs.current.set(jobId, es);

      es.onmessage = (e) => {
        try {
          const event: JobEvent = JSON.parse(e.data);

          patch({
            status: event.status,
            processProgress: Math.min(Math.round(event.progress_pct), 100),
            uploadProgress: 100,
            totalRows: event.total_rows,
            processedRows: event.processed_rows,
            processDurationMs: Math.round(event.process_duration_ms),
            overallDurationMs: Math.round(event.overall_duration_ms),
            // Only set from SSE if not already measured client-side
            ...(event.upload_duration_ms > 0 && {
              uploadDurationMs: Math.round(event.upload_duration_ms),
            }),
          });

          if (event.status === 'completed' || event.status === 'failed') {
            if (event.status === 'failed') patch({ error: event.error });
            es.close();
            esRefs.current.delete(jobId);
            removeStoredJob(jobId);
            resolve();
          }
        } catch {
          // malformed SSE event — ignore
        }
      };

      es.onerror = () => {
        patch({ status: 'failed', error: 'SSE connection lost' });
        es.close();
        esRefs.current.delete(jobId);
        removeStoredJob(jobId);
        resolve();
      };
    });
  }, []);

  // ── Reconnect SSE for any jobs restored from localStorage on mount ──────────
  useEffect(() => {
    loadStoredJobs().forEach((job) => {
      streamProgress(job.localId, job.jobId);
    });
  }, [streamProgress]);

  // ── Cleanup all open EventSources on unmount ────────────────────────────────
  useEffect(() => {
    const esMap = esRefs.current;
    return () => {
      esMap.forEach((es) => es.close());
    };
  }, []);

  // ── Add files to queue ──────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.fileName}-${f.fileSize}`));
      const novel = incoming.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      const newEntries: FileUploadState[] = novel.map((f) => ({
        localId: nextLocalId(),
        file: f,
        fileName: f.name,
        fileSize: f.size,
        status: 'pending',
        uploadProgress: 0,
        processProgress: 0,
      }));
      return [...prev, ...newEntries];
    });
  }, []);

  // ── Remove a file from the queue ────────────────────────────────────────────
  const removeFile = useCallback((localId: string) => {
    setFiles((prev) => prev.filter((f) => f.localId !== localId));
  }, []);

  // ── Clear completed / failed files ─────────────────────────────────────────
  const clearFinished = useCallback(() => {
    setFiles((prev) =>
      prev.filter((f) => f.status !== 'completed' && f.status !== 'failed'),
    );
  }, []);

  // ── Upload one file then stream its processing progress ─────────────────────
  const uploadOne = useCallback(
    async (entry: FileUploadState) => {
      const { localId, file } = entry;
      if (!file) return;

      const patch = (delta: Partial<FileUploadState>) =>
        setFiles((prev) =>
          prev.map((f) => (f.localId === localId ? { ...f, ...delta } : f)),
        );

      // 1. Upload
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

      const uploadDurationMs = Math.round(performance.now() - uploadStartTime);

      patch({
        jobId,
        status: 'uploaded',
        uploadProgress: 100,
        uploadDurationMs,
      });

      // Persist so the job survives tab switches and page refreshes
      persistJob({ localId, jobId, fileName: entry.fileName, fileSize: entry.fileSize });

      // 2. Stream processing progress via SSE
      patch({ status: 'processing' });
      await streamProgress(localId, jobId);
    },
    [streamProgress],
  );

  // ── Kick off all pending files in parallel ──────────────────────────────────
  const startImport = useCallback(async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    await Promise.all(pending.map(uploadOne));
  }, [files, uploadOne]);

  return { files, isImporting, addFiles, removeFile, clearFinished, startImport };
}
