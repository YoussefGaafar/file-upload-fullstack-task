import { useState } from 'react';
import axios from 'axios';
import { useStudents } from '../hooks/useStudents';
import Filters from '../components/students/Filters';
import StudentsTable from '../components/students/StudentsTable';
import Pagination from '../components/students/Pagination';

const API_BASE = 'http://localhost:8080/api';

export default function StudentsPage() {
  const { data, loading, error, filters, updateFilters, toggleSort, refresh } =
    useStudents();

  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      await axios.delete(`${API_BASE}/students`);
      refresh();
    } finally {
      setClearing(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Records</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse, search, and filter all imported student grades.
          </p>
        </div>

        <button
          onClick={() => setConfirmOpen(true)}
          disabled={clearing || (data?.total === 0)}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
          Clear All
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5">
        <Filters filters={filters} onChange={updateFilters} />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-3 text-sm">Loading…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Table + pagination */}
      {data && !loading && (
        <div className="space-y-4">
          <StudentsTable students={data.data} filters={filters} onSort={toggleSort} />
          {data.total > 0 && (
            <Pagination
              page={data.page}
              totalPages={Number(data.total_pages)}
              pageSize={data.page_size}
              total={Number(data.total)}
              onPage={(p) => updateFilters({ page: p })}
              onPageSize={(s) => updateFilters({ pageSize: s })}
            />
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>

            <h2 className="mb-1 text-lg font-semibold text-gray-900">Clear all students?</h2>
            <p className="mb-6 text-sm text-gray-500">
              This will permanently delete all{' '}
              <span className="font-medium text-gray-800">
                {data?.total.toLocaleString()}
              </span>{' '}
              student records from the database. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {clearing ? 'Clearing…' : 'Yes, clear all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
