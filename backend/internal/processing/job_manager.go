package processing

import (
	"sync"
	"time"
)

// JobManager is a process-wide singleton that tracks every upload/processing job
// and fans out SSE events to all subscribers of a given job.
type JobManager struct {
	mu   sync.RWMutex
	jobs map[string]*Job
}

var (
	managerInstance *JobManager
	managerOnce    sync.Once
)

// GetJobManager returns the process-wide singleton.
func GetJobManager() *JobManager {
	managerOnce.Do(func() {
		managerInstance = &JobManager{jobs: make(map[string]*Job)}
	})
	return managerInstance
}

// CreateJob registers a new job and returns it. Called by the upload handler.
func (jm *JobManager) CreateJob(jobID, fileName string, uploadStartAt time.Time) *Job {
	job := &Job{
		ID:            jobID,
		FileName:      fileName,
		Status:        JobStatusPending,
		UploadStartAt: uploadStartAt,
		subscribers:   make([]chan JobEvent, 0),
	}

	jm.mu.Lock()
	jm.jobs[jobID] = job
	jm.mu.Unlock()

	return job
}

// GetJob returns the job with the given ID, or nil if not found.
func (jm *JobManager) GetJob(jobID string) *Job {
	jm.mu.RLock()
	defer jm.mu.RUnlock()
	return jm.jobs[jobID]
}

// MarkUploaded records the upload completion time and transitions status to uploaded.
func (jm *JobManager) MarkUploaded(jobID string, uploadEndAt time.Time) {
	job := jm.getJob(jobID)
	if job == nil {
		return
	}

	job.mu.Lock()
	job.UploadEndAt = uploadEndAt
	job.Status = JobStatusUploaded
	job.mu.Unlock()
}

// StartProcessing transitions the job to processing state and records total rows.
func (jm *JobManager) StartProcessing(jobID string, totalRows int64) {
	job := jm.getJob(jobID)
	if job == nil {
		return
	}

	job.mu.Lock()
	job.Status = JobStatusProcessing
	job.TotalRows = totalRows
	job.ProcessStartAt = time.Now()
	event := job.snapshot()
	job.mu.Unlock()

	jm.broadcast(job, event)
}

// UpdateProgress updates the processed row count and broadcasts to subscribers.
func (jm *JobManager) UpdateProgress(jobID string, processedRows int64) {
	job := jm.getJob(jobID)
	if job == nil {
		return
	}

	job.mu.Lock()
	job.ProcessedRows = processedRows
	event := job.snapshot()
	job.mu.Unlock()

	jm.broadcast(job, event)
}

// CompleteJob marks the job as done and broadcasts the final event.
func (jm *JobManager) CompleteJob(jobID string) {
	job := jm.getJob(jobID)
	if job == nil {
		return
	}

	job.mu.Lock()
	job.Status = JobStatusCompleted
	job.ProcessEndAt = time.Now()
	job.ProcessedRows = job.TotalRows
	event := job.snapshot()
	job.mu.Unlock()

	jm.broadcast(job, event)
}

// FailJob marks the job as failed, records the error, and broadcasts.
func (jm *JobManager) FailJob(jobID string, errMsg string) {
	job := jm.getJob(jobID)
	if job == nil {
		return
	}

	job.mu.Lock()
	job.Status = JobStatusFailed
	job.ProcessEndAt = time.Now()
	job.Error = errMsg
	event := job.snapshot()
	job.mu.Unlock()

	jm.broadcast(job, event)
}

// Subscribe returns a channel that will receive JobEvents for the given job
// and a cancel function that removes this subscription.
//
// If the job is already in a terminal state the current snapshot is pushed
// immediately and the returned channel is never written to again.
// If the job does not exist, a closed (empty) channel is returned.
func (jm *JobManager) Subscribe(jobID string) (<-chan JobEvent, func()) {
	job := jm.getJob(jobID)

	ch := make(chan JobEvent, 128)

	if job == nil {
		close(ch)
		return ch, func() {}
	}

	job.mu.Lock()

	// Terminal state: push snapshot and skip subscription.
	if job.Status == JobStatusCompleted || job.Status == JobStatusFailed {
		event := job.snapshot()
		job.mu.Unlock()
		ch <- event
		return ch, func() {}
	}

	// Push the current state so the client has an immediate baseline.
	event := job.snapshot()
	job.subscribers = append(job.subscribers, ch)
	job.mu.Unlock()

	// Non-blocking send of the initial snapshot (buffer is large).
	select {
	case ch <- event:
	default:
	}

	unsub := func() {
		job.mu.Lock()
		defer job.mu.Unlock()
		for i, sub := range job.subscribers {
			if sub == ch {
				job.subscribers = append(job.subscribers[:i], job.subscribers[i+1:]...)
				return
			}
		}
	}

	return ch, unsub
}

// ----- helpers -----

func (jm *JobManager) getJob(jobID string) *Job {
	jm.mu.RLock()
	defer jm.mu.RUnlock()
	return jm.jobs[jobID]
}

// broadcast sends event to every live subscriber of job.
// Non-blocking: slow subscribers are skipped (their channel buffer will catch up).
func (jm *JobManager) broadcast(job *Job, event JobEvent) {
	job.mu.Lock()
	subs := make([]chan JobEvent, len(job.subscribers))
	copy(subs, job.subscribers)
	job.mu.Unlock()

	for _, ch := range subs {
		select {
		case ch <- event:
		default:
		}
	}
}
