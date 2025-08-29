package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"log-service/internal/config"
	"log-service/internal/queue"
	"log-service/internal/service"
	"log-service/internal/storage"
	pb "log-service/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()

	// 连接MongoDB
	mongoDB, err := storage.NewMongoDB(cfg.MongoDB.URI, cfg.MongoDB.Database)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		mongoDB.Close(ctx)
	}()

	// 创建MongoDB适配器
	mongoAdapter := storage.NewMongoDBAdapter(mongoDB)

	// 创建日志队列
	logQueue := queue.NewLogQueue(
		mongoAdapter,
		cfg.LogQueue.BufferSize,
		cfg.LogQueue.BatchSize,
		time.Duration(cfg.LogQueue.FlushPeriod)*time.Second,
	)

	// 启动日志队列处理器
	logQueue.Start()
	defer logQueue.Stop()

	// 创建gRPC服务
	logService := service.NewLogService(mongoDB, logQueue)

	// 创建gRPC服务器
	grpcServer := grpc.NewServer()
	pb.RegisterLogServiceServer(grpcServer, logService)

	// 启用反射（用于开发和调试）
	reflection.Register(grpcServer)

	// 监听端口
	listener, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.Server.Port))
	if err != nil {
		log.Fatalf("Failed to listen on port %d: %v", cfg.Server.Port, err)
	}

	// 优雅关闭处理
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down gracefully...")

		// 停止接受新连接
		grpcServer.GracefulStop()

		log.Println("Server stopped")
	}()

	log.Printf("Log service starting on port %d", cfg.Server.Port)
	log.Printf("MongoDB URI: %s", cfg.MongoDB.URI)
	log.Printf("Database: %s", cfg.MongoDB.Database)

	// 启动gRPC服务器
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
