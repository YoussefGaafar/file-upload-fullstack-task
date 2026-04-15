import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Filters from './Filters';
import type { StudentFilters } from '../../types';
import { SUBJECTS } from '../../types';

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

describe('Filters', () => {
  it('renders the name search input', () => {
    render(<Filters filters={baseFilters} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  it('renders subject dropdown with all subjects', () => {
    render(<Filters filters={baseFilters} onChange={vi.fn()} />);
    for (const s of SUBJECTS) {
      expect(screen.getByRole('option', { name: s })).toBeInTheDocument();
    }
  });

  it('calls onChange with name delta when typing in name input', async () => {
    const onChange = vi.fn();
    render(<Filters filters={baseFilters} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/search by name/i), 'Ali');
    // Called once per character typed
    expect(onChange).toHaveBeenLastCalledWith({ name: 'i' });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('calls onChange with subject when dropdown changes', async () => {
    const onChange = vi.fn();
    render(<Filters filters={baseFilters} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Mathematics');
    expect(onChange).toHaveBeenCalledWith({ subject: 'Mathematics' });
  });

  it('calls onChange with gradeGt when grade > input changes', async () => {
    const onChange = vi.fn();
    render(<Filters filters={baseFilters} onChange={onChange} />);
    const inputs = screen.getAllByRole('spinbutton');
    await userEvent.type(inputs[0], '70');
    expect(onChange).toHaveBeenLastCalledWith({ gradeGt: '0' });
  });

  it('calls onChange with gradeLt when grade < input changes', async () => {
    const onChange = vi.fn();
    render(<Filters filters={baseFilters} onChange={onChange} />);
    const inputs = screen.getAllByRole('spinbutton');
    await userEvent.type(inputs[1], '90');
    expect(onChange).toHaveBeenLastCalledWith({ gradeLt: '0' });
  });

  it('does not show clear button when no filters active', () => {
    render(<Filters filters={baseFilters} onChange={vi.fn()} />);
    expect(screen.queryByText(/clear filters/i)).not.toBeInTheDocument();
  });

  it('shows clear button when name filter is active', () => {
    const filters = { ...baseFilters, name: 'Alice' };
    render(<Filters filters={filters} onChange={vi.fn()} />);
    expect(screen.getByText(/clear filters/i)).toBeInTheDocument();
  });

  it('clicking clear filters resets all filter fields', async () => {
    const onChange = vi.fn();
    const filters = { ...baseFilters, name: 'Alice', subject: 'Math' };
    render(<Filters filters={filters} onChange={onChange} />);
    await userEvent.click(screen.getByText(/clear filters/i));
    expect(onChange).toHaveBeenCalledWith({ name: '', subject: '', gradeGt: '', gradeLt: '' });
  });
});
