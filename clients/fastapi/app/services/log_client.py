#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI 异步 gRPC 日志服务客户端
支持 async/await 异步调用
"""

import asyncio
import grpc
import time
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor

# 导入生成的 protobuf 类
import log_service_pb2
import log_service_pb2_grpc


class AsyncLogServiceClient:
    """异步日志服务客户端 - 线程安全的单例"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, server_address: str = "localhost:50051"):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(AsyncLogServiceClient, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, server_address: str = "localhost:50051"):
        if not self._initialized:
            self.server_address = server_address
            self.channel = None
            self.stub = None
            self.executor = ThreadPoolExecutor(max_workers=20)
            self._connect()
            self._initialized = True
    
    def _connect(self):
        """连接到 gRPC 服务器"""
        try:
            self.channel = grpc.insecure_channel(self.server_address)
            self.stub = log_service_pb2_grpc.LogServiceStub(self.channel)
            print(f"Connected to log service at {self.server_address}")
        except Exception as e:
            print(f"Failed to connect to log service: {e}")
            raise
    
    async def disconnect(self):
        """断开连接"""
        if self.channel:
            self.channel.close()
            print("Disconnected from log service")
        if self.executor:
            self.executor.shutdown(wait=True)
    
    def _sync_write_log(self, message: str, **kwargs) -> Dict[str, Any]:
        """同步写入日志的内部方法"""
        # 提取特定的 gRPC 参数
        service_name = kwargs.pop('service_name', 'fastapi-service')
        level = kwargs.pop('level', log_service_pb2.LogLevel.INFO)
        trace_id = kwargs.pop('trace_id', '')
        span_id = kwargs.pop('span_id', '')
        
        # 剩余的所有参数作为 metadata
        metadata = {str(k): str(v) for k, v in kwargs.items()}
        
        # 如果 level 是字符串，转换为对应的枚举值
        if isinstance(level, str):
            level_map = {
                'DEBUG': log_service_pb2.LogLevel.DEBUG,
                'INFO': log_service_pb2.LogLevel.INFO,
                'WARN': log_service_pb2.LogLevel.WARN,
                'ERROR': log_service_pb2.LogLevel.ERROR,
                'FATAL': log_service_pb2.LogLevel.FATAL,
            }
            level = level_map.get(level.upper(), log_service_pb2.LogLevel.INFO)
        
        log_entry = log_service_pb2.LogEntry(
            service_name=service_name,
            level=level,
            message=message,
            timestamp=datetime.now(timezone.utc).isoformat(),
            metadata=metadata,
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
        except Exception as e:
            return {
                "success": False,
                "log_id": "",
                "error_message": f"Error: {str(e)}"
            }
    
    async def write_log(self, message: str, **kwargs) -> Dict[str, Any]:
        """
        异步写入日志的封装函数
        
        Args:
            message (str): 日志消息
            **kwargs: 其他参数，其中：
                - service_name, level, trace_id, span_id 会作为 gRPC 参数
                - 其他所有参数会放入 metadata
        
        Returns:
            Dict[str, Any]: 写入结果
        """
        loop = asyncio.get_event_loop()
        
        # 在线程池中执行同步的 gRPC 调用
        # 使用 functools.partial 来传递 kwargs
        import functools
        func = functools.partial(self._sync_write_log, message, **kwargs)
        return await loop.run_in_executor(self.executor, func)
    
    async def batch_write_logs(self, log_entries: list) -> Dict[str, Any]:
        """
        异步批量写入日志
        
        Args:
            log_entries: 日志条目列表，每个条目包含 message 和其他参数
        
        Returns:
            Dict[str, Any]: 批量写入结果
        """
        results = []
        
        # 创建异步任务列表
        tasks = []
        for entry in log_entries:
            message = entry.pop('message', '')
            task = self.write_log(message, **entry)
            tasks.append(task)
        
        # 并发执行所有任务
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 统计结果
        success_count = 0
        error_count = 0
        errors = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                error_count += 1
                errors.append(f"Entry {i}: {str(result)}")
            elif isinstance(result, dict) and result.get('success'):
                success_count += 1
            else:
                error_count += 1
                errors.append(f"Entry {i}: {result.get('error_message', 'Unknown error')}")
        
        return {
            "total_count": len(log_entries),
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors[:5],  # 只返回前5个错误
            "results": [r for r in results if not isinstance(r, Exception)][:10]  # 前10个成功结果
        }


# 全局客户端实例
_log_client = None
_client_lock = threading.Lock()


def get_log_client(server_address: str = "localhost:50051") -> AsyncLogServiceClient:
    """获取异步日志客户端实例（线程安全）"""
    global _log_client
    if _log_client is None:
        with _client_lock:
            if _log_client is None:
                _log_client = AsyncLogServiceClient(server_address)
    return _log_client


async def write_log(message: str, **kwargs) -> Dict[str, Any]:
    """
    便捷的异步日志写入函数
    
    Args:
        message (str): 日志消息
        **kwargs: 其他参数，包括：
            - service_name: 服务名称
            - level: 日志级别 ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')
            - trace_id: 追踪ID
            - span_id: 跨度ID
            - 其他任意参数会作为 metadata
    
    Returns:
        Dict[str, Any]: 写入结果
    """
    client = get_log_client()
    return await client.write_log(message, **kwargs)


async def batch_write_logs(log_entries: list) -> Dict[str, Any]:
    """
    便捷的异步批量日志写入函数
    
    Args:
        log_entries: 日志条目列表
    
    Returns:
        Dict[str, Any]: 批量写入结果
    """
    client = get_log_client()
    return await client.batch_write_logs(log_entries)
