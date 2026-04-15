package processing

import (
	"testing"
	"time"
)

// fixed timestamps make the duration math deterministic.
var (
	t0 = time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	t1 = t0.Add(200 * time.Millisecond) // upload end  / process start
	t2 = t0.Add(700 * time.Millisecond) // process end
)

func baseJob() *Job {
	return &Job{
		ID:       "test-id",
		FileName: "grades.csv",
		Status:   JobStatusPending,
	}
}

func TestSnapshot_NoTimesSet(t *testing.T) {
	j := baseJob()
	ev := j.snapshot()

	if ev.UploadDurationMs != 0 {
		t.Errorf("expected 0 upload duration, got %v", ev.UploadDurationMs)
	}
	if ev.ProcessDurationMs != 0 {
		t.Errorf("expected 0 process duration, got %v", ev.ProcessDurationMs)
	}
	if ev.ProgressPct != 0 {
		t.Errorf("expected 0 pct, got %v", ev.ProgressPct)
	}
}

func TestSnapshot_UploadDuration(t *testing.T) {
	j := baseJob()
	j.UploadStartAt = t0
	j.UploadEndAt = t1

	ev := j.snapshot()

	if ev.UploadDurationMs != 200 {
		t.Errorf("expected 200 ms upload duration, got %v", ev.UploadDurationMs)
	}
}

func TestSnapshot_ProcessDurationAndPercentage(t *testing.T) {
	j := baseJob()
	j.Status = JobStatusProcessing
	j.TotalRows = 1000
	j.ProcessedRows = 250
	j.UploadStartAt = t0
	j.UploadEndAt = t1
	j.ProcessStartAt = t1
	j.ProcessEndAt = t2

	ev := j.snapshot()

	if ev.ProcessDurationMs != 500 {
		t.Errorf("expected 500 ms process duration, got %v", ev.ProcessDurationMs)
	}
	if ev.ProgressPct != 25 {
		t.Errorf("expected 25%% progress, got %v", ev.ProgressPct)
	}
	if ev.OverallDurationMs != 700 {
		t.Errorf("expected 700 ms overall, got %v", ev.OverallDurationMs)
	}
}

func TestSnapshot_PercentageCapsAt100(t *testing.T) {
	j := baseJob()
	j.TotalRows = 100
	j.ProcessedRows = 150 // more than total (shouldn't happen, but must be safe)

	ev := j.snapshot()

	if ev.ProgressPct != 100 {
		t.Errorf("expected pct capped at 100, got %v", ev.ProgressPct)
	}
}

func TestSnapshot_ZeroTotalRowsNoPanic(t *testing.T) {
	j := baseJob()
	j.TotalRows = 0
	j.ProcessedRows = 0

	ev := j.snapshot()

	if ev.ProgressPct != 0 {
		t.Errorf("expected 0 pct when TotalRows is 0, got %v", ev.ProgressPct)
	}
}

func TestSnapshot_CompletedJob(t *testing.T) {
	j := baseJob()
	j.Status = JobStatusCompleted
	j.TotalRows = 500
	j.ProcessedRows = 500
	j.UploadStartAt = t0
	j.UploadEndAt = t1
	j.ProcessStartAt = t1
	j.ProcessEndAt = t2

	ev := j.snapshot()

	if ev.Status != JobStatusCompleted {
		t.Errorf("expected status completed, got %v", ev.Status)
	}
	if ev.ProgressPct != 100 {
		t.Errorf("expected 100%% on completed job, got %v", ev.ProgressPct)
	}
}

func TestSnapshot_FieldsMatchJob(t *testing.T) {
	j := baseJob()
	j.Error = "something went wrong"
	j.Status = JobStatusFailed

	ev := j.snapshot()

	if ev.JobID != j.ID {
		t.Errorf("JobID mismatch: %v != %v", ev.JobID, j.ID)
	}
	if ev.FileName != j.FileName {
		t.Errorf("FileName mismatch: %v != %v", ev.FileName, j.FileName)
	}
	if ev.Error != j.Error {
		t.Errorf("Error mismatch: %v != %v", ev.Error, j.Error)
	}
}
