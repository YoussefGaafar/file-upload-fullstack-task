# Backend — Golang REST API

The backend is a Go HTTP server that accepts large CSV uploads, processes them concurrently into PostgreSQL, and streams real-time progress back to the client over Server-Sent Events.

---

## Tech Stack

| Concern | Choice |
|---|---|
| HTTP framework | [Gin](https://github.com/gin-gonic/gin) |
| Database driver | [pgx/v5](https://github.com/jackc/pgx) |
| UUID generation | [google/uuid](https://github.com/google/uuid) |
| Env loading | [godotenv](https://github.com/joho/godotenv) |
| Database | PostgreSQL 16 (via Docker) |

---

## Prerequisites

- [Go 1.22+](https://go.dev/dl/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)

---

## Setup & Run

### 1. Start PostgreSQL

From the **repository root** (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port `5432` with:

| Setting | Value |
|---|---|
| User | `postgres` |
| Password | `postgres` |
| Database | `file_upload_db` |

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults work out of the box with the Docker Compose setup. Edit `.env` if you need custom values:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/file_upload_db
PORT=8080
UPLOAD_DIR=/tmp/uploads
```

### 3. Install dependencies

```bash
go mod tidy
```

### 4. Run the server

```bash
go run ./cmd/server
```

The server will:
1. Connect to PostgreSQL and run migrations automatically.
2. Create the `UPLOAD_DIR` if it doesn't exist.
3. Start listening on `http://localhost:8080`.

---

## API Endpoints

### `POST /api/upload`

Upload a single CSV file. Returns a `job_id` immediately — processing happens in the background.

**Request:** `multipart/form-data`, field name `file`

```bash
curl -X POST http://localhost:8080/api/upload \
  -F "file=@student_grades_001.csv"
```

**Response:**
```json
{
  "job_id": "19a96a43-dc6a-4f78-944c-ec0a8a3f2f7e",
  "file_name": "student_grades_001.csv",
  "status": "uploaded"
}
```

---

### `GET /api/progress/:jobId`

Server-Sent Events stream for a specific job. Connect with `EventSource` or `curl`:

```bash
curl -N http://localhost:8080/api/progress/19a96a43-dc6a-4f78-944c-ec0a8a3f2f7e
```

Each event is a JSON payload:

```json
{
  "job_id": "19a96a43...",
  "file_name": "student_grades_001.csv",
  "status": "processing",
  "total_rows": 1000000,
  "processed_rows": 450000,
  "progress_pct": 45.0,
  "upload_duration_ms": 1230,
  "process_duration_ms": 8400,
  "overall_duration_ms": 9630
}
```

`status` transitions: `pending → uploaded → processing → completed | failed`

---

### `GET /api/students`

Paginated, sorted, and filtered list of all stored student records.

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `page_size` | int | `20` | Rows per page (max 100) |
| `sort_by` | string | `student_name` | `student_name` or `grade` |
| `sort_order` | string | `asc` | `asc` or `desc` |
| `name` | string | — | Partial name match (case-insensitive) |
| `subject` | string | — | Exact subject match |
| `grade_gt` | int | — | Grade strictly greater than |
| `grade_lt` | int | — | Grade strictly less than |

```bash
curl "http://localhost:8080/api/students?sort_by=grade&sort_order=desc&subject=Physics&page=1&page_size=10"
```

---

## Project Structure

```
backend/
├── cmd/server/main.go              # Entry point — wires everything together
└── internal/
    ├── config/config.go            # Environment variable loading
    ├── database/db.go              # pgxpool setup + SQL migrations
    ├── models/student.go           # Student struct, ListParams, ListResponse
    ├── processing/
    │   ├── job.go                  # Job struct, JobStatus, JobEvent
    │   ├── job_manager.go          # Singleton pub/sub — fan-out to SSE clients
    │   └── csv_processor.go        # Goroutine: row count → batch CopyFrom → SSE
    ├── repository/
    │   └── student_repository.go   # Parameterised queries (sort whitelist)
    ├── handlers/
    │   ├── upload_handler.go       # POST /api/upload
    │   ├── progress_handler.go     # GET  /api/progress/:jobId (SSE)
    │   └── students_handler.go     # GET  /api/students
    └── router/router.go            # Gin engine + CORS + routes
```

---

## Research Decision Record

**Gin over net/http (stdlib router)**
I chose Gin over a raw `net/http` router because it provides a clean middleware chain, grouped routes, automatic JSON binding, and a recovery middleware — all with near-zero overhead. For a task this size the ergonomics outweigh the marginal performance difference.

**pgx/v5 over database/sql + lib/pq**
I chose `pgx/v5` over the standard `database/sql` + `lib/pq` combination because pgx exposes the PostgreSQL `COPY` protocol directly via `CopyFrom`. For 1-million-row files this is 5–10× faster than individual or even batch `INSERT` statements since the data bypasses SQL parsing entirely.

**SSE over WebSockets for progress streaming**
I chose Server-Sent Events over WebSockets because progress updates are strictly one-directional (server → client). SSE is simpler to implement, works through HTTP/1.1 proxies without any upgrade handshake, and requires no client library — `EventSource` is built into every browser.

**One goroutine per file over a worker pool**
I chose launching one goroutine per uploaded file over a fixed worker pool because the expected concurrency is low (a handful of files at a time) and the bottleneck is I/O-bound PostgreSQL writes, not CPU. Go's scheduler handles this cleanly without the added complexity of pool management.

**Byte-scan row count over a full CSV parse**
I chose counting newline bytes directly over parsing the CSV to count rows because it is O(file size) with a 64 KB read buffer and completes in milliseconds even on a 65 MB file, avoiding a second full CSV parse pass.

---

## Testing

### Running the tests

```bash
# Run all unit tests
go test ./internal/...

# Run with the race detector (recommended — catches concurrent access bugs)
go test -race ./internal/...

# Verbose output — see every test name and result
go test -race -v ./internal/...
```

> **No external dependencies required.** All tests are pure unit tests that run without a database, Docker, or any network access.

---

### Test files

#### `internal/processing/job_test.go` — Job snapshot math

Tests the `snapshot()` method on the `Job` struct, which is responsible for computing the durations and progress percentage that get sent to SSE subscribers.

| Test | Goal |
|---|---|
| `TestSnapshot_NoTimesSet` | When no timestamps are set, all durations and percentage must be `0` — guards against zero-value panics or garbage math. |
| `TestSnapshot_UploadDuration` | With `UploadStartAt` and `UploadEndAt` set 200 ms apart, `UploadDurationMs` must equal exactly `200`. |
| `TestSnapshot_ProcessDurationAndPercentage` | With 250 of 1000 rows processed and process times 500 ms apart, verifies `ProgressPct == 25` and `ProcessDurationMs == 500` and `OverallDurationMs == 700`. |
| `TestSnapshot_PercentageCapsAt100` | When `ProcessedRows > TotalRows` (edge case from a race), the percentage must be capped at `100` and must not exceed it. |
| `TestSnapshot_ZeroTotalRowsNoPanic` | When `TotalRows == 0`, percentage calculation must return `0` without a division-by-zero panic. |
| `TestSnapshot_CompletedJob` | A completed job with equal processed and total rows must report `status=completed` and `ProgressPct=100`. |
| `TestSnapshot_FieldsMatchJob` | `JobID`, `FileName`, and `Error` fields in the event must mirror the source `Job` struct exactly. |

---

#### `internal/processing/job_manager_test.go` — Job lifecycle & pub/sub

Tests the `JobManager` — the in-memory singleton that tracks every job and fans progress events out to SSE subscribers.

| Test | Goal |
|---|---|
| `TestCreateJob_FieldsAreSet` | After `CreateJob`, the returned job must have the correct `ID`, `FileName`, `Status=pending`, and `UploadStartAt`. |
| `TestGetJob_ReturnsJobAfterCreate` | `GetJob` must return the same job that was just created. |
| `TestGetJob_UnknownIDReturnsNil` | `GetJob` for a non-existent ID must return `nil` without panicking. |
| `TestMarkUploaded_TransitionsStatus` | After `MarkUploaded`, `Status` must be `uploaded` and `UploadEndAt` must match the provided timestamp. |
| `TestStartProcessing_SetsProcessingState` | After `StartProcessing`, `Status` must be `processing`, `TotalRows` must be set, and `ProcessStartAt` must be non-zero. |
| `TestUpdateProgress_UpdatesProcessedRows` | After `UpdateProgress(500)`, `ProcessedRows` on the job must equal `500`. |
| `TestCompleteJob_SetsCompletedState` | After `CompleteJob`, `Status` must be `completed`, `ProcessedRows` must equal `TotalRows`, and `ProcessEndAt` must be set. |
| `TestFailJob_SetsFailedState` | After `FailJob("disk full")`, `Status` must be `failed` and `Error` must contain the provided message. |
| `TestSubscribe_UnknownJob_ClosedChannel` | Subscribing to a non-existent job must return a channel that is already closed, so callers can range over it safely. |
| `TestSubscribe_ReceivesInitialSnapshot` | Subscribing to an active job must immediately deliver the current state snapshot on the channel without waiting for the next update. |
| `TestSubscribe_TerminalJob_ImmediateEvent` | Subscribing to an already-completed job must push the final event and not block — the SSE handler must be able to detect and close the stream. |
| `TestJobManager_ConcurrentAccess` | 50 goroutines each create, process, and complete different jobs simultaneously. Run with `-race` to confirm no data races exist on the shared `jobs` map. |

---

#### `internal/processing/csv_processor_test.go` — Row counting

Tests the `countDataRows` helper, which fast-scans a file for newlines to determine how many data rows it contains — used to seed the progress percentage denominator before any CSV parsing begins.

| Test | Goal |
|---|---|
| `TestCountDataRows_EmptyFile` | An empty file must return `0` rows and no error. |
| `TestCountDataRows_HeaderOnly` | A file with only the header line must return `0` data rows (header is subtracted). |
| `TestCountDataRows_ThreeDataRows_WithTrailingNewline` | A standard 4-line CSV (1 header + 3 data + trailing `\n`) must return exactly `3`. |
| `TestCountDataRows_ThreeDataRows_NoTrailingNewline` | A file whose last line is not terminated by `\n` must still count that line — i.e. also return `3`. |
| `TestCountDataRows_SingleDataRow` | A file with one data row must return `1`, verifying the header-subtraction logic handles the minimum case. |
| `TestCountDataRows_NonExistentFile` | Passing a path that does not exist must return an error, not a zero count. |

---

#### `internal/handlers/students_handler_test.go` — Students HTTP handler

Tests the `GET /api/students` handler and its two private helpers. The handler is wired to a `StudentLister` interface so all tests run without a real database.

| Test | Goal |
|---|---|
| `TestQueryInt_DefaultWhenEmpty` | When the query param is absent, `queryInt` must return the provided default value. |
| `TestQueryInt_ValidValue` | A valid numeric string (e.g. `"3"`) must be parsed and returned as an integer. |
| `TestQueryInt_InvalidFallsBack` | A non-numeric value (e.g. `"abc"`) must fall back to the default rather than erroring. |
| `TestQueryInt_ZeroFallsBack` | A value of `"0"` must fall back to the default because page numbers below `1` are invalid. |
| `TestClamp_BelowMin` | A value below the minimum must be raised to the minimum. |
| `TestClamp_AboveMax` | A value above the maximum must be lowered to the maximum. |
| `TestClamp_InRange` | A value already within bounds must pass through unchanged. |
| `TestListStudentsHandler_Returns200WithData` | A successful repository response must produce HTTP `200` with correct JSON — verifies serialization of `StudentName` and array structure. |
| `TestListStudentsHandler_RepoError_Returns500` | When the repository returns an error, the handler must respond with HTTP `500` and not panic. |
| `TestListStudentsHandler_EmptyResult` | An empty `data` array from the repository must produce a valid `200` response with an empty slice, not `null`. |
| `TestListStudentsHandler_PageSizeClamped` | Passing `page_size=999` must result in `PageSize ≤ 100` reaching the repository — the clamp is applied before the query. |
| `TestListStudentsHandler_DefaultSortIsStudentNameAsc` | With no sort params in the request, the repository must receive `sort_by=student_name` and `sort_order=asc`. |

---

#### `internal/handlers/upload_handler_test.go` — Upload handler validation

Tests the validation path of `POST /api/upload`. These are pure unit tests — no temp files are written and no goroutines are started because all assertions target the `400` error responses that fire before any I/O.

| Test | Goal |
|---|---|
| `TestUploadHandler_MissingFileField_Returns400` | A request with no multipart body must return `400` with an appropriate error message. |
| `TestUploadHandler_NonCSVFile_Returns400` | Uploading a `.txt` file must be rejected with `400` — only `.csv` extensions are accepted. |
| `TestUploadHandler_WrongFieldName_Returns400` | Using a field name other than `"file"` (e.g. `"data"`) must return `400`, enforcing the API contract. |
