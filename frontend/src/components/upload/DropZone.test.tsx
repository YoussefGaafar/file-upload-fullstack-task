import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropZone from './DropZone';

function makeFile(name: string, type = 'text/csv'): File {
  return new File(['col1,col2\n1,2'], name, { type });
}

describe('DropZone', () => {
  it('renders the drag & drop prompt text', () => {
    render(<DropZone onFiles={vi.fn()} />);
    expect(screen.getByText(/drag & drop csv files/i)).toBeInTheDocument();
  });

  it('renders the hidden file input with csv accept and multiple', () => {
    const { container } = render(<DropZone onFiles={vi.fn()} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.accept).toBe('.csv');
    expect(input.multiple).toBe(true);
  });

  it('calls onFiles with CSV files selected via input', async () => {
    const onFiles = vi.fn();
    const { container } = render(<DropZone onFiles={onFiles} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const csvFile = makeFile('grades.csv');
    await userEvent.upload(input, csvFile);

    expect(onFiles).toHaveBeenCalledOnce();
    expect(onFiles.mock.calls[0][0][0].name).toBe('grades.csv');
  });

  it('filters out non-CSV files on input change', async () => {
    const onFiles = vi.fn();
    const { container } = render(<DropZone onFiles={onFiles} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const txtFile = makeFile('report.txt', 'text/plain');
    await userEvent.upload(input, txtFile);

    // onFiles should not be called since no CSV files passed
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('calls onFiles with CSV files when dropped', () => {
    const onFiles = vi.fn();
    const { container } = render(<DropZone onFiles={onFiles} />);
    const zone = container.firstChild as HTMLElement;

    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('students.csv')] },
    });

    expect(onFiles).toHaveBeenCalledOnce();
  });

  it('filters non-CSV files on drop', () => {
    const onFiles = vi.fn();
    const { container } = render(<DropZone onFiles={onFiles} />);
    const zone = container.firstChild as HTMLElement;

    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('image.png', 'image/png')] },
    });

    expect(onFiles).not.toHaveBeenCalled();
  });

  it('applies dragging styles on dragover', () => {
    const { container } = render(<DropZone onFiles={vi.fn()} />);
    const zone = container.firstChild as HTMLElement;

    fireEvent.dragOver(zone);
    expect(zone.className).toMatch(/indigo/);
  });

  it('removes dragging styles on dragleave', () => {
    const { container } = render(<DropZone onFiles={vi.fn()} />);
    const zone = container.firstChild as HTMLElement;

    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toMatch(/border-indigo-400 bg-indigo-50/);
  });

  it('does not change drag style when disabled', () => {
    const { container } = render(<DropZone onFiles={vi.fn()} disabled />);
    const zone = container.firstChild as HTMLElement;

    fireEvent.dragOver(zone);
    expect(zone.className).not.toMatch(/border-indigo-400 bg-indigo-50/);
  });

  it('does not call onFiles when disabled and files are dropped', () => {
    const onFiles = vi.fn();
    const { container } = render(<DropZone onFiles={onFiles} disabled />);
    const zone = container.firstChild as HTMLElement;

    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('grades.csv')] },
    });

    expect(onFiles).not.toHaveBeenCalled();
  });
});
