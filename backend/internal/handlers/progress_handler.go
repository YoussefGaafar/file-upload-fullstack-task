package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/processing"
	"github.com/gin-gonic/gin"
)

// ProgressHandler streams Server-Sent Events for a specific job.
//
// Request:  GET /api/progress/:jobId
//           Accept: text/event-stream
//
// Each event is:  data: <JSON JobEvent>\n\n
// A comment "ping" is sent every 30 s to keep the connection alive through
// proxies and load balancers.
func ProgressHandler(jm *processing.JobManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		jobID := c.Param("jobId")

		// Verify the job exists before committing to SSE.
		if jm.GetJob(jobID) == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
			return
		}

		// SSE headers.
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Header("X-Accel-Buffering", "no") // disable nginx/Caddy response buffering

		flusher, ok := c.Writer.(http.Flusher)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming not supported"})
			return
		}

		ch, unsub := jm.Subscribe(jobID)
		defer unsub()

		ctx := c.Request.Context()
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {

			case event, ok := <-ch:
				if !ok {
					// Channel was closed — job is in a terminal state.
					return
				}

				data, _ := json.Marshal(event)
				fmt.Fprintf(c.Writer, "data: %s\n\n", data)
				flusher.Flush()

				if event.Status == processing.JobStatusCompleted ||
					event.Status == processing.JobStatusFailed {
					return
				}

			case <-ticker.C:
				// Keepalive comment — ignored by the EventSource parser.
				fmt.Fprintf(c.Writer, ": ping\n\n")
				flusher.Flush()

			case <-ctx.Done():
				// Client disconnected.
				return
			}
		}
	}
}
