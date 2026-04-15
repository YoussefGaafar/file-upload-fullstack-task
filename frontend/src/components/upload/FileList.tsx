import type { FileUploadState } from '../../types';
import FileCard from './FileCard';

// DONE BY Youssef Gaafar

interface Props {
  files: FileUploadState[];
  onRemove: (localId: string) => void;
}

export default function FileList({ files, onRemove }: Props) {
  if (files.length === 0) return null;

  const completed = files.filter((f) => f.status === 'completed').length;
  const failed = files.filter((f) => f.status === 'failed').length;

  return (
    <div className="mt-6">
      {/* Summary header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Files&nbsp;
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {files.length}
          </span>
        </h2>

        <div className="flex gap-3 text-xs text-gray-500">
          {completed > 0 && (
            <span className="text-green-600 font-medium">
              {completed} completed
            </span>
          )}
          {failed > 0 && (
            <span className="text-red-600 font-medium">
              {failed} failed
            </span>
          )}
        </div>
      </div>

      {/* Individual file cards */}
      <div className="flex flex-col gap-3">
        {files.map((entry) => (
          <FileCard
            key={entry.localId}
            entry={entry}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
