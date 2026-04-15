package processing

import (
	"os"
	"testing"
)

// writeTempCSV creates a temporary file with the given content and returns its
// path. The caller is responsible for removing it.
func writeTempCSV(t *testing.T, content string) string {
	t.Helper()
	f, err := os.CreateTemp(t.TempDir(), "test-*.csv")
	if err != nil {
		t.Fatalf("create temp file: %v", err)
	}
	defer f.Close()
	if _, err := f.WriteString(content); err != nil {
		t.Fatalf("write temp file: %v", err)
	}
	return f.Name()
}

func TestCountDataRows_EmptyFile(t *testing.T) {
	path := writeTempCSV(t, "")
	count, err := countDataRows(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 0 {
		t.Errorf("expected 0 rows for empty file, got %d", count)
	}
}

func TestCountDataRows_HeaderOnly(t *testing.T) {
	path := writeTempCSV(t, "student_id,student_name,subject,grade\n")
	count, err := countDataRows(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 0 {
		t.Errorf("expected 0 data rows (header only), got %d", count)
	}
}

func TestCountDataRows_ThreeDataRows_WithTrailingNewline(t *testing.T) {
	content := "student_id,student_name,subject,grade\n" +
		"1,Alice,Math,90\n" +
		"2,Bob,Science,75\n" +
		"3,Carol,History,88\n"
	path := writeTempCSV(t, content)

	count, err := countDataRows(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 data rows, got %d", count)
	}
}

func TestCountDataRows_ThreeDataRows_NoTrailingNewline(t *testing.T) {
	// No \n after the last line — the function must still count it.
	content := "student_id,student_name,subject,grade\n" +
		"1,Alice,Math,90\n" +
		"2,Bob,Science,75\n" +
		"3,Carol,History,88"
	path := writeTempCSV(t, content)

	count, err := countDataRows(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 data rows (no trailing newline), got %d", count)
	}
}

func TestCountDataRows_SingleDataRow(t *testing.T) {
	content := "student_id,student_name,subject,grade\n" +
		"1,Alice,Math,90\n"
	path := writeTempCSV(t, content)

	count, err := countDataRows(path)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 data row, got %d", count)
	}
}

func TestCountDataRows_NonExistentFile(t *testing.T) {
	_, err := countDataRows("/no/such/file/grades.csv")
	if err == nil {
		t.Error("expected error for non-existent file")
	}
}
