package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"sync"
	"time"

	pb "log-service/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

const (
	// 总共要插入的数据量
	TOTAL_RECORDS = 3000000
	// 每批插入的数量 (减少批次大小)
	BATCH_SIZE = 500
	// 并发协程数 (减少并发数)
	CONCURRENT_WORKERS = 5
	// 服务名
	SERVICE_NAME = "zhenhaotou"
	// gRPC服务地址
	GRPC_ADDRESS = "localhost:50051"
)

// 日志级别列表
var logLevels = []pb.LogLevel{
	pb.LogLevel_DEBUG,
	pb.LogLevel_INFO,
	pb.LogLevel_WARN,
	pb.LogLevel_ERROR,
	pb.LogLevel_FATAL,
}

// 日志消息模板
var logMessages = []string{
	"用户访问页面",
	"API请求处理",
	"数据库查询执行",
	"缓存更新操作",
	"文件上传完成",
	"用户登录成功",
	"订单创建完成",
	"支付处理成功",
	"数据同步完成",
	"任务执行结束",
}

// 生成随机ID
func generateRandomID(prefix string) string {
	return fmt.Sprintf("%s_%d_%d", prefix, time.Now().UnixNano(), rand.Intn(999999))
}

// 生成随机日志条目
func generateLogEntry() *pb.LogEntry {
	now := time.Now()

	// 随机生成时间戳（最近30天内）
	randomDays := rand.Intn(30)
	randomHours := rand.Intn(24)
	randomMinutes := rand.Intn(60)
	randomSeconds := rand.Intn(60)

	timestamp := now.AddDate(0, 0, -randomDays).
		Add(-time.Duration(randomHours) * time.Hour).
		Add(-time.Duration(randomMinutes) * time.Minute).
		Add(-time.Duration(randomSeconds) * time.Second)

	return &pb.LogEntry{
		ServiceName: SERVICE_NAME,
		Level:       logLevels[rand.Intn(len(logLevels))],
		Message:     logMessages[rand.Intn(len(logMessages))] + " - " + strconv.Itoa(rand.Intn(10000)),
		Timestamp:   timestamp.Format(time.RFC3339),
		Metadata: map[string]string{
			"adv_id":   generateRandomID("adv"),
			"aweme_id": generateRandomID("aweme"),
			"plan_id":  generateRandomID("plan"),
			"user_id":  strconv.Itoa(rand.Intn(100000)),
			"region":   []string{"北京", "上海", "广州", "深圳", "杭州"}[rand.Intn(5)],
			"platform": []string{"iOS", "Android", "Web", "Desktop"}[rand.Intn(4)],
		},
		TraceId: generateRandomID("trace"),
		SpanId:  generateRandomID("span"),
	}
}

// 批量插入工作函数
func batchInsertWorker(client pb.LogServiceClient, batchChan <-chan []*pb.LogEntry, wg *sync.WaitGroup, workerID int) {
	defer wg.Done()

	batchCount := 0
	for batch := range batchChan {
		// 执行批量插入
		resp, err := client.BatchWriteLog(context.Background(), &pb.BatchWriteLogRequest{
			LogEntries: batch,
		})

		batchCount++
		if err != nil {
			log.Printf("Worker %d - Batch %d failed: %v", workerID, batchCount, err)
			continue
		}

		if !resp.Success {
			log.Printf("Worker %d - Batch %d failed: %s", workerID, batchCount, resp.ErrorMessage)
			continue
		}

		log.Printf("Worker %d - Batch %d completed, inserted %d records", workerID, batchCount, len(batch))
	}

	log.Printf("Worker %d completed, processed %d batches", workerID, batchCount)
}

// 生成批次数据
func generateBatches(batchChan chan<- []*pb.LogEntry) {
	defer close(batchChan)

	totalBatches := (TOTAL_RECORDS + BATCH_SIZE - 1) / BATCH_SIZE
	log.Printf("将生成 %d 个批次，每批次 %d 条记录", totalBatches, BATCH_SIZE)

	for batchNum := 0; batchNum < totalBatches; batchNum++ {
		// 计算当前批次应该生成多少条记录
		remainingRecords := TOTAL_RECORDS - batchNum*BATCH_SIZE
		currentBatchSize := BATCH_SIZE
		if remainingRecords < BATCH_SIZE {
			currentBatchSize = remainingRecords
		}

		// 生成当前批次的日志条目
		batch := make([]*pb.LogEntry, currentBatchSize)
		for i := 0; i < currentBatchSize; i++ {
			batch[i] = generateLogEntry()
		}

		batchChan <- batch

		if (batchNum+1)%100 == 0 {
			log.Printf("已生成 %d/%d 批次", batchNum+1, totalBatches)
		}
	}

	log.Printf("所有批次生成完成，总计 %d 批次", totalBatches)
}

func main() {
	log.Printf("开始插入测试数据...")
	log.Printf("配置: 总记录数=%d, 批次大小=%d, 并发数=%d", TOTAL_RECORDS, BATCH_SIZE, CONCURRENT_WORKERS)

	startTime := time.Now()

	// 连接到gRPC服务器
	log.Printf("连接到gRPC服务器: %s", GRPC_ADDRESS)
	conn, err := grpc.NewClient(GRPC_ADDRESS, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("连接服务器失败: %v", err)
	}
	defer conn.Close()

	// 创建客户端
	client := pb.NewLogServiceClient(conn)

	// 测试连接
	log.Printf("测试连接...")
	testResp, err := client.WriteLog(context.Background(), &pb.WriteLogRequest{
		LogEntry: generateLogEntry(),
	})
	if err != nil {
		log.Fatalf("测试连接失败: %v", err)
	}
	if !testResp.Success {
		log.Fatalf("测试写入失败: %s", testResp.ErrorMessage)
	}
	log.Printf("连接测试成功，日志ID: %s", testResp.LogId)

	// 创建批次通道
	batchChan := make(chan []*pb.LogEntry, CONCURRENT_WORKERS*2)

	// 启动工作协程
	var wg sync.WaitGroup
	for i := 0; i < CONCURRENT_WORKERS; i++ {
		wg.Add(1)
		go batchInsertWorker(client, batchChan, &wg, i+1)
	}

	// 生成并发送批次数据
	log.Printf("开始生成批次数据...")
	generateBatches(batchChan)

	// 等待所有工作协程完成
	log.Printf("等待所有插入操作完成...")
	wg.Wait()

	duration := time.Since(startTime)
	log.Printf("数据插入完成！")
	log.Printf("总耗时: %v", duration)
	log.Printf("插入速度: %.2f 条/秒", float64(TOTAL_RECORDS)/duration.Seconds())
	log.Printf("平均延迟: %.2f ms/批次", float64(duration.Milliseconds())/float64((TOTAL_RECORDS+BATCH_SIZE-1)/BATCH_SIZE))
}
