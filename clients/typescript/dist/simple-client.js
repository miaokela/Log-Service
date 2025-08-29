"use strict";
/**
 * 简化版 TypeScript gRPC 客户端
 * 使用 @grpc/proto-loader 动态加载 proto 文件
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.SimpleLogServiceClient = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path = __importStar(require("path"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 4] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class SimpleLogServiceClient {
    constructor(serverAddress = 'localhost:50051') {
        this.serverAddress = serverAddress;
        this.initializeClient();
    }
    initializeClient() {
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
        const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
        const LogService = protoDescriptor.logservice.LogService;
        // 创建客户端
        this.client = new LogService(this.serverAddress, grpc.credentials.createInsecure());
        console.log(`Connected to log service at ${this.serverAddress}`);
    }
    /**
     * 写入单条日志
     */
    async writeLog(logData) {
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
            this.client.WriteLog(request, (error, response) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    /**
     * 批量写入日志
     */
    async batchWriteLog(logEntries) {
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
            this.client.BatchWriteLog(request, (error, response) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    /**
     * 查询日志
     */
    async queryLog(options = {}) {
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
            this.client.QueryLog(request, (error, response) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(response);
                }
            });
        });
    }
    /**
     * 关闭连接
     */
    close() {
        console.log('Client connection closed');
    }
}
exports.SimpleLogServiceClient = SimpleLogServiceClient;
// 工具函数
function getLogLevelName(level) {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return levelNames[level] || 'UNKNOWN';
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// 主测试函数
async function main() {
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
            }
            catch (error) {
                console.error(`性能测试日志 ${i + 1} 失败:`, error);
            }
        }
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        console.log(`性能测试结果:`);
        console.log(`  写入 ${successCount}/${testCount} 条日志`);
        console.log(`  耗时: ${duration.toFixed(3)} 秒`);
        console.log(`  平均速度: ${(successCount / duration).toFixed(2)} logs/second`);
    }
    catch (error) {
        console.error('测试过程中发生错误:', error);
    }
    finally {
        client.close();
    }
}
// 运行主函数
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=simple-client.js.map