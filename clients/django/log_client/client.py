#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Django Log Service Client
封装 gRPC 客户端，提供简化的日志写入功能
"""

import grpc
import time
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from django.conf import settings

# 导入生成的 protobuf 类
import log_service_pb2
import log_service_pb2_grpc


class DjangoLogServiceClient:
    """Django 日志服务客户端 - 线程安全的单例"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DjangoLogServiceClient, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.server_address = getattr(settings, 'LOG_SERVICE_GRPC_SERVER', 'localhost:50051')
            self.channel = None
            self.stub = None
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
    
    def disconnect(self):
        """断开连接"""
        if self.channel:
            self.channel.close()
            print("Disconnected from log service")
    
    def write_log(self, message: str, **kwargs) -> Dict[str, Any]:
        """
        写入日志的封装函数
        
        Args:
            message (str): 日志消息
            **kwargs: 其他参数，其中：
                - service_name, level, trace_id, span_id 会作为 gRPC 参数
                - 其他所有参数会放入 metadata
        
        Returns:
            Dict[str, Any]: 写入结果
        """
        
        # 提取特定的 gRPC 参数
        service_name = kwargs.pop('service_name', 'django-service')
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


# 全局客户端实例
_log_client = None
_client_lock = threading.Lock()


def get_log_client() -> DjangoLogServiceClient:
    """获取日志客户端实例（线程安全）"""
    global _log_client
    if _log_client is None:
        with _client_lock:
            if _log_client is None:
                _log_client = DjangoLogServiceClient()
    return _log_client


def write_log(message: str, **kwargs) -> Dict[str, Any]:
    """
    便捷的日志写入函数
    
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
    return client.write_log(message, **kwargs)
