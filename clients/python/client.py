#!/usr/bin/env python3
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Log Service gRPC客户端
"""
import grpc
import time
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any

# 导入生成的 protobuf 类
import log_service_pb2
import log_service_pb2_grpc


class LogServiceClient:
    """日志服务客户端"""
    
    def __init__(self, server_address: str = "localhost:50051"):
        self.server_address = server_address
        self.channel = None
        self.stub = None
    
    def connect(self):
        """连接到gRPC服务器"""
        self.channel = grpc.insecure_channel(self.server_address)
        self.stub = log_service_pb2_grpc.LogServiceStub(self.channel)
        print(f"Connected to log service at {self.server_address}")
    
    def disconnect(self):
        """断开连接"""
        if self.channel:
            self.channel.close()
            print("Disconnected from log service")
    
    def write_log(self, service_name: str, level: log_service_pb2.LogLevel, 
                  message: str, metadata: Dict[str, str] = None, 
                  trace_id: str = "", span_id: str = "") -> Dict[str, Any]:
        """写入单条日志"""
        
        log_entry = log_service_pb2.LogEntry(
            service_name=service_name,
            level=level,
            message=message,
            timestamp=datetime.now(timezone.utc).isoformat(),
            metadata=metadata or {},
            trace_id=trace_id,
            span_id=span_id
        )
        
        request = log_service_pb2.WriteLogRequest(log_entry=log_entry)
        
        try:
            response = self.stub.WriteLog(request)
            return {
                "success": response.success,
                "log_id": response.log_id,
                "error_message": response.error_message
            }
        except grpc.RpcError as e:
            return {
                "success": False,
                "log_id": "",
                "error_message": f"gRPC error: {e.details()}"
            }
    
    def batch_write_log(self, log_entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """批量写入日志"""
        
        entries = []
        for entry_data in log_entries:
            log_entry = log_service_pb2.LogEntry(
                service_name=entry_data.get("service_name", ""),
                level=entry_data.get("level", log_service_pb2.LogLevel.INFO),
                message=entry_data.get("message", ""),
                timestamp=entry_data.get("timestamp", datetime.now(timezone.utc).isoformat()),
                metadata=entry_data.get("metadata", {}),
                trace_id=entry_data.get("trace_id", ""),
                span_id=entry_data.get("span_id", "")
            )
            entries.append(log_entry)
        
        request = log_service_pb2.BatchWriteLogRequest(log_entries=entries)
        
        try:
            response = self.stub.BatchWriteLog(request)
            return {
                "success": response.success,
                "log_ids": list(response.log_ids),
                "error_message": response.error_message
            }
        except grpc.RpcError as e:
            return {
                "success": False,
                "log_ids": [],
                "error_message": f"gRPC error: {e.details()}"
            }
    
    def query_log(self, service_name: str = "", level: log_service_pb2.LogLevel = None,
                  start_time: str = "", end_time: str = "", 
                  metadata_filters: Dict[str, str] = None, trace_id: str = "",
                  limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """查询日志"""
        
        request = log_service_pb2.QueryLogRequest(
            service_name=service_name,
            start_time=start_time,
            end_time=end_time,
            metadata_filters=metadata_filters or {},
            trace_id=trace_id,
            limit=limit,
            offset=offset
        )
        
        # 如果指定了level，则设置
        if level is not None:
            request.level = level
        
        try:
            response = self.stub.QueryLog(request)
            
            logs = []
            for log_entry in response.logs:
                logs.append({
                    "id": log_entry.id,
                    "service_name": log_entry.service_name,
                    "level": log_service_pb2.LogLevel.Name(log_entry.level),
                    "message": log_entry.message,
                    "timestamp": log_entry.timestamp,
                    "metadata": dict(log_entry.metadata),
                    "trace_id": log_entry.trace_id,
                    "span_id": log_entry.span_id
                })
            
            return {
                "success": response.success,
                "logs": logs,
                "total_count": response.total_count,
                "error_message": response.error_message
            }
        except grpc.RpcError as e:
            return {
                "success": False,
                "logs": [],
                "total_count": 0,
                "error_message": f"gRPC error: {e.details()}"
            }


def main():
    """主测试函数"""
    
    # 创建客户端
    client = LogServiceClient()
    
    try:
        # 连接服务器
        client.connect()
        
        print("=== Python gRPC 客户端测试 ===\n")
        
        # 测试1: 写入单条日志
        print("1. 测试写入单条日志")
        result = client.write_log(
            service_name="python-test-service",
            level=log_service_pb2.LogLevel.INFO,
            message="这是来自Python客户端的测试日志",
            metadata={
                "client": "python",
                "version": "1.0.0",
                "user_id": "12345"
            },
            trace_id="python-trace-001",
            span_id="python-span-001"
        )
        print(f"结果: {result}")
        print()
        
        # 测试2: 批量写入日志
        print("2. 测试批量写入日志")
        batch_entries = [
            {
                "service_name": "python-batch-service",
                "level": log_service_pb2.LogLevel.DEBUG,
                "message": f"批量日志消息 {i+1}",
                "metadata": {
                    "batch_id": "batch-001",
                    "sequence": str(i+1)
                },
                "trace_id": f"batch-trace-{i+1:03d}"
            }
            for i in range(5)
        ]
        
        batch_result = client.batch_write_log(batch_entries)
        print(f"批量写入结果: {batch_result}")
        print()
        
        # 等待日志被持久化
        print("等待日志被持久化...")
        time.sleep(10)
        
        # 测试3: 查询日志 - 按服务名
        print("3. 测试查询日志 - 按服务名")
        query_result = client.query_log(
            service_name="python-test-service",
            limit=10
        )
        print(f"查询结果: 找到 {query_result.get('total_count', 0)} 条日志")
        for i, log in enumerate(query_result.get('logs', [])[:3]):  # 只显示前3条
            print(f"  日志 {i+1}: [{log['level']}] {log['service_name']} - {log['message']}")
        print()
        
        # 测试4: 查询日志 - 按trace_id
        print("4. 测试查询日志 - 按trace_id")
        trace_query_result = client.query_log(
            trace_id="python-trace-001"
        )
        print(f"Trace查询结果: 找到 {trace_query_result.get('total_count', 0)} 条日志")
        for log in trace_query_result.get('logs', []):
            print(f"  Trace日志: [{log['level']}] {log['service_name']} - {log['message']}")
        print()
        
        # 测试5: 查询日志 - 按日志级别
        print("5. 测试查询日志 - 按日志级别")
        level_query_result = client.query_log(
            level=log_service_pb2.LogLevel.DEBUG,
            limit=5
        )
        print(f"级别查询结果: 找到 {level_query_result.get('total_count', 0)} 条DEBUG级别日志")
        for log in level_query_result.get('logs', []):
            print(f"  DEBUG日志: {log['service_name']} - {log['message']}")
        print()
        
        # 测试6: 性能测试
        print("6. 简单性能测试")
        start_time = time.time()
        
        success_count = 0
        test_count = 50
        
        for i in range(test_count):
            result = client.write_log(
                service_name="python-perf-test",
                level=log_service_pb2.LogLevel.INFO,
                message=f"性能测试日志 {i+1}",
                metadata={"test": "performance", "sequence": str(i+1)}
            )
            if result.get("success"):
                success_count += 1
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"性能测试结果:")
        print(f"  写入 {success_count}/{test_count} 条日志")
        print(f"  耗时: {duration:.3f} 秒")
        print(f"  平均速度: {success_count/duration:.2f} logs/second")
        
    except Exception as e:
        print(f"测试过程中发生错误: {e}")
    
    finally:
        # 断开连接
        client.disconnect()


if __name__ == "__main__":
    main()
