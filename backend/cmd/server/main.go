package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/config"
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/database"
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/router"
)

func main() {
	// --- Configuration ---
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// Ensure the temp upload directory exists.
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		log.Fatalf("create upload dir %s: %v", cfg.UploadDir, err)
	}

	// --- Database ---
	ctx := context.Background()

	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection: %v", err)
	}
	defer pool.Close()

	if err := database.RunMigrations(ctx, pool); err != nil {
		log.Fatalf("migrations: %v", err)
	}

	log.Println("database connected and migrations applied")

	// --- HTTP Server ---
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router.Setup(cfg, pool),
		ReadTimeout:  10 * time.Minute, // allow large file uploads
		WriteTimeout: 0,                // SSE streams have no write deadline
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("server listening on http://localhost:%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	// --- Graceful Shutdown ---
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server…")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}

	log.Println("server stopped")
}
