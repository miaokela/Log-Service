/**
 * 简化版 TypeScript gRPC 客户端
 * 使用 @grpc/proto-loader 动态加载 proto 文件
 */
interface LogEntry {
    id?: string;
    service_name: string;
    level: number;
    message: string;
    timestamp: string;
    metadata?: {
        [key: string]: string;
    };
    trace_id?: string;
    span_id?: string;
}
interface WriteLogResponse {
    success: boolean;
    error_message?: string;
    log_id?: string;
}
interface BatchWriteLogResponse {
    success: boolean;
    error_message?: string;
    log_ids?: string[];
}
interface QueryLogResponse {
    logs: LogEntry[];
    total_count: number;
    success: boolean;
    error_message?: string;
}
declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}
declare class SimpleLogServiceClient {
    private client;
    private serverAddress;
    constructor(serverAddress?: string);
    private initializeClient;
    /**
     * 写入单条日志
     */
    writeLog(logData: {
        serviceName: string;
        level: LogLevel;
        message: string;
        metadata?: {
            [key: string]: string;
        };
        traceId?: string;
        spanId?: string;
    }): Promise<WriteLogResponse>;
    /**
     * 批量写入日志
     */
    batchWriteLog(logEntries: Array<{
        serviceName: string;
        level: LogLevel;
        message: string;
        metadata?: {
            [key: string]: string;
        };
        traceId?: string;
        spanId?: string;
    }>): Promise<BatchWriteLogResponse>;
    /**
     * 查询日志
     */
    queryLog(options?: {
        serviceName?: string;
        level?: LogLevel;
        startTime?: string;
        endTime?: string;
        metadataFilters?: {
            [key: string]: string;
        };
        traceId?: string;
        limit?: number;
        offset?: number;
    }): Promise<QueryLogResponse>;
    /**
     * 关闭连接
     */
    close(): void;
}
export { SimpleLogServiceClient, LogLevel };
//# sourceMappingURL=simple-client.d.ts.map