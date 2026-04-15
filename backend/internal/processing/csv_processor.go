package processing

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	insertBatchSize    = 1000  // rows per pgx CopyFrom call
	progressReportStep = 1.0   // send an SSE event every 1 % of progress
)

// ProcessFile streams the CSV at filePath into PostgreSQL, sending progress
// events via the JobManager.  The temp file is deleted when done.
func ProcessFile(ctx context.Context, jobID, filePath string, pool *pgxpool.Pool, jm *JobManager) {
	defer os.Remove(filePath) // always clean up the temp file

	// --- 1. Count data rows (fast byte scan, no CSV parsing) ---
	totalRows, err := countDataRows(filePath)
	if err != nil {
		jm.FailJob(jobID, fmt.Sprintf("row count failed: %v", err))
		return
	}

	jm.StartProcessing(jobID, totalRows)

	// --- 2. Open and parse the CSV ---
	f, err := os.Open(filePath)
	if err != nil {
		jm.FailJob(jobID, fmt.Sprintf("open file: %v", err))
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.FieldsPerRecord = 4
	reader.TrimLeadingSpace = true

	// Skip header row.
	if _, err := reader.Read(); err != nil {
		jm.FailJob(jobID, "failed to read CSV header")
		return
	}

	// --- 3. Stream rows into the database in batches ---
	batch := make([][]any, 0, insertBatchSize)
	var processed int64
	lastReportedPct := float64(-1) // forces the first update to be sent

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			jm.FailJob(jobID, fmt.Sprintf("CSV parse error: %v", err))
			return
		}

		grade, convErr := strconv.Atoi(strings.TrimSpace(record[3]))
		if convErr != nil {
			continue // skip rows with non-numeric grades
		}

		batch = append(batch, []any{
			strings.TrimSpace(record[0]), // student_id
			strings.TrimSpace(record[1]), // student_name
			strings.TrimSpace(record[2]), // subject
			grade,                        // grade
		})

		if len(batch) >= insertBatchSize {
			if err := bulkInsert(ctx, pool, batch); err != nil {
				jm.FailJob(jobID, fmt.Sprintf("bulk insert: %v", err))
				return
			}
			processed += int64(len(batch))
			batch = batch[:0]

			// Throttle SSE updates to ~1 % increments.
			if totalRows > 0 {
				pct := float64(processed) / float64(totalRows) * 100
				if pct-lastReportedPct >= progressReportStep {
					jm.UpdateProgress(jobID, processed)
					lastReportedPct = pct
				}
			}
		}

		// Respect context cancellation (e.g. client disconnected).
		select {
		case <-ctx.Done():
			jm.FailJob(jobID, "processing cancelled")
			return
		default:
		}
	}

	// Flush the final partial batch.
	if len(batch) > 0 {
		if err := bulkInsert(ctx, pool, batch); err != nil {
			jm.FailJob(jobID, fmt.Sprintf("bulk insert (final): %v", err))
			return
		}
		processed += int64(len(batch))
	}

	jm.CompleteJob(jobID)
}

// bulkInsert uses PostgreSQL's COPY protocol via pgx — much faster than
// individual INSERTs for large datasets.
func bulkInsert(ctx context.Context, pool *pgxpool.Pool, rows [][]any) error {
	_, err := pool.CopyFrom(
		ctx,
		pgx.Identifier{"student_grades"},
		[]string{"student_id", "student_name", "subject", "grade"},
		pgx.CopyFromRows(rows),
	)
	return err
}

// countDataRows counts newline characters to determine the number of data rows
// (total lines minus the header).  This is O(file size) but very fast because
// it operates on raw bytes without any CSV parsing.
func countDataRows(filePath string) (int64, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	buf := make([]byte, 64*1024)
	var count int64
	var lastByte byte = '\n' // treat start-of-file as a newline

	for {
		n, err := f.Read(buf)
		if n > 0 {
			count += int64(bytes.Count(buf[:n], []byte{'\n'}))
			lastByte = buf[n-1]
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, err
		}
	}

	// If the file doesn't end with a newline, the last line wasn't counted.
	if lastByte != '\n' {
		count++
	}

	// Subtract 1 for the header row.
	if count > 0 {
		count--
	}

	return count, nil
}
