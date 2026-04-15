package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/models"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// ----- mock repository -----

type mockStudentLister struct {
	response models.ListResponse
	err      error
}

func (m *mockStudentLister) List(_ context.Context, _ models.ListParams) (models.ListResponse, error) {
	return m.response, m.err
}

// ----- helper -----

func newRouter(lister StudentLister) *gin.Engine {
	r := gin.New()
	r.GET("/api/students", ListStudentsHandler(lister))
	return r
}

func doGet(r *gin.Engine, url string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, url, nil)
	r.ServeHTTP(w, req)
	return w
}

// ----- queryInt tests -----

func TestQueryInt_DefaultWhenEmpty(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request, _ = http.NewRequest("GET", "/", nil)

	got := queryInt(c, "page", 7)
	if got != 7 {
		t.Errorf("expected default 7, got %d", got)
	}
}

func TestQueryInt_ValidValue(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request, _ = http.NewRequest("GET", "/?page=3", nil)

	got := queryInt(c, "page", 1)
	if got != 3 {
		t.Errorf("expected 3, got %d", got)
	}
}

func TestQueryInt_InvalidFallsBack(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request, _ = http.NewRequest("GET", "/?page=abc", nil)

	got := queryInt(c, "page", 5)
	if got != 5 {
		t.Errorf("expected default 5 for non-numeric input, got %d", got)
	}
}

func TestQueryInt_ZeroFallsBack(t *testing.T) {
	// page < 1 should also return the default.
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request, _ = http.NewRequest("GET", "/?page=0", nil)

	got := queryInt(c, "page", 1)
	if got != 1 {
		t.Errorf("expected default 1 for page=0, got %d", got)
	}
}

// ----- clamp tests -----

func TestClamp_BelowMin(t *testing.T) {
	if got := clamp(0, 1, 100); got != 1 {
		t.Errorf("expected 1, got %d", got)
	}
}

func TestClamp_AboveMax(t *testing.T) {
	if got := clamp(200, 1, 100); got != 100 {
		t.Errorf("expected 100, got %d", got)
	}
}

func TestClamp_InRange(t *testing.T) {
	if got := clamp(50, 1, 100); got != 50 {
		t.Errorf("expected 50, got %d", got)
	}
}

// ----- ListStudentsHandler HTTP tests -----

func TestListStudentsHandler_Returns200WithData(t *testing.T) {
	mock := &mockStudentLister{
		response: models.ListResponse{
			Data: []models.Student{
				{ID: 1, StudentName: "Alice", Subject: "Math", Grade: 95},
			},
			Total:      1,
			Page:       1,
			PageSize:   20,
			TotalPages: 1,
		},
	}

	w := doGet(newRouter(mock), "/api/students")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body models.ListResponse
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid JSON response: %v", err)
	}
	if len(body.Data) != 1 {
		t.Errorf("expected 1 student, got %d", len(body.Data))
	}
	if body.Data[0].StudentName != "Alice" {
		t.Errorf("expected Alice, got %q", body.Data[0].StudentName)
	}
}

func TestListStudentsHandler_RepoError_Returns500(t *testing.T) {
	mock := &mockStudentLister{err: errors.New("db connection lost")}

	w := doGet(newRouter(mock), "/api/students")

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestListStudentsHandler_EmptyResult(t *testing.T) {
	mock := &mockStudentLister{
		response: models.ListResponse{Data: []models.Student{}, Total: 0, Page: 1, PageSize: 20},
	}

	w := doGet(newRouter(mock), "/api/students")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body models.ListResponse
	json.Unmarshal(w.Body.Bytes(), &body) //nolint:errcheck
	if len(body.Data) != 0 {
		t.Errorf("expected empty data slice, got %d items", len(body.Data))
	}
}

func TestListStudentsHandler_PageSizeClamped(t *testing.T) {
	var capturedParams models.ListParams
	mock := &capturingLister{capture: &capturedParams}

	doGet(newRouter(mock), "/api/students?page_size=999")

	if capturedParams.PageSize > 100 {
		t.Errorf("page_size should be clamped to 100, got %d", capturedParams.PageSize)
	}
}

// capturingLister captures the params it receives so we can assert on them.
type capturingLister struct {
	capture *models.ListParams
}

func (c *capturingLister) List(_ context.Context, p models.ListParams) (models.ListResponse, error) {
	*c.capture = p
	return models.ListResponse{Data: []models.Student{}}, nil
}

func TestListStudentsHandler_DefaultSortIsStudentNameAsc(t *testing.T) {
	var captured models.ListParams
	mock := &capturingLister{capture: &captured}

	doGet(newRouter(mock), "/api/students")

	if captured.SortBy != "student_name" {
		t.Errorf("expected sort_by=student_name, got %q", captured.SortBy)
	}
	if captured.SortOrder != "asc" {
		t.Errorf("expected sort_order=asc, got %q", captured.SortOrder)
	}
}
