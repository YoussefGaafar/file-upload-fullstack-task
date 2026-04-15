package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Port        string
	UploadDir   string
}

func Load() (*Config, error) {
	// Load .env file if it exists; ignore error if it doesn't.
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "/tmp/uploads"
	}

	return &Config{
		DatabaseURL: dbURL,
		Port:        port,
		UploadDir:   uploadDir,
	}, nil
}
