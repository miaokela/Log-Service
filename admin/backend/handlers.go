package main

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// LogEntry 日志条目结构
type LogEntry struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ServiceName string             `json:"service_name" bson:"service_name"`
	Level       interface{}        `json:"level" bson:"level"`
	Message     string             `json:"message" bson:"message"`
	Timestamp   time.Time          `json:"timestamp" bson:"timestamp"`
	Metadata    map[string]string  `json:"metadata" bson:"metadata"`
	TraceID     string             `json:"trace_id" bson:"trace_id"`
	SpanID      string             `json:"span_id" bson:"span_id"`
}

// IndexInfo 索引信息结构
type IndexInfo struct {
	Name       string                 `json:"name"`
	Key        map[string]interface{} `json:"key"`
	Unique     bool                   `json:"unique,omitempty"`
	Background bool                   `json:"background,omitempty"`
	Sparse     bool                   `json:"sparse,omitempty"`
	Size       int64                  `json:"size,omitempty"`
	Version    int                    `json:"version,omitempty"`
}

// CreateIndexRequest 创建索引请求结构
type CreateIndexRequest struct {
	Name       string                 `json:"name" binding:"required"`
	Key        map[string]interface{} `json:"key" binding:"required"`
	Unique     bool                   `json:"unique,omitempty"`
	Background bool                   `json:"background,omitempty"`
	Sparse     bool                   `json:"sparse,omitempty"`
}

// IndexStats 索引统计信息
type IndexStats struct {
	TotalIndexes   int     `json:"total_indexes"`
	TotalIndexSize int64   `json:"total_index_size"`
	CollectionSize int64   `json:"collection_size"`
	DocumentCount  int64   `json:"document_count"`
	AvgObjSize     float64 `json:"avg_obj_size"`
}

// LogEntryResponse 日志条目响应结构（用于API返回，level转换为字符串）
type LogEntryResponse struct {
	ID          primitive.ObjectID `json:"id"`
	ServiceName string             `json:"service_name"`
	Level       string             `json:"level"`
	Message     string             `json:"message"`
	Timestamp   time.Time          `json:"timestamp"`
	Metadata    map[string]string  `json:"metadata"`
	TraceID     string             `json:"trace_id"`
	SpanID      string             `json:"span_id"`
}

// convertLevelToString 将level转换为字符串
func convertLevelToString(level interface{}) string {
	switch l := level.(type) {
	case int32:
		switch l {
		case 0:
			return "DEBUG"
		case 1:
			return "INFO"
		case 2:
			return "WARN"
		case 3:
			return "ERROR"
		case 4:
			return "FATAL"
		default:
			return fmt.Sprintf("UNKNOWN_%d", l)
		}
	case int:
		switch l {
		case 0:
			return "DEBUG"
		case 1:
			return "INFO"
		case 2:
			return "WARN"
		case 3:
			return "ERROR"
		case 4:
			return "FATAL"
		default:
			return fmt.Sprintf("UNKNOWN_%d", l)
		}
	case string:
		return l
	default:
		return fmt.Sprintf("UNKNOWN_%v", l)
	}
}

// CreateLogRequest 创建日志请求
type CreateLogRequest struct {
	ServiceName string            `json:"service_name" binding:"required"`
	Level       string            `json:"level" binding:"required"`
	Message     string            `json:"message" binding:"required"`
	Metadata    map[string]string `json:"metadata"`
	TraceID     string            `json:"trace_id"`
	SpanID      string            `json:"span_id"`
}

// QueryLogsRequest 查询日志请求
type QueryLogsRequest struct {
	ServiceName string            `json:"service_name"`
	Level       string            `json:"level"`
	StartTime   string            `json:"start_time"`
	EndTime     string            `json:"end_time"`
	Metadata    map[string]string `json:"metadata"`
	TraceID     string            `json:"trace_id"`
	Limit       int               `json:"limit"`
	Offset      int               `json:"offset"`
	Message     string            `json:"message"`
}

// StatsResponse 统计响应
type StatsResponse struct {
	TotalLogs     int64            `json:"total_logs"`
	LogsByLevel   map[string]int64 `json:"logs_by_level"`
	LogsByService map[string]int64 `json:"logs_by_service"`
	Recent24h     int64            `json:"recent_24h"`
}

// createLog 创建日志
func (s *Server) createLog(c *gin.Context) {
	var req CreateLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	logEntry := LogEntry{
		ServiceName: req.ServiceName,
		Level:       req.Level,
		Message:     req.Message,
		Timestamp:   time.Now(),
		Metadata:    req.Metadata,
		TraceID:     req.TraceID,
		SpanID:      req.SpanID,
	}

	if logEntry.Metadata == nil {
		logEntry.Metadata = make(map[string]string)
	}

	collection := s.db.Collection("logs")
	result, err := collection.InsertOne(context.Background(), logEntry)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create log"})
		return
	}

	logEntry.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, logEntry)
}

