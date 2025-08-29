package service

import (
	"context"
	"fmt"
	"time"

	"log-service/internal/queue"
	"log-service/internal/storage"
	pb "log-service/proto"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// LogService gRPC服务实现
type LogService struct {
	pb.UnimplementedLogServiceServer
	storage  *storage.MongoDB
	logQueue *queue.LogQueue
}

// NewLogService 创建日志服务实例
func NewLogService(storage *storage.MongoDB, logQueue *queue.LogQueue) *LogService {
	return &LogService{
		storage:  storage,
		logQueue: logQueue,
	}
}

// WriteLog 写入单条日志
func (s *LogService) WriteLog(ctx context.Context, req *pb.WriteLogRequest) (*pb.WriteLogResponse, error) {
	if req.LogEntry == nil {
		return &pb.WriteLogResponse{
			Success:      false,
			ErrorMessage: "log entry is required",
		}, status.Error(codes.InvalidArgument, "log entry is required")
	}

	// 转换为存储格式
	logDoc, err := s.convertToLogDocument(req.LogEntry)
	if err != nil {
		return &pb.WriteLogResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, status.Error(codes.InvalidArgument, err.Error())
	}

	// 非阻塞写入队列
	if !s.logQueue.EnqueueLog(logDoc) {
		return &pb.WriteLogResponse{
			Success:      false,
			ErrorMessage: "log queue is full",
		}, status.Error(codes.ResourceExhausted, "log queue is full")
	}

	return &pb.WriteLogResponse{
		Success: true,
		LogId:   fmt.Sprintf("queued-%d", time.Now().UnixNano()),
	}, nil
}

// BatchWriteLog 批量写入日志
func (s *LogService) BatchWriteLog(ctx context.Context, req *pb.BatchWriteLogRequest) (*pb.BatchWriteLogResponse, error) {
	if len(req.LogEntries) == 0 {
		return &pb.BatchWriteLogResponse{
			Success:      false,
			ErrorMessage: "at least one log entry is required",
		}, status.Error(codes.InvalidArgument, "at least one log entry is required")
	}

	logIds := make([]string, 0, len(req.LogEntries))
	failedCount := 0

	for _, entry := range req.LogEntries {
		logDoc, err := s.convertToLogDocument(entry)
		if err != nil {
			failedCount++
			continue
		}

		if s.logQueue.EnqueueLog(logDoc) {
			logIds = append(logIds, fmt.Sprintf("queued-%d", time.Now().UnixNano()))
		} else {
			failedCount++
		}
	}

	if failedCount > 0 {
		return &pb.BatchWriteLogResponse{
			Success:      false,
			ErrorMessage: fmt.Sprintf("%d logs failed to enqueue", failedCount),
			LogIds:       logIds,
		}, nil
	}

	return &pb.BatchWriteLogResponse{
		Success: true,
		LogIds:  logIds,
	}, nil
}

// QueryLog 查询日志
func (s *LogService) QueryLog(ctx context.Context, req *pb.QueryLogRequest) (*pb.QueryLogResponse, error) {
	// 构建查询过滤器
	filter := &storage.QueryLogFilter{
		ServiceName:     req.ServiceName,
		MetadataFilters: req.MetadataFilters,
		TraceID:         req.TraceId,
		Limit:           req.Limit,
		Offset:          req.Offset,
	}

	// 处理日志级别
	if req.Level != pb.LogLevel_DEBUG || req.ServiceName != "" {
		level := int32(req.Level)
		filter.Level = &level
	}

	// 处理时间范围
	if req.StartTime != "" {
		if startTime, err := time.Parse(time.RFC3339, req.StartTime); err == nil {
			filter.StartTime = &startTime
		}
	}

	if req.EndTime != "" {
		if endTime, err := time.Parse(time.RFC3339, req.EndTime); err == nil {
			filter.EndTime = &endTime
		}
	}

	// 执行查询
	logs, totalCount, err := s.storage.QueryLogs(ctx, filter)
	if err != nil {
		return &pb.QueryLogResponse{
			Success:      false,
			ErrorMessage: err.Error(),
		}, status.Error(codes.Internal, err.Error())
	}

	// 转换为protobuf格式
	pbLogs := make([]*pb.LogEntry, len(logs))
	for i, log := range logs {
		pbLogs[i] = s.convertToLogEntry(log)
	}

	return &pb.QueryLogResponse{
		Logs:       pbLogs,
		TotalCount: int32(totalCount),
		Success:    true,
	}, nil
}

// convertToLogDocument 转换为队列文档格式
func (s *LogService) convertToLogDocument(entry *pb.LogEntry) (*queue.LogDocument, error) {
	timestamp, err := time.Parse(time.RFC3339, entry.Timestamp)
	if err != nil {
		timestamp = time.Now()
	}

	return &queue.LogDocument{
		ServiceName: entry.ServiceName,
		Level:       int32(entry.Level),
		Message:     entry.Message,
		Timestamp:   timestamp,
		Metadata:    entry.Metadata,
		TraceID:     entry.TraceId,
		SpanID:      entry.SpanId,
	}, nil
}

// convertToLogEntry 转换为protobuf格式
func (s *LogService) convertToLogEntry(doc *storage.LogDocument) *pb.LogEntry {
	return &pb.LogEntry{
		Id:          doc.ID.Hex(),                       // 系统自动生成的唯一标识符，写入时不需要设置
		ServiceName: doc.ServiceName,                    //产生日志的服务名称，用于服务间日志隔离
		Level:       pb.LogLevel(doc.Level),             //日志级别，从DEBUG到FATAL，可用于过滤不同重要程度的日志
		Message:     doc.Message,                        //实际的日志内容
		Timestamp:   doc.Timestamp.Format(time.RFC3339), //日志产生时间，使用RFC3339格式（如：2024-01-01T12:00:00Z）
		Metadata:    doc.Metadata,                       //自定义键值对，可存储额外信息如用户ID、请求ID等
		TraceId:     doc.TraceID,                        //分布式链路追踪ID，用于跟踪请求在多个服务间的流转
		SpanId:      doc.SpanID,                         //Span标识符，配合trace_id使用
	}
}
