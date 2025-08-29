package storage

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// LogDocument MongoDB中的日志文档结构
type LogDocument struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	ServiceName string             `bson:"service_name"`
	Level       int32              `bson:"level"`
	Message     string             `bson:"message"`
	Timestamp   time.Time          `bson:"timestamp"`
	Metadata    map[string]string  `bson:"metadata,omitempty"`
	TraceID     string             `bson:"trace_id,omitempty"`
	SpanID      string             `bson:"span_id,omitempty"`
	CreatedAt   time.Time          `bson:"created_at"`
}

// QueueLogDocument 队列中的日志文档结构（避免循环导入）
type QueueLogDocument struct {
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

// MongoDB MongoDB存储实现
type MongoDB struct {
	client     *mongo.Client
	database   *mongo.Database
	collection *mongo.Collection
}

// NewMongoDB 创建MongoDB存储实例
func NewMongoDB(uri, database string) (*MongoDB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, err
	}

	// 测试连接
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	db := client.Database(database)
	collection := db.Collection("logs")

	// 创建索引
	mongodb := &MongoDB{
		client:     client,
		database:   db,
		collection: collection,
	}

	if err := mongodb.createIndexes(ctx); err != nil {
		return nil, err
	}

	return mongodb, nil
}

// createIndexes 创建索引
func (m *MongoDB) createIndexes(ctx context.Context) error {
	indexes := []mongo.IndexModel{
		{
			Keys: bson.D{
				bson.E{Key: "service_name", Value: 1},
				bson.E{Key: "timestamp", Value: -1},
			},
		},
		{
			Keys: bson.D{
				bson.E{Key: "level", Value: 1},
				bson.E{Key: "timestamp", Value: -1},
			},
		},
		{
			Keys: bson.D{
				bson.E{Key: "trace_id", Value: 1},
			},
		},
		{
			Keys: bson.D{
				bson.E{Key: "timestamp", Value: -1},
			},
		},
	}

	_, err := m.collection.Indexes().CreateMany(ctx, indexes)
	return err
}

// InsertLog 插入单条日志
func (m *MongoDB) InsertLog(ctx context.Context, log *LogDocument) (string, error) {
	log.CreatedAt = time.Now()
	result, err := m.collection.InsertOne(ctx, log)
	if err != nil {
		return "", err
	}

	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		return oid.Hex(), nil
	}
	return "", nil
}

// InsertLogs 批量插入日志（兼容队列接口）
func (m *MongoDB) InsertLogs(ctx context.Context, queueLogs []*QueueLogDocument) ([]string, error) {
	if len(queueLogs) == 0 {
		return []string{}, nil
	}

	// 转换为存储格式
	docs := make([]interface{}, len(queueLogs))
	for i, queueLog := range queueLogs {
		log := &LogDocument{
			ServiceName: queueLog.ServiceName,
			Level:       queueLog.Level,
			Message:     queueLog.Message,
			Timestamp:   queueLog.Timestamp,
			Metadata:    queueLog.Metadata,
			TraceID:     queueLog.TraceID,
			SpanID:      queueLog.SpanID,
			CreatedAt:   time.Now(),
		}
		docs[i] = log
	}

	result, err := m.collection.InsertMany(ctx, docs)
	if err != nil {
		return nil, err
	}

	ids := make([]string, len(result.InsertedIDs))
	for i, id := range result.InsertedIDs {
		if oid, ok := id.(primitive.ObjectID); ok {
			ids[i] = oid.Hex()
		}
	}

	return ids, nil
}

// InsertLogDocuments 批量插入日志文档
func (m *MongoDB) InsertLogDocuments(ctx context.Context, logs []*LogDocument) ([]string, error) {
	if len(logs) == 0 {
		return []string{}, nil
	}

	docs := make([]interface{}, len(logs))
	for i, log := range logs {
		log.CreatedAt = time.Now()
		docs[i] = log
	}

	result, err := m.collection.InsertMany(ctx, docs)
	if err != nil {
		return nil, err
	}

	ids := make([]string, len(result.InsertedIDs))
	for i, id := range result.InsertedIDs {
		if oid, ok := id.(primitive.ObjectID); ok {
			ids[i] = oid.Hex()
		}
	}

	return ids, nil
}

// QueryLogFilter 日志查询过滤器
type QueryLogFilter struct {
	ServiceName     string
	Level           *int32
	StartTime       *time.Time
	EndTime         *time.Time
	MetadataFilters map[string]string
	TraceID         string
	Limit           int32
	Offset          int32
}

// QueryLogs 查询日志
func (m *MongoDB) QueryLogs(ctx context.Context, filter *QueryLogFilter) ([]*LogDocument, int64, error) {
	// 构建查询条件
	query := bson.M{}

	if filter.ServiceName != "" {
		query["service_name"] = filter.ServiceName
	}

	if filter.Level != nil {
		query["level"] = *filter.Level
	}

	if filter.StartTime != nil || filter.EndTime != nil {
		timeQuery := bson.M{}
		if filter.StartTime != nil {
			timeQuery["$gte"] = *filter.StartTime
		}
		if filter.EndTime != nil {
			timeQuery["$lte"] = *filter.EndTime
		}
		query["timestamp"] = timeQuery
	}

	if filter.TraceID != "" {
		query["trace_id"] = filter.TraceID
	}

	// 处理metadata过滤器
	for key, value := range filter.MetadataFilters {
		query["metadata."+key] = value
	}

	// 计算总数
	totalCount, err := m.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	// 构建查询选项
	opts := options.Find().SetSort(bson.D{bson.E{Key: "timestamp", Value: -1}})

	if filter.Limit > 0 {
		opts.SetLimit(int64(filter.Limit))
	}

	if filter.Offset > 0 {
		opts.SetSkip(int64(filter.Offset))
	}

	// 执行查询
	cursor, err := m.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var logs []*LogDocument
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, 0, err
	}

	return logs, totalCount, nil
}

// Close 关闭数据库连接
func (m *MongoDB) Close(ctx context.Context) error {
	return m.client.Disconnect(ctx)
}
