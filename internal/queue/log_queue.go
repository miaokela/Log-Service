package queue

import (
	"context"
	"log"
	"sync"
	"time"
)

// LogDocument 日志文档结构（从storage包复制，避免循环依赖）
type LogDocument struct {
	ID          interface{}       `bson:"_id,omitempty"`
	ServiceName string            `bson:"service_name"`
	Level       int32             `bson:"level"`
	Message     string            `bson:"message"`
	Timestamp   time.Time         `bson:"timestamp"`
	Metadata    map[string]string `bson:"metadata,omitempty"`
	TraceID     string            `bson:"trace_id,omitempty"`
	SpanID      string            `bson:"span_id,omitempty"`
	CreatedAt   time.Time         `bson:"created_at"`
}

// Storage 存储接口
type Storage interface {
	InsertLogs(ctx context.Context, logs []*LogDocument) ([]string, error)
}

// LogQueue 日志队列管理器
type LogQueue struct {
	storage     Storage
	queue       chan *LogDocument
	batchSize   int
	flushPeriod time.Duration
	shutdown    chan struct{}
	wg          sync.WaitGroup
}

// NewLogQueue 创建日志队列
func NewLogQueue(storage Storage, bufferSize, batchSize int, flushPeriod time.Duration) *LogQueue {
	return &LogQueue{
		storage:     storage,
		queue:       make(chan *LogDocument, bufferSize),
		batchSize:   batchSize,
		flushPeriod: flushPeriod,
		shutdown:    make(chan struct{}),
	}
}

// Start 启动日志队列处理器
func (lq *LogQueue) Start() {
	lq.wg.Add(1)
	go lq.processLogs()
}

// Stop 停止日志队列处理器
func (lq *LogQueue) Stop() {
	close(lq.shutdown)
	lq.wg.Wait()
	close(lq.queue)
}

// EnqueueLog 将日志加入队列（非阻塞）
func (lq *LogQueue) EnqueueLog(logDoc *LogDocument) bool {
	select {
	case lq.queue <- logDoc:
		return true
	default:
		// 队列已满，丢弃日志
		log.Printf("Warning: Log queue is full, dropping log entry")
		return false
	}
}

// processLogs 处理日志队列
func (lq *LogQueue) processLogs() {
	defer lq.wg.Done()

	ticker := time.NewTicker(lq.flushPeriod)
	defer ticker.Stop()

	batch := make([]*LogDocument, 0, lq.batchSize)

	for {
		select {
		case <-lq.shutdown:
			// 处理剩余的日志
			if len(batch) > 0 {
				lq.flushBatch(batch)
			}
			return

		case logDoc := <-lq.queue:
			batch = append(batch, logDoc)
			if len(batch) >= lq.batchSize {
				lq.flushBatch(batch)
				batch = batch[:0] // 重置批次
			}

		case <-ticker.C:
			// 定期刷新批次
			if len(batch) > 0 {
				lq.flushBatch(batch)
				batch = batch[:0] // 重置批次
			}
		}
	}
}

// flushBatch 刷新批次到存储
func (lq *LogQueue) flushBatch(batch []*LogDocument) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := lq.storage.InsertLogs(ctx, batch)
	if err != nil {
		log.Printf("Error flushing log batch: %v", err)
		// 这里可以实现重试逻辑或者将失败的日志写入文件
	} else {
		log.Printf("Successfully flushed %d logs to storage", len(batch))
	}
}
