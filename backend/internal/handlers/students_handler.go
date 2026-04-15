package handlers

import (
	"context"
	"net/http"
	"strconv"

	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/models"
	"github.com/gin-gonic/gin"
)

// StudentLister is the minimal interface the handler needs from the repository.
// Using an interface makes the handler unit-testable without a real database.
type StudentLister interface {
	List(ctx context.Context, p models.ListParams) (models.ListResponse, error)
}

// ListStudentsHandler handles paginated, sorted, and filtered student queries.
//
// GET /api/students
//
// Query params:
//
//	page       int     (default 1)
//	page_size  int     (default 20, max 100)
//	sort_by    string  "student_name" | "grade"
//	sort_order string  "asc" | "desc"
//	name       string  partial match (case-insensitive)
//	subject    string  exact match
//	grade_gt   int     grade strictly greater than
//	grade_lt   int     grade strictly less than
func ListStudentsHandler(repo StudentLister) gin.HandlerFunc {
	return func(c *gin.Context) {
		params := models.ListParams{
			Page:      queryInt(c, "page", 1),
			PageSize:  clamp(queryInt(c, "page_size", 20), 1, 100),
			SortBy:    c.DefaultQuery("sort_by", "student_name"),
			SortOrder: c.DefaultQuery("sort_order", "asc"),
			Name:      c.Query("name"),
			Subject:   c.Query("subject"),
		}

		if v := c.Query("grade_gt"); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				params.GradeGt = &n
			}
		}

		if v := c.Query("grade_lt"); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				params.GradeLt = &n
			}
		}

		result, err := repo.List(c.Request.Context(), params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list students"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// ----- helpers -----

func queryInt(c *gin.Context, key string, def int) int {
	v := c.Query(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil || n < 1 {
		return def
	}
	return n
}

func clamp(v, min, max int) int {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}
