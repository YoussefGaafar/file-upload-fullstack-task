package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/config"
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/processing"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UploadHandler accepts a single CSV file, saves it to the temp directory,
// registers a job, and immediately kicks off parallel processing in a goroutine.
//
// Request:  POST /api/upload  (multipart/form-data, field: "file")
// Response: { job_id, file_name, status }
func UploadHandler(cfg *config.Config, pool *pgxpool.Pool, jm *processing.JobManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		uploadStartAt := time.Now()

		fileHeader, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "field 'file' is required"})
			return
		}

		if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".csv") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "only .csv files are accepted"})
			return
		}

		src, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot open uploaded file"})
			return
		}
		defer src.Close()

		jobID := uuid.New().String()
		tempPath := filepath.Join(cfg.UploadDir, fmt.Sprintf("%s_%s", jobID, fileHeader.Filename))

		dst, err := os.Create(tempPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "cannot create temp file"})
			return
		}

		if _, err := io.Copy(dst, src); err != nil {
			dst.Close()
			os.Remove(tempPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save uploaded file"})
			return
		}
		dst.Close()

		uploadEndAt := time.Now()

		// Register job and record upload timing.
		jm.CreateJob(jobID, fileHeader.Filename, uploadStartAt)
		jm.MarkUploaded(jobID, uploadEndAt)

		// Use a background context so processing is not cancelled when the HTTP
		// response is flushed and the request context is torn down.
		go processing.ProcessFile(context.Background(), jobID, tempPath, pool, jm)

		c.JSON(http.StatusAccepted, gin.H{
			"job_id":    jobID,
			"file_name": fileHeader.Filename,
			"status":    processing.JobStatusUploaded,
		})
	}
}