// queryLogs 查询日志
func (s *Server) queryLogs(c *gin.Context) {
	var filter bson.M = bson.M{}

	// 解析查询参数
	if serviceName := c.Query("service_name"); serviceName != "" {
		filter["service_name"] = bson.M{"$regex": serviceName, "$options": "i"}
	}

	if level := c.Query("level"); level != "" {
		filter["level"] = level
	}

	if message := c.Query("message"); message != "" {
		filter["message"] = bson.M{"$regex": message, "$options": "i"}
	}

	if traceID := c.Query("trace_id"); traceID != "" {
		filter["trace_id"] = traceID
	}

	// Metadata 过滤
	for key, values := range c.Request.URL.Query() {
		if strings.HasPrefix(key, "metadata_filters[") && strings.HasSuffix(key, "]") {
			// 提取metadata字段名，如: metadata_filters[user_id] -> user_id
			metadataKey := strings.TrimSuffix(strings.TrimPrefix(key, "metadata_filters["), "]")
			if metadataKey != "" && len(values) > 0 && values[0] != "" {
				filter["metadata."+metadataKey] = values[0]
			}
		}
	}

	// 时间范围过滤
	if startTime := c.Query("start_time"); startTime != "" {
		if t, err := time.Parse(time.RFC3339, startTime); err == nil {
			if filter["timestamp"] == nil {
				filter["timestamp"] = bson.M{}
			}
			filter["timestamp"].(bson.M)["$gte"] = t
		}
	}

	if endTime := c.Query("end_time"); endTime != "" {
		if t, err := time.Parse(time.RFC3339, endTime); err == nil {
			if filter["timestamp"] == nil {
				filter["timestamp"] = bson.M{}
			}
			filter["timestamp"].(bson.M)["$lte"] = t
		}
	}

	// 分页参数
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}

	collection := s.db.Collection("logs")

	// 计算总数
	total, err := collection.CountDocuments(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count logs"})
		return
	}

	// 查询数据
	opts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{bson.E{Key: "timestamp", Value: -1}})

	cursor, err := collection.Find(context.Background(), filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query logs"})
		return
	}
	defer cursor.Close(context.Background())

	var logs []LogEntry
	if err = cursor.All(context.Background(), &logs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode logs"})
		return
	}

	// 转换为响应格式
	var responseLogs []LogEntryResponse
	for _, log := range logs {
		responseLogs = append(responseLogs, LogEntryResponse{
			ID:          log.ID,
			ServiceName: log.ServiceName,
			Level:       convertLevelToString(log.Level),
			Message:     log.Message,
			Timestamp:   log.Timestamp,
			Metadata:    log.Metadata,
			TraceID:     log.TraceID,
			SpanID:      log.SpanID,
		})
	}

	if responseLogs == nil {
		responseLogs = []LogEntryResponse{}
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":   responseLogs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// getLogById 根据ID获取日志
func (s *Server) getLogById(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log ID"})
		return
	}

	collection := s.db.Collection("logs")
	var log LogEntry
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&log)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{"error": "Log not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get log"})
		return
	}

	c.JSON(http.StatusOK, log)
}

// deleteLog 删除日志
func (s *Server) deleteLog(c *gin.Context) {
	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid log ID"})
		return
	}

	collection := s.db.Collection("logs")
	result, err := collection.DeleteOne(context.Background(), bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete log"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Log deleted successfully"})
}

