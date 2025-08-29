/**
 * 简化版 TypeScript gRPC 客户端
 * 使用 @grpc/proto-loader 动态加载 proto 文件
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

// 定义接口类型
interface LogEntry {
  id?: string;
  service_name: string;
  level: number;
  message: string;
  timestamp: string;
  metadata?: { [key: string]: string };
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

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

class SimpleLogServiceClient {
  private client: any;
  private serverAddress: string;

  constructor(serverAddress: string = 'localhost:50051') {
    this.serverAddress = serverAddress;
    this.initializeClient();
  }

  private initializeClient(): void {
    // 定义 proto 文件路径
    const PROTO_PATH = path.resolve(__dirname, '../../proto/log_service.proto');
    
    // 加载 proto 文件
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
    this.client = new LogService(this.serverAddress, grpc.credentials.createInsecure());
    
    console.log(`Connected to log service at ${this.serverAddress}`);
  }

  /**
   * 写入单条日志
   */
  async writeLog(logData: {
    serviceName: string;
    level: LogLevel;
    message: string;
    metadata?: { [key: string]: string };
    traceId?: string;
    spanId?: string;
  }): Promise<WriteLogResponse> {
    return new Promise((resolve, reject) => {
      const request = {
        log_entry: {
          service_name: logData.serviceName,
          level: logData.level,
          message: logData.message,
          timestamp: new Date().toISOString(),
          metadata: logData.metadata || {},
          trace_id: logData.traceId || '',
          span_id: logData.spanId || ''
        }
      };

      this.client.WriteLog(request, (error: grpc.ServiceError | null, response: WriteLogResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 批量写入日志
   */
  async batchWriteLog(logEntries: Array<{
    serviceName: string;
    level: LogLevel;
    message: string;
    metadata?: { [key: string]: string };
    traceId?: string;
    spanId?: string;
  }>): Promise<BatchWriteLogResponse> {
    return new Promise((resolve, reject) => {
      const entries = logEntries.map(entry => ({
        service_name: entry.serviceName,
        level: entry.level,
        message: entry.message,
        timestamp: new Date().toISOString(),
        metadata: entry.metadata || {},
        trace_id: entry.traceId || '',
        span_id: entry.spanId || ''
      }));

      const request = {
        log_entries: entries
      };

      this.client.BatchWriteLog(request, (error: grpc.ServiceError | null, response: BatchWriteLogResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 查询日志
   */
  async queryLog(options: {
    serviceName?: string;
    level?: LogLevel;
    startTime?: string;
    endTime?: string;
    metadataFilters?: { [key: string]: string };
    traceId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<QueryLogResponse> {
    return new Promise((resolve, reject) => {
      const request = {
        service_name: options.serviceName || '',
        level: options.level !== undefined ? options.level : undefined,
        start_time: options.startTime || '',
        end_time: options.endTime || '',
        metadata_filters: options.metadataFilters || {},
        trace_id: options.traceId || '',
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      this.client.QueryLog(request, (error: grpc.ServiceError | null, response: QueryLogResponse) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * 关闭连接
   */
  close(): void {
    console.log('Client connection closed');
  }
}

// 工具函数
function getLogLevelName(level: number): string {
  const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  return levelNames[level] || 'UNKNOWN';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主测试函数
async function main(): Promise<void> {
  const client = new SimpleLogServiceClient();

  try {
    console.log('=== TypeScript gRPC 客户端测试 (简化版) ===\n');

    // 测试1: 写入单条日志
    console.log('1. 测试写入单条日志');
    const writeResult = await client.writeLog({
      serviceName: 'typescript-simple-service',
      level: LogLevel.INFO,
      message: '这是来自TypeScript简化客户端的测试日志',
      metadata: {
        client: 'typescript-simple',
        version: '1.0.0',
        user_id: '99999'
      },
      traceId: 'ts-simple-trace-001',
      spanId: 'ts-simple-span-001'
    });
    console.log('结果:', writeResult);
    console.log();

    // 测试2: 批量写入日志
    console.log('2. 测试批量写入日志');
    const batchEntries = Array.from({ length: 3 }, (_, i) => ({
      serviceName: 'typescript-simple-batch',
      level: LogLevel.DEBUG,
      message: `简化批量日志消息 ${i + 1}`,
      metadata: {
        batch_id: 'simple-batch-001',
        sequence: String(i + 1)
      },
      traceId: `simple-batch-trace-${String(i + 1).padStart(3, '0')}`
    }));

    const batchResult = await client.batchWriteLog(batchEntries);
    console.log('批量写入结果:', batchResult);
    console.log();

    // 等待日志被持久化
    console.log('等待日志被持久化...');
    await sleep(8000);

    // 测试3: 查询日志 - 按服务名
    console.log('3. 测试查询日志 - 按服务名');
    const queryResult = await client.queryLog({
      serviceName: 'typescript-simple-service',
      limit: 5
    });
    console.log(`查询结果: 找到 ${queryResult.total_count} 条日志`);
    queryResult.logs.slice(0, 2).forEach((log, i) => {
      console.log(`  日志 ${i + 1}: [${getLogLevelName(log.level)}] ${log.service_name} - ${log.message}`);
    });
    console.log();

    // 测试4: 查询日志 - 按trace_id
    console.log('4. 测试查询日志 - 按trace_id');
    const traceQueryResult = await client.queryLog({
      traceId: 'ts-simple-trace-001'
    });
    console.log(`Trace查询结果: 找到 ${traceQueryResult.total_count} 条日志`);
    traceQueryResult.logs.forEach(log => {
      console.log(`  Trace日志: [${getLogLevelName(log.level)}] ${log.service_name} - ${log.message}`);
    });
    console.log();

    // 测试5: 性能测试（简化版）
    console.log('5. 简单性能测试');
    const startTime = Date.now();
    const testCount = 20;
    let successCount = 0;

    for (let i = 0; i < testCount; i++) {
      try {
        const result = await client.writeLog({
          serviceName: 'typescript-simple-perf',
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
    }

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

export { SimpleLogServiceClient, LogLevel };
