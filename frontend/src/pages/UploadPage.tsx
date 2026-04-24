import { useUploadContext } from '../context/UploadContext';
import DropZone from '../components/upload/DropZone';
import FileList from '../components/upload/FileList';

export default function UploadPage() {
  const { files, isImporting, addFiles, removeFile, clearFinished, startImport } =
    useUploadContext();

  const hasPending = files.some((f) => f.status === 'pending');
  const hasFinished = files.some(
    (f) => f.status === 'completed' || f.status === 'failed'
  );
  const allDone =
    files.length > 0 &&
    files.every((f) => f.status === 'completed' || f.status === 'failed');

  // Overall timing across all files (upload + process for each file)
  const overallMs = files.reduce(
    (sum, f) => sum + (f.uploadDurationMs ?? 0) + (f.processDurationMs ?? 0),
    0
  );
  const formatMs = (ms: number) =>
    ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import CSV Files</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload one or more student grade CSV files. All files are processed in
          parallel on the server.
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onFiles={addFiles} disabled={isImporting} />

      {/* Actions */}
      {files.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={startImport}
              disabled={isImporting || !hasPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Importing…
                </>
              ) : (
                'Start Import'
              )}
            </button>

            {hasFinished && (
              <button
                onClick={clearFinished}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Clear finished
              </button>
            )}
          </div>

          {/* Overall time */}
          {allDone && overallMs > 0 && (
            <p className="text-sm text-gray-500">
              Total time:{' '}
              <span className="font-semibold text-indigo-600">
                {formatMs(overallMs)}
              </span>
            </p>
          )}
        </div>
      )}

      {/* File list with individual progress bars */}
      <FileList files={files} onRemove={removeFile} />
    </div>
  );
}