// getStats 获取统计信息 - 带缓存的高性能版本
func (s *Server) getStats(c *gin.Context) {
	// 检查缓存
	s.statsCache.mu.RLock()
	if time.Now().Before(s.statsCache.ExpiresAt) {
		cachedStats := s.statsCache.Data
		s.statsCache.mu.RUnlock()
		c.JSON(http.StatusOK, cachedStats)
		return
	}
	s.statsCache.mu.RUnlock()

	// 缓存已过期，获取新数据
	s.statsCache.mu.Lock()
	defer s.statsCache.mu.Unlock()

	// 双重检查，防止并发时多次计算
	if time.Now().Before(s.statsCache.ExpiresAt) {
		c.JSON(http.StatusOK, s.statsCache.Data)
		return
	}

	collection := s.db.Collection("logs")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	yesterday := time.Now().Add(-24 * time.Hour)

	// 对于大数据集，使用采样来加速统计
	// 首先快速获取总数
	totalLogs, err := collection.EstimatedDocumentCount(ctx)
	if err != nil {
		// 如果估算失败，使用精确计数
		totalLogs, _ = collection.CountDocuments(ctx, bson.M{})
	}

	// 如果数据量太大（超过100万），使用采样策略
	useSampling := totalLogs > 1000000
	sampleSize := int64(10000) // 采样1万条记录进行统计

	var pipeline []bson.M

	if useSampling {
		// 使用随机采样
		pipeline = []bson.M{
			{"$sample": bson.M{"size": sampleSize}},
			{"$facet": bson.M{
				"levelStats": []bson.M{
					{"$group": bson.M{
						"_id":   "$level",
						"count": bson.M{"$sum": 1},
					}},
				},
				"serviceStats": []bson.M{
					{"$group": bson.M{
						"_id":   "$service_name",
						"count": bson.M{"$sum": 1},
					}},
				},
			}},
		}
	} else {
		// 数据量较小，使用完整数据
		pipeline = []bson.M{
			{"$facet": bson.M{
				"levelStats": []bson.M{
					{"$group": bson.M{
						"_id":   "$level",
						"count": bson.M{"$sum": 1},
					}},
				},
				"serviceStats": []bson.M{
					{"$group": bson.M{
						"_id":   "$service_name",
						"count": bson.M{"$sum": 1},
					}},
				},
			}},
		}
	}

	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get stats: " + err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse stats: " + err.Error()})
		return
	}

	// 单独快速查询最近24小时的数据
	recent24h, _ := collection.CountDocuments(ctx, bson.M{
		"timestamp": bson.M{"$gte": yesterday},
	})

	if len(results) == 0 {
		stats := StatsResponse{
			TotalLogs:     totalLogs,
			LogsByLevel:   make(map[string]int64),
			LogsByService: make(map[string]int64),
			Recent24h:     recent24h,
		}
		// 缓存结果，缓存1分钟
		s.statsCache.Data = stats
		s.statsCache.ExpiresAt = time.Now().Add(1 * time.Minute)
		c.JSON(http.StatusOK, stats)
		return
	}

	result := results[0]

	// 计算缩放比例（如果使用了采样）
	scaleFactor := float64(1)
	if useSampling && sampleSize > 0 {
		scaleFactor = float64(totalLogs) / float64(sampleSize)
	}

	// 处理按级别统计
	logsByLevel := make(map[string]int64)
	if levelStatsArr, ok := result["levelStats"]; ok {
		// 处理primitive.A类型
		if levelStatsSlice, ok := levelStatsArr.(primitive.A); ok {
			for _, levelStat := range levelStatsSlice {
				if stat, ok := levelStat.(primitive.M); ok {
					var levelStr string
					// level字段可能是int32或string，需要处理两种情况
					switch id := stat["_id"].(type) {
					case int32:
						// 数字类型的level
						switch id {
						case 0:
							levelStr = "DEBUG"
						case 1:
							levelStr = "INFO"
						case 2:
							levelStr = "WARN"
						case 3:
							levelStr = "ERROR"
						case 4:
							levelStr = "FATAL"
						default:
							levelStr = fmt.Sprintf("UNKNOWN_%d", id)
						}
					case string:
						levelStr = id
					case nil:
						levelStr = "NULL"
					default:
						levelStr = fmt.Sprintf("UNKNOWN_%v", id)
					}

					// count字段处理并应用缩放
					var count int64
					switch c := stat["count"].(type) {
					case int32:
						count = int64(float64(c) * scaleFactor)
					case int64:
						count = int64(float64(c) * scaleFactor)
					case int:
						count = int64(float64(c) * scaleFactor)
					default:
						count = 0
					}

					if existing, exists := logsByLevel[levelStr]; exists {
						logsByLevel[levelStr] = existing + count
					} else {
						logsByLevel[levelStr] = count
					}
				}
			}
		}
	}

	// 处理按服务统计
	logsByService := make(map[string]int64)
	if serviceStatsArr, ok := result["serviceStats"]; ok {
		// 处理primitive.A类型
		if serviceStatsSlice, ok := serviceStatsArr.(primitive.A); ok {
			for _, serviceStat := range serviceStatsSlice {
				if stat, ok := serviceStat.(primitive.M); ok {
					serviceName := ""
					if svc, ok := stat["_id"]; ok && svc != nil {
						serviceName = fmt.Sprintf("%v", svc)
					} else {
						serviceName = "UNKNOWN"
					}

					// count字段处理并应用缩放
					var count int64
					switch c := stat["count"].(type) {
					case int32:
						count = int64(float64(c) * scaleFactor)
					case int64:
						count = int64(float64(c) * scaleFactor)
					case int:
						count = int64(float64(c) * scaleFactor)
					default:
						count = 0
					}
					logsByService[serviceName] = count
				}
			}
		}
	}

	stats := StatsResponse{
		TotalLogs:     totalLogs,
		LogsByLevel:   logsByLevel,
		LogsByService: logsByService,
		Recent24h:     recent24h,
	}

	// 缓存结果，缓存1分钟
	s.statsCache.Data = stats
	s.statsCache.ExpiresAt = time.Now().Add(1 * time.Minute)

	c.JSON(http.StatusOK, stats)
}

