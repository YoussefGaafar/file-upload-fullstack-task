package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/config"
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/processing"
	"github.com/gin-gonic/gin"
)

func uploadRouter() *gin.Engine {
	cfg := &config.Config{UploadDir: "/tmp"}
	jm := processing.GetJobManager()
	r := gin.New()
	r.POST("/api/upload", UploadHandler(cfg, nil, jm))
	return r
}

// buildMultipart creates a multipart/form-data request body with a file field.
func buildMultipart(t *testing.T, fieldName, filename, content string) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile(fieldName, filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	fw.Write([]byte(content)) //nolint:errcheck
	w.Close()
	return &buf, w.FormDataContentType()
}

func TestUploadHandler_MissingFileField_Returns400(t *testing.T) {
	r := uploadRouter()

	// POST with no "file" field at all.
	req, _ := http.NewRequest(http.MethodPost, "/api/upload", nil)
	req.Header.Set("Content-Type", "multipart/form-data; boundary=xyz")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for missing file, got %d", w.Code)
	}
}

func TestUploadHandler_NonCSVFile_Returns400(t *testing.T) {
	r := uploadRouter()
	body, ct := buildMultipart(t, "file", "report.txt", "some content")

	req, _ := http.NewRequest(http.MethodPost, "/api/upload", body)
	req.Header.Set("Content-Type", ct)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for non-CSV file, got %d", w.Code)
	}
}

func TestUploadHandler_WrongFieldName_Returns400(t *testing.T) {
	r := uploadRouter()
	body, ct := buildMultipart(t, "data", "grades.csv", "student_id,student_name,subject,grade\n")

	req, _ := http.NewRequest(http.MethodPost, "/api/upload", body)
	req.Header.Set("Content-Type", ct)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 when wrong field name used, got %d", w.Code)
	}
}
