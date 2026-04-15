import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

const defaultProps = {
  page: 1,
  totalPages: 5,
  pageSize: 20,
  total: 100,
  onPage: vi.fn(),
  onPageSize: vi.fn(),
};

describe('Pagination', () => {
  it('shows the current page and total pages', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText(/1 \/ 5/)).toBeInTheDocument();
  });

  it('shows the correct "Showing X–Y of Z students" text', () => {
    render(<Pagination {...defaultProps} page={2} pageSize={20} total={100} totalPages={5} onPage={vi.fn()} onPageSize={vi.fn()} />);
    expect(screen.getByText(/21/)).toBeInTheDocument();
    expect(screen.getByText(/40/)).toBeInTheDocument();
  });

  it('disables First and Previous buttons on page 1', () => {
    render(<Pagination {...defaultProps} page={1} />);
    expect(screen.getByTitle('First')).toBeDisabled();
    expect(screen.getByTitle('Previous')).toBeDisabled();
  });

  it('disables Next and Last buttons on the last page', () => {
    render(<Pagination {...defaultProps} page={5} totalPages={5} />);
    expect(screen.getByTitle('Next')).toBeDisabled();
    expect(screen.getByTitle('Last')).toBeDisabled();
  });

  it('enables all nav buttons on a middle page', () => {
    render(<Pagination {...defaultProps} page={3} totalPages={5} />);
    expect(screen.getByTitle('First')).not.toBeDisabled();
    expect(screen.getByTitle('Previous')).not.toBeDisabled();
    expect(screen.getByTitle('Next')).not.toBeDisabled();
    expect(screen.getByTitle('Last')).not.toBeDisabled();
  });

  it('calls onPage(1) when First button is clicked', async () => {
    const onPage = vi.fn();
    render(<Pagination {...defaultProps} page={3} onPage={onPage} />);
    await userEvent.click(screen.getByTitle('First'));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it('calls onPage(page-1) when Previous is clicked', async () => {
    const onPage = vi.fn();
    render(<Pagination {...defaultProps} page={3} onPage={onPage} />);
    await userEvent.click(screen.getByTitle('Previous'));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('calls onPage(page+1) when Next is clicked', async () => {
    const onPage = vi.fn();
    render(<Pagination {...defaultProps} page={3} onPage={onPage} />);
    await userEvent.click(screen.getByTitle('Next'));
    expect(onPage).toHaveBeenCalledWith(4);
  });

  it('calls onPage(totalPages) when Last is clicked', async () => {
    const onPage = vi.fn();
    render(<Pagination {...defaultProps} page={3} totalPages={5} onPage={onPage} />);
    await userEvent.click(screen.getByTitle('Last'));
    expect(onPage).toHaveBeenCalledWith(5);
  });

  it('calls onPageSize with selected value when rows dropdown changes', async () => {
    const onPageSize = vi.fn();
    render(<Pagination {...defaultProps} onPageSize={onPageSize} />);
    await userEvent.selectOptions(screen.getByRole('combobox'), '50');
    expect(onPageSize).toHaveBeenCalledWith(50);
  });

  it('renders all available page size options', () => {
    render(<Pagination {...defaultProps} />);
    for (const n of [10, 20, 50, 100]) {
      expect(screen.getByRole('option', { name: String(n) })).toBeInTheDocument();
    }
  });
});
