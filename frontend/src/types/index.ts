// ─── Upload / Job types ───────────────────────────────────────────────────────

export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'completed'
  | 'failed';

/** State tracked in the frontend for each queued file. */
export interface FileUploadState {
  /** Stable local key (before the server returns a job_id). */
  localId: string;
  /** Undefined for jobs restored from localStorage (File objects cannot be persisted). */
  file?: File;
  /** Always present — copied from file.name on creation, persisted in localStorage. */
  fileName: string;
  /** Always present — copied from file.size on creation, persisted in localStorage. */
  fileSize: number;
  jobId?: string;
  status: UploadStatus;

  /** 0–100, driven by XHR onUploadProgress */
  uploadProgress: number;
  /** 0–100, driven by SSE events from the backend */
  processProgress: number;

  uploadStartTime?: number; // performance.now()
  uploadEndTime?: number;
  uploadDurationMs?: number; // finalised once upload completes

  processDurationMs?: number; // from last SSE event
  overallDurationMs?: number;

  totalRows?: number;
  processedRows?: number;
  error?: string;
}

/** Shape of the SSE payload coming from GET /api/progress/:jobId */
export interface JobEvent {
  job_id: string;
  file_name: string;
  status: UploadStatus;
  total_rows: number;
  processed_rows: number;
  progress_pct: number;
  upload_duration_ms: number;
  process_duration_ms: number;
  overall_duration_ms: number;
  error?: string;
}

// ─── Students types ───────────────────────────────────────────────────────────

export interface Student {
  id: number;
  student_id: string;
  student_name: string;
  subject: string;
  grade: number;
  created_at: string;
}

export interface StudentsResponse {
  data: Student[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StudentFilters {
  name: string;
  subject: string;
  gradeGt: string;
  gradeLt: string;
  sortBy: 'student_name' | 'grade';
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export const SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'English Literature',
  'Computer Science',
  'Art',
  'Music',
  'Geography',
] as const;