// getIndexes 获取所有索引信息
func (s *Server) getIndexes(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := s.db.Collection("logs")

	// 获取索引规格
	cursor, err := collection.Indexes().List(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer cursor.Close(ctx)

	var indexes []IndexInfo
	for cursor.Next(ctx) {
		var indexSpec bson.M
		if err := cursor.Decode(&indexSpec); err != nil {
			continue
		}

		index := IndexInfo{
			Name: indexSpec["name"].(string),
			Key:  indexSpec["key"].(bson.M),
		}

		// 解析可选字段
		if unique, ok := indexSpec["unique"].(bool); ok {
			index.Unique = unique
		}
		if background, ok := indexSpec["background"].(bool); ok {
			index.Background = background
		}
		if sparse, ok := indexSpec["sparse"].(bool); ok {
			index.Sparse = sparse
		}
		if version, ok := indexSpec["v"].(int32); ok {
			index.Version = int(version)
		}

		indexes = append(indexes, index)
	}

	// 获取索引统计信息
	stats, err := collection.Database().RunCommand(ctx, bson.D{
		{Key: "collStats", Value: "logs"},
		{Key: "indexDetails", Value: true},
	}).DecodeBytes()

	if err == nil {
		// 为每个索引添加大小信息
		if indexSizes, ok := stats.Lookup("indexSizes").DocumentOK(); ok {
			for i := range indexes {
				if size, sizeOk := indexSizes.Lookup(indexes[i].Name).Int64OK(); sizeOk {
					indexes[i].Size = size
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"indexes": indexes,
		"total":   len(indexes),
	})
}

// createIndex 创建新索引
func (s *Server) createIndex(c *gin.Context) {
	var req CreateIndexRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	collection := s.db.Collection("logs")

	// 构建索引选项
	indexOptions := options.Index().SetName(req.Name)
	if req.Unique {
		indexOptions.SetUnique(true)
	}
	if req.Background {
		indexOptions.SetBackground(true)
	}
	if req.Sparse {
		indexOptions.SetSparse(true)
	}

	// 创建索引模型
	indexModel := mongo.IndexModel{
		Keys:    req.Key,
		Options: indexOptions,
	}

	// 创建索引
	indexName, err := collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Index created successfully",
		"index_name": indexName,
	})
}

// deleteIndex 删除索引
func (s *Server) deleteIndex(c *gin.Context) {
	indexName := c.Param("name")
	if indexName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Index name is required"})
		return
	}

	// 防止删除_id索引
	if indexName == "_id_" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete _id index"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := s.db.Collection("logs")

	// 删除索引
	_, err := collection.Indexes().DropOne(ctx, indexName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Index deleted successfully",
		"index_name": indexName,
	})
}

// getIndexStats 获取索引统计信息
func (s *Server) getIndexStats(c *gin.Context) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	collection := s.db.Collection("logs")

	// 获取集合统计信息
	result := collection.Database().RunCommand(ctx, bson.D{
		{Key: "collStats", Value: "logs"},
	})

	var statsDoc bson.M
	if err := result.Decode(&statsDoc); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 解析统计信息
	var stats IndexStats

	if count, ok := statsDoc["count"].(int32); ok {
		stats.DocumentCount = int64(count)
	}
	if size, ok := statsDoc["size"].(int32); ok {
		stats.CollectionSize = int64(size)
	} else if size, ok := statsDoc["size"].(int64); ok {
		stats.CollectionSize = size
	}
	if totalIndexSize, ok := statsDoc["totalIndexSize"].(int32); ok {
		stats.TotalIndexSize = int64(totalIndexSize)
	} else if totalIndexSize, ok := statsDoc["totalIndexSize"].(int64); ok {
		stats.TotalIndexSize = totalIndexSize
	}
	if avgObjSize, ok := statsDoc["avgObjSize"].(float64); ok {
		stats.AvgObjSize = avgObjSize
	}

	// 计算索引数量
	if indexSizes, ok := statsDoc["indexSizes"].(bson.M); ok {
		stats.TotalIndexes = len(indexSizes)
	}

	c.JSON(http.StatusOK, stats)
}
