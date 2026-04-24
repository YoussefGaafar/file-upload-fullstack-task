import { useCallback, useRef, useState } from 'react';

// DONE BY Youssef Gaafar

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function DropZone({ onFiles, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const all = Array.from(list);
      const csvFiles = all.filter((f) => f.name.toLowerCase().endsWith('.csv'));
      const rejectedFiles = all.filter((f) => !f.name.toLowerCase().endsWith('.csv'));
      if (rejectedFiles.length) setRejected(rejectedFiles.map((f) => f.name));
      if (csvFiles.length) onFiles(csvFiles);
    },
    [onFiles]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={[
        'relative flex flex-col items-center justify-center gap-3',
        'w-full rounded-2xl border-2 border-dashed px-8 py-14',
        'cursor-pointer select-none transition-colors duration-150',
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
          : isDragging
          ? 'border-indigo-400 bg-indigo-50'
          : 'border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40',
      ].join(' ')}
    >
      {/* Cloud upload icon */}
      <svg
        className={`h-12 w-12 ${isDragging ? 'text-indigo-500' : 'text-gray-400'}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.327 3.75 3.75 0 0 1 5.073 4.88A4.5 4.5 0 0 1 17.25 19.5H6.75Z"
        />
      </svg>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-700">
          Drag &amp; drop CSV files here
        </p>
        <p className="mt-1 text-xs text-gray-400">
          or click to browse — only <code className="rounded bg-gray-100 px-1">.csv</code> files accepted
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {rejected.length > 0 && (
        <div
          className="absolute bottom-3 left-3 right-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-200 flex items-start justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span>
            <span className="font-semibold">Only .csv files are accepted. </span>
            Rejected: {rejected.slice(0, 3).join(', ')}
            {rejected.length > 3 && ` and ${rejected.length - 3} more`}
          </span>
          <button
            onClick={() => setRejected([])}
            type="button"
            className="shrink-0 text-red-400 hover:text-red-600"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
