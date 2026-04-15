package processing

import (
	"sync"
	"time"
)

// JobStatus represents the lifecycle state of an upload/processing job.
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusUploaded   JobStatus = "uploaded"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

// JobEvent is the payload sent over the SSE stream to the frontend.
type JobEvent struct {
	JobID             string    `json:"job_id"`
	FileName          string    `json:"file_name"`
	Status            JobStatus `json:"status"`
	TotalRows         int64     `json:"total_rows"`
	ProcessedRows     int64     `json:"processed_rows"`
	ProgressPct       float64   `json:"progress_pct"`
	UploadDurationMs  float64   `json:"upload_duration_ms"`
	ProcessDurationMs float64   `json:"process_duration_ms"`
	OverallDurationMs float64   `json:"overall_duration_ms"`
	Error             string    `json:"error,omitempty"`
}

// Job holds the mutable state of one upload + processing job.
// All fields are protected by mu; subscribers is a list of live SSE channels.
type Job struct {
	mu sync.Mutex

	ID             string
	FileName       string
	Status         JobStatus
	TotalRows      int64
	ProcessedRows  int64
	UploadStartAt  time.Time
	UploadEndAt    time.Time
	ProcessStartAt time.Time
	ProcessEndAt   time.Time
	Error          string

	subscribers []chan JobEvent
}

// snapshot builds a JobEvent from the current (already-locked) state.
// Caller must hold j.mu.
func (j *Job) snapshot() JobEvent {
	var uploadMs, processMs float64

	if !j.UploadEndAt.IsZero() && !j.UploadStartAt.IsZero() {
		uploadMs = float64(j.UploadEndAt.Sub(j.UploadStartAt).Milliseconds())
	}

	// While processing is still running, calculate elapsed so far.
	if !j.ProcessStartAt.IsZero() {
		end := j.ProcessEndAt
		if end.IsZero() {
			end = time.Now()
		}
		processMs = float64(end.Sub(j.ProcessStartAt).Milliseconds())
	}

	var pct float64
	if j.TotalRows > 0 {
		pct = float64(j.ProcessedRows) / float64(j.TotalRows) * 100
		if pct > 100 {
			pct = 100
		}
	}

	return JobEvent{
		JobID:             j.ID,
		FileName:          j.FileName,
		Status:            j.Status,
		TotalRows:         j.TotalRows,
		ProcessedRows:     j.ProcessedRows,
		ProgressPct:       pct,
		UploadDurationMs:  uploadMs,
		ProcessDurationMs: processMs,
		OverallDurationMs: uploadMs + processMs,
		Error:             j.Error,
	}
}
