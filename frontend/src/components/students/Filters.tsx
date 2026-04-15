import type { StudentFilters } from '../../types';
import { SUBJECTS } from '../../types';
// DONE BY Youssef Gaafar

interface Props {
  filters: StudentFilters;
  onChange: (delta: Partial<StudentFilters>) => void;
}

// Blocks e, E, +, -, . so only whole digits are accepted.
const blockNonDigits = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
};

// Clamps the typed value to [0, 100] and strips anything non-numeric.
const clampGrade = (raw: string): string => {
  if (raw === '') return '';
  const n = parseInt(raw, 10);
  if (isNaN(n)) return '';
  return String(Math.min(100, Math.max(0, n)));
};

export default function Filters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Name search — full width on mobile */}
      <input
        type="text"
        placeholder="Search by name…"
        value={filters.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 sm:w-48"
      />

      {/* Subject dropdown — full width on mobile */}
      <select
        value={filters.subject}
        onChange={(e) => onChange({ subject: e.target.value })}
        className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 sm:w-auto"
      >
        <option value="">All subjects</option>
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Grade filters — side by side on one row even on mobile */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1 sm:flex-none">
          <span className="shrink-0 text-sm text-gray-500">Grade &gt;</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="0"
            value={filters.gradeGt}
            onKeyDown={blockNonDigits}
            onChange={(e) => onChange({ gradeGt: clampGrade(e.target.value) })}
            className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 sm:w-20"
          />
        </div>

        <div className="flex flex-1 items-center gap-1 sm:flex-none">
          <span className="shrink-0 text-sm text-gray-500">Grade &lt;</span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="100"
            value={filters.gradeLt}
            onKeyDown={blockNonDigits}
            onChange={(e) => onChange({ gradeLt: clampGrade(e.target.value) })}
            className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 sm:w-20"
          />
        </div>
      </div>

      {/* Reset */}
      {(filters.name || filters.subject || filters.gradeGt || filters.gradeLt) && (
        <button
          onClick={() =>
            onChange({ name: '', subject: '', gradeGt: '', gradeLt: '' })
          }
          className="h-9 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-500 hover:bg-gray-100 sm:w-auto"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
