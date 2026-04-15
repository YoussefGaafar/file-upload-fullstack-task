package processing

import (
	"sync"
	"testing"
	"time"
)

// newTestManager returns a fresh, isolated JobManager (not the singleton).
func newTestManager() *JobManager {
	return &JobManager{jobs: make(map[string]*Job)}
}

func TestCreateJob_FieldsAreSet(t *testing.T) {
	jm := newTestManager()
	start := time.Now()
	job := jm.CreateJob("id-1", "file.csv", start)

	if job.ID != "id-1" {
		t.Errorf("expected ID 'id-1', got %q", job.ID)
	}
	if job.FileName != "file.csv" {
		t.Errorf("expected FileName 'file.csv', got %q", job.FileName)
	}
	if job.Status != JobStatusPending {
		t.Errorf("expected status pending, got %v", job.Status)
	}
	if !job.UploadStartAt.Equal(start) {
		t.Errorf("UploadStartAt mismatch")
	}
}

func TestGetJob_ReturnsJobAfterCreate(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-2", "x.csv", time.Now())

	j := jm.GetJob("id-2")
	if j == nil {
		t.Fatal("expected non-nil job")
	}
	if j.FileName != "x.csv" {
		t.Errorf("expected FileName 'x.csv', got %q", j.FileName)
	}
}

func TestGetJob_UnknownIDReturnsNil(t *testing.T) {
	jm := newTestManager()
	if jm.GetJob("does-not-exist") != nil {
		t.Error("expected nil for unknown job ID")
	}
}

func TestMarkUploaded_TransitionsStatus(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-3", "a.csv", time.Now())

	end := time.Now()
	jm.MarkUploaded("id-3", end)

	j := jm.GetJob("id-3")
	if j.Status != JobStatusUploaded {
		t.Errorf("expected uploaded, got %v", j.Status)
	}
	if !j.UploadEndAt.Equal(end) {
		t.Error("UploadEndAt not set correctly")
	}
}

func TestStartProcessing_SetsProcessingState(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-4", "b.csv", time.Now())

	jm.StartProcessing("id-4", 1_000_000)

	j := jm.GetJob("id-4")
	if j.Status != JobStatusProcessing {
		t.Errorf("expected processing, got %v", j.Status)
	}
	if j.TotalRows != 1_000_000 {
		t.Errorf("expected 1000000 rows, got %d", j.TotalRows)
	}
	if j.ProcessStartAt.IsZero() {
		t.Error("ProcessStartAt should be set")
	}
}

func TestUpdateProgress_UpdatesProcessedRows(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-5", "c.csv", time.Now())
	jm.StartProcessing("id-5", 1000)

	jm.UpdateProgress("id-5", 500)

	j := jm.GetJob("id-5")
	if j.ProcessedRows != 500 {
		t.Errorf("expected 500, got %d", j.ProcessedRows)
	}
}

func TestCompleteJob_SetsCompletedState(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-6", "d.csv", time.Now())
	jm.StartProcessing("id-6", 200)
	jm.UpdateProgress("id-6", 100)

	jm.CompleteJob("id-6")

	j := jm.GetJob("id-6")
	if j.Status != JobStatusCompleted {
		t.Errorf("expected completed, got %v", j.Status)
	}
	// ProcessedRows should equal TotalRows.
	if j.ProcessedRows != j.TotalRows {
		t.Errorf("ProcessedRows (%d) != TotalRows (%d)", j.ProcessedRows, j.TotalRows)
	}
	if j.ProcessEndAt.IsZero() {
		t.Error("ProcessEndAt should be set on completion")
	}
}

func TestFailJob_SetsFailedState(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-7", "e.csv", time.Now())
	jm.StartProcessing("id-7", 100)

	jm.FailJob("id-7", "disk full")

	j := jm.GetJob("id-7")
	if j.Status != JobStatusFailed {
		t.Errorf("expected failed, got %v", j.Status)
	}
	if j.Error != "disk full" {
		t.Errorf("expected error 'disk full', got %q", j.Error)
	}
}

func TestSubscribe_UnknownJob_ClosedChannel(t *testing.T) {
	jm := newTestManager()
	ch, _ := jm.Subscribe("no-such-job")

	// Channel should be closed immediately.
	select {
	case _, ok := <-ch:
		if ok {
			t.Error("expected closed channel for unknown job")
		}
	default:
		t.Error("expected closed channel to be readable")
	}
}

func TestSubscribe_ReceivesInitialSnapshot(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-8", "f.csv", time.Now())
	jm.StartProcessing("id-8", 500)

	ch, _ := jm.Subscribe("id-8")

	select {
	case ev := <-ch:
		if ev.Status != JobStatusProcessing {
			t.Errorf("expected processing status in initial snapshot, got %v", ev.Status)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for initial snapshot")
	}
}

func TestSubscribe_TerminalJob_ImmediateEvent(t *testing.T) {
	jm := newTestManager()
	jm.CreateJob("id-9", "g.csv", time.Now())
	jm.StartProcessing("id-9", 100)
	jm.CompleteJob("id-9")

	ch, _ := jm.Subscribe("id-9")

	select {
	case ev := <-ch:
		if ev.Status != JobStatusCompleted {
			t.Errorf("expected completed, got %v", ev.Status)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for terminal event")
	}
}

func TestJobManager_ConcurrentAccess(t *testing.T) {
	// Create many goroutines hammering the same job manager to catch data races.
	// Run with: go test -race ./...
	jm := newTestManager()

	const jobCount = 50
	var wg sync.WaitGroup

	for i := range jobCount {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			id := "concurrent-" + string(rune('a'+n%26))
			jm.CreateJob(id, "x.csv", time.Now())
			jm.StartProcessing(id, 1000)
			jm.UpdateProgress(id, 500)
			jm.CompleteJob(id)
		}(i)
	}

	wg.Wait()
}
