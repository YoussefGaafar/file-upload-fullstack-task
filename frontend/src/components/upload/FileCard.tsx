import type { FileUploadState, UploadStatus } from '../../types';

// DONE BY Youssef Gaafar

interface Props {
  entry: FileUploadState;
  onRemove?: (localId: string) => void;
}

const STATUS_LABELS: Record<UploadStatus, string> = {
  pending: 'Pending',
  uploading: 'Uploading…',
  uploaded: 'Uploaded',
  processing: 'Processing…',
  completed: 'Done',
  failed: 'Failed',
};

const STATUS_COLORS: Record<UploadStatus, string> = {
  pending: 'bg-gray-100 text-gray-500',
  uploading: 'bg-blue-100 text-blue-700',
  uploaded: 'bg-sky-100 text-sky-700',
  processing: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

function ProgressBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function formatMs(ms?: number): string {
  if (ms === undefined || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileCard({ entry, onRemove }: Props) {
  const {
    localId,
    fileName,
    fileSize,
    status,
    uploadProgress,
    processProgress,
    uploadDurationMs,
    processDurationMs,
    totalRows,
    error,
  } = entry;

  const canRemove = status === 'pending' || status === 'completed' || status === 'failed';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {/* CSV file icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
            <svg
              className="h-5 w-5 text-indigo-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800">
              {fileName}
            </p>
            <p className="text-xs text-gray-400">
              {formatBytes(fileSize)}
              {totalRows ? ` · ${totalRows.toLocaleString()} rows` : ''}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>

          {canRemove && onRemove && (
            <button
              onClick={() => onRemove(localId)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Remove"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bars (only show once uploading begins) */}
      {status !== 'pending' && (
        <div className="space-y-2">
          <ProgressBar
            label="Upload"
            value={uploadProgress}
            color="bg-blue-500"
          />
          <ProgressBar
            label="Processing"
            value={processProgress}
            color="bg-emerald-500"
          />
        </div>
      )}

      {/* Timing metrics */}
      {(uploadDurationMs !== undefined || processDurationMs !== undefined) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-xs text-gray-500">
          {uploadDurationMs !== undefined && (
            <span>
              Upload:{' '}
              <span className="font-medium text-gray-700">
                {formatMs(uploadDurationMs)}
              </span>
            </span>
          )}
          {processDurationMs !== undefined && (
            <span>
              Process:{' '}
              <span className="font-medium text-gray-700">
                {formatMs(processDurationMs)}
              </span>
            </span>
          )}
          {uploadDurationMs !== undefined && processDurationMs !== undefined && (
            <span>
              Total:{' '}
              <span className="font-medium text-indigo-600">
                {formatMs(uploadDurationMs + processDurationMs)}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
