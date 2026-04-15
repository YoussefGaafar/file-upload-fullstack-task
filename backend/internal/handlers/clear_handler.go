package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ClearStudentsHandler truncates the student_grades table and resets the
// auto-increment sequence.
//
// DELETE /api/students
func ClearStudentsHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, err := pool.Exec(c.Request.Context(),
			"TRUNCATE TABLE student_grades RESTART IDENTITY",
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to clear students"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "students table cleared"})
	}
}
