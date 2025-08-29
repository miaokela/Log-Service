package main

import (
	"context"
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
	Level       string             `json:"level" bson:"level"`
	Message     string             `json:"message" bson:"message"`
	Timestamp   time.Time          `json:"timestamp" bson:"timestamp"`
	Metadata    map[string]string  `json:"metadata" bson:"metadata"`
	TraceID     string             `json:"trace_id" bson:"trace_id"`
	SpanID      string             `json:"span_id" bson:"span_id"`
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

	if logs == nil {
		logs = []LogEntry{}
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":   logs,
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

// getStats 获取统计信息
func (s *Server) getStats(c *gin.Context) {
	collection := s.db.Collection("logs")
	ctx := context.Background()

	// 总日志数
	total, _ := collection.CountDocuments(ctx, bson.M{})

	// 按级别统计
	pipeline := []bson.M{
		{"$group": bson.M{
			"_id":   "$level",
			"count": bson.M{"$sum": 1},
		}},
	}
	cursor, _ := collection.Aggregate(ctx, pipeline)
	var levelStats []bson.M
	cursor.All(ctx, &levelStats)
	cursor.Close(ctx)

	logsByLevel := make(map[string]int64)
	for _, stat := range levelStats {
		level := stat["_id"].(string)
		count := stat["count"].(int32)
		logsByLevel[level] = int64(count)
	}

	// 按服务统计
	pipeline = []bson.M{
		{"$group": bson.M{
			"_id":   "$service_name",
			"count": bson.M{"$sum": 1},
		}},
	}
	cursor, _ = collection.Aggregate(ctx, pipeline)
	var serviceStats []bson.M
	cursor.All(ctx, &serviceStats)
	cursor.Close(ctx)

	logsByService := make(map[string]int64)
	for _, stat := range serviceStats {
		service := stat["_id"].(string)
		count := stat["count"].(int32)
		logsByService[service] = int64(count)
	}

	// 最近24小时
	yesterday := time.Now().Add(-24 * time.Hour)
	recent24h, _ := collection.CountDocuments(ctx, bson.M{
		"timestamp": bson.M{"$gte": yesterday},
	})

	stats := StatsResponse{
		TotalLogs:     total,
		LogsByLevel:   logsByLevel,
		LogsByService: logsByService,
		Recent24h:     recent24h,
	}

	c.JSON(http.StatusOK, stats)
}
