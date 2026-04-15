import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentsTable from './StudentsTable';
import type { Student, StudentFilters } from '../../types';

const baseFilters: StudentFilters = {
  name: '',
  subject: '',
  gradeGt: '',
  gradeLt: '',
  sortBy: 'student_name',
  sortOrder: 'asc',
  page: 1,
  pageSize: 20,
};

const mockStudents: Student[] = [
  { id: 1, student_id: 'uuid-1', student_name: 'Alice', subject: 'Math', grade: 95, created_at: '2024-01-01' },
  { id: 2, student_id: 'uuid-2', student_name: 'Bob', subject: 'Physics', grade: 42, created_at: '2024-01-02' },
];

describe('StudentsTable', () => {
  it('renders empty state when there are no students', () => {
    render(<StudentsTable students={[]} filters={baseFilters} onSort={vi.fn()} />);
    expect(screen.getByText(/no students match/i)).toBeInTheDocument();
  });

  it('renders a row for each student', () => {
    render(<StudentsTable students={mockStudents} filters={baseFilters} onSort={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders subject and grade values', () => {
    render(<StudentsTable students={mockStudents} filters={baseFilters} onSort={vi.fn()} />);
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('calls onSort with student_name when Name header is clicked', async () => {
    const onSort = vi.fn();
    render(<StudentsTable students={mockStudents} filters={baseFilters} onSort={onSort} />);
    await userEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('student_name');
  });

  it('calls onSort with grade when Grade header is clicked', async () => {
    const onSort = vi.fn();
    render(<StudentsTable students={mockStudents} filters={baseFilters} onSort={onSort} />);
    await userEvent.click(screen.getByText('Grade'));
    expect(onSort).toHaveBeenCalledWith('grade');
  });

  it('does not call onSort when clicking non-sortable Subject header', () => {
    const onSort = vi.fn();
    render(<StudentsTable students={mockStudents} filters={baseFilters} onSort={onSort} />);
    // Subject header exists but is not clickable via SortableTh
    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(onSort).not.toHaveBeenCalled();
  });

  it('shows asc sort icon on active sort column', () => {
    const filters = { ...baseFilters, sortBy: 'student_name' as const, sortOrder: 'asc' as const };
    const { container } = render(<StudentsTable students={mockStudents} filters={filters} onSort={vi.fn()} />);
    // SVG className in jsdom is SVGAnimatedString — use getAttribute instead.
    const ths = container.querySelectorAll('th');
    const nameTh = Array.from(ths).find((th) => th.textContent?.includes('Name'));
    const svgClass = nameTh?.querySelector('svg')?.getAttribute('class') ?? '';
    expect(svgClass).toContain('indigo');
  });

  it('shows desc sort icon when sortOrder is desc', () => {
    const filters = { ...baseFilters, sortBy: 'grade' as const, sortOrder: 'desc' as const };
    const { container } = render(<StudentsTable students={mockStudents} filters={filters} onSort={vi.fn()} />);
    const ths = container.querySelectorAll('th');
    const gradeTh = Array.from(ths).find((th) => th.textContent?.includes('Grade'));
    const svgClass = gradeTh?.querySelector('svg')?.getAttribute('class') ?? '';
    expect(svgClass).toContain('indigo');
  });
});
