#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI Pydantic 模型定义
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class LogLevel(str, Enum):
    """日志级别枚举"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    FATAL = "FATAL"


class LogWriteRequest(BaseModel):
    """单条日志写入请求模型"""
    message: str = Field(..., description="日志消息内容", min_length=1)
    service_name: Optional[str] = Field("fastapi-service", description="服务名称")
    level: Optional[LogLevel] = Field(LogLevel.INFO, description="日志级别")
    trace_id: Optional[str] = Field("", description="追踪ID")
    span_id: Optional[str] = Field("", description="跨度ID")
    
    # 业务相关字段
    adv_id: Optional[int] = Field(None, description="广告ID")
    aweme_id: Optional[int] = Field(None, description="视频ID")
    plan_id: Optional[int] = Field(None, description="计划ID")
    monitor_type: Optional[str] = Field(None, description="监控类型")
    co_id: Optional[int] = Field(None, description="公司ID")
    
    # 额外的 metadata 字段
    metadata: Optional[Dict[str, Any]] = Field({}, description="额外的元数据")
    
    class Config:
        schema_extra = {
            "example": {
                "message": "用户点击广告事件",
                "service_name": "fastapi-ad-service",
                "level": "INFO",
                "trace_id": "trace-12345",
                "span_id": "span-67890",
                "adv_id": 1234567,
                "aweme_id": 987654321,
                "plan_id": 12345,
                "monitor_type": "click",
                "co_id": 5678,
                "metadata": {
                    "user_id": "user123",
                    "session_id": "session456"
                }
            }
        }


class BatchLogEntry(BaseModel):
    """批量日志条目"""
    message: str = Field(..., description="日志消息内容")
    service_name: Optional[str] = Field("fastapi-service", description="服务名称")
    level: Optional[LogLevel] = Field(LogLevel.INFO, description="日志级别")
    trace_id: Optional[str] = Field("", description="追踪ID")
    span_id: Optional[str] = Field("", description="跨度ID")
    adv_id: Optional[int] = Field(None, description="广告ID")
    aweme_id: Optional[int] = Field(None, description="视频ID")
    plan_id: Optional[int] = Field(None, description="计划ID")
    monitor_type: Optional[str] = Field(None, description="监控类型")
    co_id: Optional[int] = Field(None, description="公司ID")
    metadata: Optional[Dict[str, Any]] = Field({}, description="额外的元数据")


class BatchLogWriteRequest(BaseModel):
    """批量日志写入请求模型"""
    log_entries: List[BatchLogEntry] = Field(..., description="日志条目列表", min_items=1, max_items=1000)
    
    class Config:
        schema_extra = {
            "example": {
                "log_entries": [
                    {
                        "message": "批量日志1",
                        "adv_id": 123456,
                        "monitor_type": "impression"
                    },
                    {
                        "message": "批量日志2",
                        "adv_id": 123457,
                        "monitor_type": "click"
                    }
                ]
            }
        }


class ConcurrentTestRequest(BaseModel):
    """并发测试请求模型"""
    count: int = Field(100, description="并发请求数量", ge=1, le=10000)
    max_workers: int = Field(20, description="最大并发线程数", ge=1, le=100)
    
    class Config:
        schema_extra = {
            "example": {
                "count": 1000,
                "max_workers": 50
            }
        }


class LogWriteResponse(BaseModel):
    """日志写入响应模型"""
    success: bool = Field(..., description="是否成功")
    log_id: str = Field("", description="日志ID")
    error_message: str = Field("", description="错误消息")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "log_id": "log_id_12345",
                "error_message": ""
            }
        }


class BatchLogWriteResponse(BaseModel):
    """批量日志写入响应模型"""
    total_count: int = Field(..., description="总数量")
    success_count: int = Field(..., description="成功数量")
    error_count: int = Field(..., description="错误数量")
    errors: List[str] = Field([], description="错误列表")
    results: List[LogWriteResponse] = Field([], description="结果列表")
    
    class Config:
        schema_extra = {
            "example": {
                "total_count": 100,
                "success_count": 98,
                "error_count": 2,
                "errors": ["Entry 5: Connection timeout"],
                "results": []
            }
        }


class ConcurrentTestResponse(BaseModel):
    """并发测试响应模型"""
    success: bool = Field(..., description="测试是否成功")
    total_count: int = Field(..., description="总请求数")
    success_count: int = Field(..., description="成功数量")
    failed_count: int = Field(..., description="失败数量")
    duration_seconds: float = Field(..., description="耗时（秒）")
    logs_per_second: float = Field(..., description="每秒日志数")
    max_workers: int = Field(..., description="并发线程数")
    sample_results: List[LogWriteResponse] = Field([], description="示例结果")
    error_summary: Dict[str, Any] = Field({}, description="错误统计")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "total_count": 1000,
                "success_count": 995,
                "failed_count": 5,
                "duration_seconds": 4.567,
                "logs_per_second": 217.89,
                "max_workers": 20,
                "sample_results": [],
                "error_summary": {
                    "total_errors": 5,
                    "sample_errors": ["Connection timeout"]
                }
            }
        }


class HealthResponse(BaseModel):
    """健康检查响应模型"""
    status: str = Field(..., description="服务状态")
    timestamp: str = Field(..., description="检查时间")
    grpc_connection: bool = Field(..., description="gRPC连接状态")
    service_info: Dict[str, Any] = Field({}, description="服务信息")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2024-08-30T10:30:45.123456+00:00",
                "grpc_connection": True,
                "service_info": {
                    "name": "FastAPI Log Client",
                    "version": "1.0.0",
                    "grpc_server": "localhost:50051"
                }
            }
        }
