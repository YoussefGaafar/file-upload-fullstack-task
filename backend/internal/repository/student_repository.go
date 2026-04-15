package repository

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

type StudentRepository struct {
	pool *pgxpool.Pool
}

func NewStudentRepository(pool *pgxpool.Pool) *StudentRepository {
	return &StudentRepository{pool: pool}
}

// allowedSortColumns is a whitelist to prevent SQL injection via sort column.
var allowedSortColumns = map[string]string{
	"student_name": "student_name",
	"grade":        "grade",
}

// List returns a paginated, sorted, and filtered slice of students together
// with the total count matching the filters.
func (r *StudentRepository) List(ctx context.Context, p models.ListParams) (models.ListResponse, error) {
	// --- Build WHERE clause with positional parameters ---
	where := []string{"1=1"}
	args := []any{}
	idx := 1

	if p.Name != "" {
		where = append(where, fmt.Sprintf("student_name ILIKE $%d", idx))
		args = append(args, "%"+p.Name+"%")
		idx++
	}

	if p.Subject != "" {
		where = append(where, fmt.Sprintf("subject = $%d", idx))
		args = append(args, p.Subject)
		idx++
	}

	if p.GradeGt != nil {
		where = append(where, fmt.Sprintf("grade > $%d", idx))
		args = append(args, *p.GradeGt)
		idx++
	}

	if p.GradeLt != nil {
		where = append(where, fmt.Sprintf("grade < $%d", idx))
		args = append(args, *p.GradeLt)
		idx++
	}

	whereClause := strings.Join(where, " AND ")

	// --- COUNT ---
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM student_grades WHERE %s", whereClause)
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return models.ListResponse{}, fmt.Errorf("count query: %w", err)
	}

	// --- Validate and sanitise sort parameters ---
	sortCol, ok := allowedSortColumns[p.SortBy]
	if !ok {
		sortCol = "student_name"
	}

	sortDir := "ASC"
	if strings.ToLower(p.SortOrder) == "desc" {
		sortDir = "DESC"
	}

	// --- Pagination ---
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = 20
	}
	offset := (p.Page - 1) * p.PageSize

	// --- DATA query ---
	dataQuery := fmt.Sprintf(
		`SELECT id, student_id, student_name, subject, grade, created_at
		 FROM student_grades
		 WHERE %s
		 ORDER BY %s %s
		 LIMIT $%d OFFSET $%d`,
		whereClause, sortCol, sortDir, idx, idx+1,
	)
	args = append(args, p.PageSize, offset)

	rows, err := r.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return models.ListResponse{}, fmt.Errorf("data query: %w", err)
	}
	defer rows.Close()

	students := make([]models.Student, 0, p.PageSize)
	for rows.Next() {
		var s models.Student
		if err := rows.Scan(
			&s.ID, &s.StudentID, &s.StudentName, &s.Subject, &s.Grade, &s.CreatedAt,
		); err != nil {
			return models.ListResponse{}, fmt.Errorf("scan row: %w", err)
		}
		students = append(students, s)
	}
	if err := rows.Err(); err != nil {
		return models.ListResponse{}, fmt.Errorf("rows iteration: %w", err)
	}

	totalPages := int64(math.Ceil(float64(total) / float64(p.PageSize)))

	return models.ListResponse{
		Data:       students,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}
