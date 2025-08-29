/**
 * TypeScript gRPC 客户端测试示例
 * 用于测试日志服务的写入和查询功能
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

// 定义接口类型
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

interface WriteLogRequest {
  log_entry: LogEntry;
}

interface WriteLogResponse {
  success: boolean;
  error_message?: string;
  log_id?: string;
}

interface BatchWriteLogRequest {
  log_entries: LogEntry[];
}

interface BatchWriteLogResponse {
  success: boolean;
  error_message?: string;
  log_ids?: string[];
}

interface QueryLogRequest {
  service_name?: string;
  level?: LogLevel;
  start_time?: string;
  end_time?: string;
  metadata_filters?: Record<string, string>;
  trace_id?: string;
  limit?: number;
  offset?: number;
}

interface QueryLogResponse {
  logs: LogEntry[];
  total_count: number;
  success: boolean;
  error_message?: string;
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// gRPC 服务接口
interface LogServiceClient {
  WriteLog(request: WriteLogRequest, callback: (error: grpc.ServiceError | null, response?: WriteLogResponse) => void): grpc.ClientUnaryCall;
  WriteLog(request: WriteLogRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response?: WriteLogResponse) => void): grpc.ClientUnaryCall;
  WriteLog(request: WriteLogRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response?: WriteLogResponse) => void): grpc.ClientUnaryCall;
  
  BatchWriteLog(request: BatchWriteLogRequest, callback: (error: grpc.ServiceError | null, response?: BatchWriteLogResponse) => void): grpc.ClientUnaryCall;
  BatchWriteLog(request: BatchWriteLogRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response?: BatchWriteLogResponse) => void): grpc.ClientUnaryCall;
  BatchWriteLog(request: BatchWriteLogRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response?: BatchWriteLogResponse) => void): grpc.ClientUnaryCall;
  
  QueryLog(request: QueryLogRequest, callback: (error: grpc.ServiceError | null, response?: QueryLogResponse) => void): grpc.ClientUnaryCall;
  QueryLog(request: QueryLogRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response?: QueryLogResponse) => void): grpc.ClientUnaryCall;
  QueryLog(request: QueryLogRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response?: QueryLogResponse) => void): grpc.ClientUnaryCall;
}

class LogServiceTestClient {
  private client: LogServiceClient;
  private serverAddress: string;

  constructor(serverAddress: string = 'localhost:50051') {
    this.serverAddress = serverAddress;
    
    // 加载 proto 文件
    const PROTO_PATH = path.join(__dirname, '../../../proto/log_service.proto');
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
    const LogService = protoDescriptor.logservice.LogService;

    // 创建客户端
    this.client = new LogService(serverAddress, grpc.credentials.createInsecure()) as LogServiceClient;
    
    console.log(`Connected to log service at ${serverAddress}`);
  }

  /**
   * 写入单条日志
   */
  writeLog(logEntry: Omit<LogEntry, 'timestamp'> & { timestamp?: string }): Promise<WriteLogResponse> {
    return new Promise((resolve, reject) => {
      const request: WriteLogRequest = {
        log_entry: {
          ...logEntry,
          timestamp: logEntry.timestamp || new Date().toISOString(),
          metadata: logEntry.metadata || {},
          trace_id: logEntry.trace_id || '',
          span_id: logEntry.span_id || ''
        }
      };

      this.client.WriteLog(request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response!);
        }
      });
    });
  }

  /**
   * 批量写入日志
   */
  batchWriteLog(logEntries: Array<Omit<LogEntry, 'timestamp'> & { timestamp?: string }>): Promise<BatchWriteLogResponse> {
    return new Promise((resolve, reject) => {
      const entries: LogEntry[] = logEntries.map(entry => ({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
        metadata: entry.metadata || {},
        trace_id: entry.trace_id || '',
        span_id: entry.span_id || ''
      }));

      const request: BatchWriteLogRequest = {
        log_entries: entries
      };

      this.client.BatchWriteLog(request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response!);
        }
      });
    });
  }

  /**
   * 查询日志
   */
  queryLog(options: {
    serviceName?: string;
    level?: LogLevel;
    startTime?: string;
    endTime?: string;
    metadataFilters?: Record<string, string>;
    traceId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<QueryLogResponse> {
    return new Promise((resolve, reject) => {
      const request: QueryLogRequest = {
        service_name: options.serviceName || '',
        level: options.level,
        start_time: options.startTime || '',
        end_time: options.endTime || '',
        metadata_filters: options.metadataFilters || {},
        trace_id: options.traceId || '',
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      this.client.QueryLog(request, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response!);
        }
      });
    });
  }

  /**
   * 关闭连接
   */
  close(): void {
    // gRPC 客户端会自动管理连接
    console.log('Client connection closed');
  }
}

