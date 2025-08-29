package storage

import (
	"context"
	"log-service/internal/queue"
)

// MongoDBAdapter MongoDB适配器，实现队列存储接口
type MongoDBAdapter struct {
	*MongoDB
}

// NewMongoDBAdapter 创建MongoDB适配器
func NewMongoDBAdapter(mongodb *MongoDB) *MongoDBAdapter {
	return &MongoDBAdapter{MongoDB: mongodb}
}

// InsertLogs 实现队列存储接口
func (m *MongoDBAdapter) InsertLogs(ctx context.Context, queueLogs []*queue.LogDocument) ([]string, error) {
	// 转换队列文档为存储文档格式
	storageLogs := make([]*QueueLogDocument, len(queueLogs))
	for i, queueLog := range queueLogs {
		storageLogs[i] = &QueueLogDocument{
			ID:          queueLog.ID,
			ServiceName: queueLog.ServiceName,
			Level:       queueLog.Level,
			Message:     queueLog.Message,
			Timestamp:   queueLog.Timestamp,
			Metadata:    queueLog.Metadata,
			TraceID:     queueLog.TraceID,
			SpanID:      queueLog.SpanID,
			CreatedAt:   queueLog.CreatedAt,
		}
	}

	return m.MongoDB.InsertLogs(ctx, storageLogs)
}
