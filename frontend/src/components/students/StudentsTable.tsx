import type { Student, StudentFilters } from '../../types';

// DONE BY Youssef Gaafar

interface Props {
  students: Student[];
  filters: StudentFilters;
  onSort: (col: 'student_name' | 'grade') => void;
}

interface SortableThProps {
  col: 'student_name' | 'grade';
  filters: StudentFilters;
  onSort: (col: 'student_name' | 'grade') => void;
  children: React.ReactNode;
}

function SortableTh({ col, filters, onSort, children }: SortableThProps) {
  return (
    <th
      onClick={() => onSort(col)}
      className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-800"
    >
      <span className="inline-flex items-center">
        {children}
        <SortIcon col={col} filters={filters} />
      </span>
    </th>
  );
}

function SortIcon({
  col,
  filters,
}: {
  col: 'student_name' | 'grade';
  filters: StudentFilters;
}) {
  if (filters.sortBy !== col)
    return (
      <svg className="ml-1 h-3 w-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6-4 4-4-4" />
      </svg>
    );

  return filters.sortOrder === 'asc' ? (
    <svg className="ml-1 h-3 w-3 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  ) : (
    <svg className="ml-1 h-3 w-3 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function gradeColor(grade: number) {
  if (grade >= 90) return 'text-green-700 bg-green-50';
  if (grade >= 70) return 'text-blue-700 bg-blue-50';
  if (grade >= 50) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

export default function StudentsTable({ students, filters, onSort }: Props) {
  if (!students || students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="mb-3 h-12 w-12" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293L8.293 13.293A1 1 0 0 0 7.586 13H5" />
        </svg>
        <p className="text-sm">No students match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 bg-white text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              #
            </th>
            <SortableTh col="student_name" filters={filters} onSort={onSort}>Name</SortableTh>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Subject
            </th>
            <SortableTh col="grade" filters={filters} onSort={onSort}>Grade</SortableTh>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-400">{s.id}</td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {s.student_name}
              </td>
              <td className="px-4 py-3 text-gray-600">{s.subject}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColor(
                    s.grade
                  )}`}
                >
                  {s.grade}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