// 工具函数
function getLogLevelName(level: LogLevel): string {
  return LogLevel[level] || 'UNKNOWN';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主测试函数
async function main(): Promise<void> {
  const client = new LogServiceTestClient();

  try {
    console.log('=== TypeScript gRPC 客户端测试 ===\n');

    // 测试1: 写入单条日志
    console.log('1. 测试写入单条日志');
    const writeResult = await client.writeLog({
      service_name: 'typescript-test-service',
      level: LogLevel.INFO,
      message: '这是来自TypeScript客户端的测试日志',
      metadata: {
        client: 'typescript',
        version: '1.0.0',
        user_id: '67890'
      },
      trace_id: 'typescript-trace-001',
      span_id: 'typescript-span-001'
    });
    console.log(`结果:`, writeResult);
    console.log();

    // 测试2: 批量写入日志
    console.log('2. 测试批量写入日志');
    const batchEntries = Array.from({ length: 5 }, (_, i) => ({
      service_name: 'typescript-batch-service',
      level: LogLevel.DEBUG,
      message: `批量日志消息 ${i + 1}`,
      metadata: {
        batch_id: 'batch-002',
        sequence: String(i + 1)
      },
      trace_id: `batch-trace-${String(i + 1).padStart(3, '0')}`
    }));

    const batchResult = await client.batchWriteLog(batchEntries);
    console.log(`批量写入结果:`, batchResult);
    console.log();

    // 等待日志被持久化
    console.log('等待日志被持久化...');
    await sleep(10000);

    // 测试3: 查询日志 - 按服务名
    console.log('3. 测试查询日志 - 按服务名');
    const queryResult = await client.queryLog({
      serviceName: 'typescript-test-service',
      limit: 10
    });
    console.log(`查询结果: 找到 ${queryResult.total_count} 条日志`);
    queryResult.logs.slice(0, 3).forEach((log, i) => {
      console.log(`  日志 ${i + 1}: [${getLogLevelName(log.level)}] ${log.service_name} - ${log.message}`);
    });
    console.log();

    // 测试4: 查询日志 - 按trace_id
    console.log('4. 测试查询日志 - 按trace_id');
    const traceQueryResult = await client.queryLog({
      traceId: 'typescript-trace-001'
    });
    console.log(`Trace查询结果: 找到 ${traceQueryResult.total_count} 条日志`);
    traceQueryResult.logs.forEach(log => {
      console.log(`  Trace日志: [${getLogLevelName(log.level)}] ${log.service_name} - ${log.message}`);
    });
    console.log();

    // 测试5: 查询日志 - 按日志级别
    console.log('5. 测试查询日志 - 按日志级别');
    const levelQueryResult = await client.queryLog({
      level: LogLevel.DEBUG,
      limit: 5
    });
    console.log(`级别查询结果: 找到 ${levelQueryResult.total_count} 条DEBUG级别日志`);
    levelQueryResult.logs.forEach(log => {
      console.log(`  DEBUG日志: ${log.service_name} - ${log.message}`);
    });
    console.log();

    // 测试6: 性能测试
    console.log('6. 简单性能测试');
    const startTime = Date.now();
    const testCount = 50;
    let successCount = 0;

    const performancePromises = Array.from({ length: testCount }, async (_, i) => {
      try {
        const result = await client.writeLog({
          service_name: 'typescript-perf-test',
          level: LogLevel.INFO,
          message: `性能测试日志 ${i + 1}`,
          metadata: {
            test: 'performance',
            sequence: String(i + 1)
          }
        });
        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`性能测试日志 ${i + 1} 失败:`, error);
      }
    });

    await Promise.all(performancePromises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`性能测试结果:`);
    console.log(`  写入 ${successCount}/${testCount} 条日志`);
    console.log(`  耗时: ${duration.toFixed(3)} 秒`);
    console.log(`  平均速度: ${(successCount / duration).toFixed(2)} logs/second`);

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    client.close();
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

export { LogServiceTestClient, LogLevel, LogEntry };
