import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import type { StudentFilters, StudentsResponse } from '../types';

const API_BASE = 'http://localhost:8080/api';

const DEFAULT_FILTERS: StudentFilters = {
  name: '',
  subject: '',
  gradeGt: '',
  gradeLt: '',
  sortBy: 'student_name',
  sortOrder: 'asc',
  page: 1,
  pageSize: 20,
};

export function useStudents() {
  const [filters, setFilters] = useState<StudentFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async (f: StudentFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(f.page),
        page_size: String(f.pageSize),
        sort_by: f.sortBy,
        sort_order: f.sortOrder,
      };
      if (f.name) params.name = f.name;
      if (f.subject) params.subject = f.subject;
      if (f.gradeGt) params.grade_gt = f.gradeGt;
      if (f.gradeLt) params.grade_lt = f.gradeLt;

      const { data: res } = await axios.get<StudentsResponse>(
        `${API_BASE}/students`,
        { params }
      );
      setData(res);
    } catch {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever filters change.
  useEffect(() => {
    fetchStudents(filters);
  }, [filters, fetchStudents]);

  const updateFilters = useCallback((delta: Partial<StudentFilters>) => {
    setFilters((prev) => {
      // Reset to page 1 whenever anything other than page changes.
      const resetPage = Object.keys(delta).some((k) => k !== 'page');
      return { ...prev, ...delta, ...(resetPage ? { page: 1 } : {}) };
    });
  }, []);

  const toggleSort = useCallback(
    (col: 'student_name' | 'grade') => {
      setFilters((prev) => ({
        ...prev,
        sortBy: col,
        sortOrder:
          prev.sortBy === col && prev.sortOrder === 'asc' ? 'desc' : 'asc',
        page: 1,
      }));
    },
    []
  );

  const refresh = useCallback(() => {
    fetchStudents(filters);
  }, [filters, fetchStudents]);

  return { data, loading, error, filters, updateFilters, toggleSort, refresh };
}
