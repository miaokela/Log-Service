package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Server struct {
	db     *mongo.Database
	router *gin.Engine
}

func main() {
	// 连接MongoDB
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://admin:password123@mongodb:27017/log_service?authSource=admin"
	}

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("Failed to connect to MongoDB:", err)
	}
	defer client.Disconnect(context.Background())

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatal("Failed to ping MongoDB:", err)
	}

	log.Println("Connected to MongoDB successfully")

	// 获取数据库
	db := client.Database("log_service")

	// 创建服务器实例
	server := &Server{
		db:     db,
		router: gin.Default(),
	}

	// 配置CORS
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	server.router.Use(cors.New(config))

	// 设置路由
	server.setupRoutes()

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Admin server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, server.router))
}

func (s *Server) setupRoutes() {
	api := s.router.Group("/api")
	{
		// 日志相关接口
		logs := api.Group("/logs")
		{
			logs.POST("/", s.createLog)
			logs.GET("/", s.queryLogs)
			logs.GET("/:id", s.getLogById)
			logs.DELETE("/:id", s.deleteLog)
		}

		// 统计接口
		stats := api.Group("/stats")
		{
			stats.GET("/", s.getStats)
		}
	}

	// 健康检查
	s.router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
}
