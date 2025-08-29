/**
 * TypeScript gRPC 客户端测试示例
 * 用于测试日志服务的写入和查询功能
 */
interface LogEntry {
    id?: string;
    service_name: string;
    level: LogLevel;
    message: string;
    timestamp: string;
    metadata?: Record<string, string>;
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
declare class LogServiceTestClient {
    private client;
    private serverAddress;
    constructor(serverAddress?: string);
    /**
     * 写入单条日志
     */
    writeLog(logEntry: Omit<LogEntry, 'timestamp'> & {
        timestamp?: string;
    }): Promise<WriteLogResponse>;
    /**
     * 批量写入日志
     */
    batchWriteLog(logEntries: Array<Omit<LogEntry, 'timestamp'> & {
        timestamp?: string;
    }>): Promise<BatchWriteLogResponse>;
    /**
     * 查询日志
     */
    queryLog(options?: {
        serviceName?: string;
        level?: LogLevel;
        startTime?: string;
        endTime?: string;
        metadataFilters?: Record<string, string>;
        traceId?: string;
        limit?: number;
        offset?: number;
    }): Promise<QueryLogResponse>;
    /**
     * 关闭连接
     */
    close(): void;
}
export { LogServiceTestClient, LogLevel, LogEntry };
//# sourceMappingURL=client.d.ts.map