package models

import "time"

// Student represents a single row in the student_grades table.
type Student struct {
	ID          int64     `json:"id"`
	StudentID   string    `json:"student_id"`
	StudentName string    `json:"student_name"`
	Subject     string    `json:"subject"`
	Grade       int       `json:"grade"`
	CreatedAt   time.Time `json:"created_at"`
}

// ListParams holds all query parameters for listing students.
type ListParams struct {
	Page      int
	PageSize  int
	SortBy    string // "student_name" | "grade"
	SortOrder string // "asc" | "desc"
	Name      string
	Subject   string
	GradeGt   *int
	GradeLt   *int
}

// ListResponse is the paginated response for the students endpoint.
type ListResponse struct {
	Data       []Student `json:"data"`
	Total      int64     `json:"total"`
	Page       int       `json:"page"`
	PageSize   int       `json:"page_size"`
	TotalPages int64     `json:"total_pages"`
}
