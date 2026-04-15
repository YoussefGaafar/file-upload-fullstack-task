package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database URL: %w", err)
	}

	cfg.MaxConns = 20
	cfg.MinConns = 5

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS student_grades (
			id           BIGSERIAL PRIMARY KEY,
			student_id   TEXT        NOT NULL,
			student_name VARCHAR(255) NOT NULL,
			subject      VARCHAR(100) NOT NULL,
			grade        INTEGER      NOT NULL,
			created_at   TIMESTAMPTZ  DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_sg_student_name ON student_grades (student_name)`,
		`CREATE INDEX IF NOT EXISTS idx_sg_subject      ON student_grades (subject)`,
		`CREATE INDEX IF NOT EXISTS idx_sg_grade        ON student_grades (grade)`,
	}

	for _, stmt := range statements {
		if _, err := pool.Exec(ctx, stmt); err != nil {
			return fmt.Errorf("migration error: %w", err)
		}
	}

	return nil
}
