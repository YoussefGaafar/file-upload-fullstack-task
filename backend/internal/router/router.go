package router

import (
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/config"
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/handlers"
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/processing"
	"github.com/YoussefGaafar/file-upload-fullstack/backend/internal/repository"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Setup builds and returns the configured Gin engine.
func Setup(cfg *config.Config, pool *pgxpool.Pool) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Allow the Vite dev server (and any localhost port) during development.
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: false,
	}))

	// Increase the multipart memory limit so gin writes large uploads directly
	// to disk instead of keeping them in RAM.
	r.MaxMultipartMemory = 32 << 20 // 32 MB in-memory threshold

	jm := processing.GetJobManager()
	studentRepo := repository.NewStudentRepository(pool)

	api := r.Group("/api")
	{
		api.POST("/upload", handlers.UploadHandler(cfg, pool, jm))
		api.GET("/progress/:jobId", handlers.ProgressHandler(jm))
		api.GET("/students", handlers.ListStudentsHandler(studentRepo))
		api.DELETE("/students", handlers.ClearStudentsHandler(pool))
	}

	// Simple liveness probe.
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return r
}
