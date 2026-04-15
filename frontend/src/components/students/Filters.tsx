import type { StudentFilters } from '../../types';
import { SUBJECTS } from '../../types';
// DONE BY Youssef Gaafar

interface Props {
  filters: StudentFilters;
  onChange: (delta: Partial<StudentFilters>) => void;
}

export default function Filters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Name search */} 
      <input
        type="text"
        placeholder="Search by name…"
        value={filters.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="h-9 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />

      {/* Subject dropdown */}
      <select
        value={filters.subject}
        onChange={(e) => onChange({ subject: e.target.value })}
        className="h-9 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        <option value="">All subjects</option>
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Grade GT */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500">Grade &gt;</span>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="0"
          value={filters.gradeGt}
          onChange={(e) => onChange({ gradeGt: e.target.value })}
          className="h-9 w-20 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* Grade LT */}
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-500">Grade &lt;</span>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="100"
          value={filters.gradeLt}
          onChange={(e) => onChange({ gradeLt: e.target.value })}
          className="h-9 w-20 rounded-lg border border-gray-300 px-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* Reset */}
      {(filters.name || filters.subject || filters.gradeGt || filters.gradeLt) && (
        <button
          onClick={() =>
            onChange({ name: '', subject: '', gradeGt: '', gradeLt: '' })
          }
          className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 hover:bg-gray-100"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
