package main

import (
	"context"
	"fmt"
	"log"
	"sync"
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

	// 性能测试参数
	numGoroutines := 10
	logsPerGoroutine := 100
	totalLogs := numGoroutines * logsPerGoroutine

	fmt.Printf("Starting performance test:\n")
	fmt.Printf("- Goroutines: %d\n", numGoroutines)
	fmt.Printf("- Logs per goroutine: %d\n", logsPerGoroutine)
	fmt.Printf("- Total logs: %d\n", totalLogs)
	fmt.Println()

	// 测试单条日志写入性能
	fmt.Println("=== Testing Single Log Write Performance ===")
	startTime := time.Now()

	var wg sync.WaitGroup
	var successCount int64
	var mu sync.Mutex

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()
			localSuccess := 0

			for j := 0; j < logsPerGoroutine; j++ {
				logEntry := &pb.LogEntry{
					ServiceName: fmt.Sprintf("perf-test-service-%d", goroutineID),
					Level:       pb.LogLevel_INFO,
					Message:     fmt.Sprintf("Performance test log %d from goroutine %d", j, goroutineID),
					Timestamp:   time.Now().Format(time.RFC3339),
					Metadata: map[string]string{
						"goroutine_id": fmt.Sprintf("%d", goroutineID),
						"log_number":   fmt.Sprintf("%d", j),
						"test_type":    "single_write",
					},
					TraceId: fmt.Sprintf("trace-%d-%d", goroutineID, j),
					SpanId:  fmt.Sprintf("span-%d-%d", goroutineID, j),
				}

				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				resp, err := client.WriteLog(ctx, &pb.WriteLogRequest{
					LogEntry: logEntry,
				})
				cancel()

				if err != nil {
					log.Printf("Error writing log: %v", err)
				} else if resp.Success {
					localSuccess++
				}
			}

			mu.Lock()
			successCount += int64(localSuccess)
			mu.Unlock()
		}(i)
	}

	wg.Wait()
	duration := time.Since(startTime)

	fmt.Printf("Single write test completed:\n")
	fmt.Printf("- Duration: %v\n", duration)
	fmt.Printf("- Successful writes: %d/%d\n", successCount, totalLogs)
	fmt.Printf("- Throughput: %.2f logs/second\n", float64(successCount)/duration.Seconds())
	fmt.Printf("- Average latency: %v per log\n", duration/time.Duration(successCount))
	fmt.Println()

	// 测试批量日志写入性能
	fmt.Println("=== Testing Batch Log Write Performance ===")
	batchSize := 50
	numBatches := totalLogs / batchSize

	startTime = time.Now()
	successCount = 0

	for i := 0; i < numBatches; i++ {
		wg.Add(1)
		go func(batchID int) {
			defer wg.Done()

			// 创建批量日志
			logEntries := make([]*pb.LogEntry, batchSize)
			for j := 0; j < batchSize; j++ {
				logEntries[j] = &pb.LogEntry{
					ServiceName: fmt.Sprintf("batch-test-service-%d", batchID),
					Level:       pb.LogLevel_DEBUG,
					Message:     fmt.Sprintf("Batch test log %d from batch %d", j, batchID),
					Timestamp:   time.Now().Format(time.RFC3339),
					Metadata: map[string]string{
						"batch_id":     fmt.Sprintf("%d", batchID),
						"log_number":   fmt.Sprintf("%d", j),
						"test_type":    "batch_write",
					},
					TraceId: fmt.Sprintf("batch-trace-%d-%d", batchID, j),
					SpanId:  fmt.Sprintf("batch-span-%d-%d", batchID, j),
				}
			}

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			resp, err := client.BatchWriteLog(ctx, &pb.BatchWriteLogRequest{
				LogEntries: logEntries,
			})
			cancel()

			if err != nil {
				log.Printf("Error writing batch: %v", err)
			} else if resp.Success {
				mu.Lock()
				successCount += int64(len(resp.LogIds))
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()
	duration = time.Since(startTime)

	fmt.Printf("Batch write test completed:\n")
	fmt.Printf("- Duration: %v\n", duration)
	fmt.Printf("- Successful writes: %d/%d\n", successCount, numBatches*batchSize)
	fmt.Printf("- Throughput: %.2f logs/second\n", float64(successCount)/duration.Seconds())
	fmt.Printf("- Average latency: %v per batch\n", duration/time.Duration(numBatches))
	fmt.Println()

	// 等待日志被持久化
	fmt.Println("Waiting for logs to be persisted...")
	time.Sleep(15 * time.Second)

	// 测试查询性能
	fmt.Println("=== Testing Query Performance ===")
	
	// 查询不同服务的日志
	services := []string{"perf-test-service-0", "perf-test-service-1", "batch-test-service-0"}
	
	for _, serviceName := range services {
		startTime = time.Now()
		
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		resp, err := client.QueryLog(ctx, &pb.QueryLogRequest{
			ServiceName: serviceName,
			Limit:       100,
			Offset:      0,
		})
		cancel()
		
		queryDuration := time.Since(startTime)
		
		if err != nil {
			log.Printf("Error querying logs for service %s: %v", serviceName, err)
		} else {
			fmt.Printf("Query for service '%s':\n", serviceName)
			fmt.Printf("- Duration: %v\n", queryDuration)
			fmt.Printf("- Results: %d logs (total: %d)\n", len(resp.Logs), resp.TotalCount)
			fmt.Printf("- Query rate: %.2f queries/second\n", 1.0/queryDuration.Seconds())
		}
	}

	fmt.Println()
	fmt.Println("Performance testing completed!")
	fmt.Println("Check the service logs to see the batching behavior in action.")
}
