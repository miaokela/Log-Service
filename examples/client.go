package main

import (
	"context"
	"log"
	"time"

	pb "log-service/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	// 连接到gRPC服务器
	conn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect to server: %v", err)
	}
	defer conn.Close()

	// 创建客户端
	client := pb.NewLogServiceClient(conn)

	// 测试写入单条日志
	log.Println("Testing WriteLog...")
	writeResp, err := client.WriteLog(context.Background(), &pb.WriteLogRequest{
		LogEntry: &pb.LogEntry{
			ServiceName: "test-service",
			Level:       pb.LogLevel_INFO,
			Message:     "This is a test log message",
			Timestamp:   time.Now().Format(time.RFC3339),
			Metadata: map[string]string{
				"user_id":    "12345",
				"request_id": "req-001",
			},
			TraceId: "trace-123",
			SpanId:  "span-456",
		},
	})

	if err != nil {
		log.Fatalf("WriteLog failed: %v", err)
	}

	log.Printf("WriteLog response: success=%v, log_id=%s", writeResp.Success, writeResp.LogId)

	// 测试批量写入日志
	log.Println("Testing BatchWriteLog...")
	batchResp, err := client.BatchWriteLog(context.Background(), &pb.BatchWriteLogRequest{
		LogEntries: []*pb.LogEntry{
			{
				ServiceName: "test-service",
				Level:       pb.LogLevel_DEBUG,
				Message:     "Debug message 1",
				Timestamp:   time.Now().Format(time.RFC3339),
				Metadata: map[string]string{
					"operation": "debug_test",
				},
			},
			{
				ServiceName: "test-service",
				Level:       pb.LogLevel_ERROR,
				Message:     "Error message 1",
				Timestamp:   time.Now().Format(time.RFC3339),
				Metadata: map[string]string{
					"error_code": "500",
				},
			},
			{
				ServiceName: "another-service",
				Level:       pb.LogLevel_WARN,
				Message:     "Warning message 1",
				Timestamp:   time.Now().Format(time.RFC3339),
			},
		},
	})

	if err != nil {
		log.Fatalf("BatchWriteLog failed: %v", err)
	}

	log.Printf("BatchWriteLog response: success=%v, log_ids=%v", batchResp.Success, batchResp.LogIds)

	// 等待一段时间让日志被写入数据库
	log.Println("Waiting for logs to be persisted...")
	time.Sleep(10 * time.Second)

	// 测试查询日志
	log.Println("Testing QueryLog...")
	queryResp, err := client.QueryLog(context.Background(), &pb.QueryLogRequest{
		ServiceName: "test-service",
		Level:       pb.LogLevel_DEBUG,
		Limit:       10,
		Offset:      0,
	})

	if err != nil {
		log.Fatalf("QueryLog failed: %v", err)
	}

	log.Printf("QueryLog response: success=%v, total_count=%d", queryResp.Success, queryResp.TotalCount)
	for i, logEntry := range queryResp.Logs {
		log.Printf("Log %d: [%s] %s - %s (trace: %s)",
			i+1,
			logEntry.Level.String(),
			logEntry.ServiceName,
			logEntry.Message,
			logEntry.TraceId)
	}

	// 测试按trace_id查询
	log.Println("Testing QueryLog by trace_id...")
	traceQueryResp, err := client.QueryLog(context.Background(), &pb.QueryLogRequest{
		TraceId: "trace-123",
		Limit:   10,
	})

	if err != nil {
		log.Fatalf("QueryLog by trace_id failed: %v", err)
	}

	log.Printf("QueryLog by trace_id response: success=%v, total_count=%d",
		traceQueryResp.Success, traceQueryResp.TotalCount)
	for i, logEntry := range traceQueryResp.Logs {
		log.Printf("Trace Log %d: [%s] %s - %s",
			i+1,
			logEntry.Level.String(),
			logEntry.ServiceName,
			logEntry.Message)
	}

	log.Println("All tests completed successfully!")
}
