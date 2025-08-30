#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
日志 API 路由
"""

import asyncio
import time
import random
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from ..models.schemas import (
    LogWriteRequest, LogWriteResponse,
    BatchLogWriteRequest, BatchLogWriteResponse, 
    ConcurrentTestRequest, ConcurrentTestResponse,
    HealthResponse
)
from ..services.log_client import write_log, batch_write_logs, get_log_client
from ..core.config import settings

router = APIRouter()


@router.post("/write", response_model=LogWriteResponse, summary="写入单条日志")
async def write_single_log(request: LogWriteRequest) -> LogWriteResponse:
    """
    写入单条日志到 gRPC 服务
    
    - **message**: 日志消息内容
    - **service_name**: 服务名称
    - **level**: 日志级别
    - **trace_id**: 追踪ID  
    - **span_id**: 跨度ID
    - **adv_id, aweme_id, plan_id, monitor_type, co_id**: 业务字段
    - **metadata**: 额外元数据
    """
    try:
        # 准备参数
        kwargs = request.dict(exclude={'message', 'metadata'}, exclude_none=True)
        
        # 合并额外的 metadata
        if request.metadata:
            kwargs.update(request.metadata)
        
        # 异步写入日志
        result = await write_log(request.message, **kwargs)
        
        return LogWriteResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"日志写入失败: {str(e)}")


@router.post("/batch", response_model=BatchLogWriteResponse, summary="批量写入日志")
async def write_batch_logs(request: BatchLogWriteRequest) -> BatchLogWriteResponse:
    """
    批量异步写入日志
    
    - **log_entries**: 日志条目列表（最多1000条）
    - 支持并发写入，提升性能
    """
    try:
        if len(request.log_entries) > settings.MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"批量大小超过限制: {len(request.log_entries)} > {settings.MAX_BATCH_SIZE}"
            )
        
        # 转换为字典列表
        log_entries = []
        for entry in request.log_entries:
            entry_dict = entry.dict(exclude={'metadata'}, exclude_none=True)
            
            # 合并 metadata
            if entry.metadata:
                entry_dict.update(entry.metadata)
            
            log_entries.append(entry_dict)
        
        # 异步批量写入
        result = await batch_write_logs(log_entries)
        
        return BatchLogWriteResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量日志写入失败: {str(e)}")


@router.post("/concurrent-test", response_model=ConcurrentTestResponse, summary="并发写入测试")
async def concurrent_write_test(request: ConcurrentTestRequest) -> ConcurrentTestResponse:
    """
    高并发日志写入性能测试
    
    - **count**: 并发请求数量（最多10000）
    - **max_workers**: 最大并发线程数
    - 自动生成测试数据，包含业务字段
    """
    try:
        if request.count > settings.MAX_CONCURRENT_REQUESTS:
            raise HTTPException(
                status_code=400,
                detail=f"并发数超过限制: {request.count} > {settings.MAX_CONCURRENT_REQUESTS}"
            )
        
        if request.max_workers > settings.MAX_CONCURRENT_WORKERS:
            raise HTTPException(
                status_code=400,
                detail=f"并发线程数超过限制: {request.max_workers} > {settings.MAX_CONCURRENT_WORKERS}"
            )
        
        start_time = time.time()
        
        # 生成测试日志条目
        test_entries = []
        for i in range(request.count):
            entry = {
                "message": f"FastAPI并发测试日志 {i+1}/{request.count}",
                "service_name": "fastapi-concurrent-test",
                "level": random.choice(["DEBUG", "INFO", "WARN", "ERROR"]),
                "trace_id": f"fastapi-trace-{i+1:06d}",
                "span_id": f"fastapi-span-{i+1:06d}",
                "adv_id": random.randint(1000000, 9999999),
                "aweme_id": random.randint(100000000, 999999999),
                "plan_id": random.randint(10000, 99999),
                "monitor_type": random.choice(["impression", "click", "conversion", "view"]),
                "co_id": random.randint(1000, 9999),
                "test_index": i + 1,
                "max_workers": request.max_workers,
                "timestamp": datetime.now().isoformat()
            }
            test_entries.append(entry)
        
        # 分批并发执行
        batch_size = max(1, request.count // request.max_workers)
        batches = [test_entries[i:i + batch_size] for i in range(0, len(test_entries), batch_size)]
        
        # 并发执行所有批次
        tasks = [batch_write_logs(batch) for batch in batches]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 汇总结果
        total_success = 0
        total_errors = 0
        all_errors = []
        sample_results = []
        
        for batch_result in batch_results:
            if isinstance(batch_result, Exception):
                total_errors += len(batches[0])  # 估算错误数
                all_errors.append(str(batch_result))
            elif isinstance(batch_result, dict):
                total_success += batch_result.get('success_count', 0)
                total_errors += batch_result.get('error_count', 0)
                all_errors.extend(batch_result.get('errors', []))
                sample_results.extend(batch_result.get('results', []))
        
        end_time = time.time()
        duration = end_time - start_time
        
        return ConcurrentTestResponse(
            success=True,
            total_count=request.count,
            success_count=total_success,
            failed_count=total_errors,
            duration_seconds=round(duration, 3),
            logs_per_second=round(total_success / duration, 2) if duration > 0 else 0,
            max_workers=request.max_workers,
            sample_results=sample_results[:10],  # 前10个结果
            error_summary={
                "total_errors": total_errors,
                "sample_errors": all_errors[:5]  # 前5个错误
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"并发测试失败: {str(e)}")


@router.get("/health", response_model=HealthResponse, summary="健康检查")
async def health_check() -> HealthResponse:
    """
    检查服务健康状态
    
    - 检查 gRPC 连接状态
    - 返回服务基本信息
    """
    try:
        client = get_log_client(settings.GRPC_SERVER_ADDRESS)
        
        # 尝试写入一条测试日志来检查连接
        test_result = await client.write_log(
            "健康检查测试日志",
            service_name="fastapi-health-check",
            level="INFO"
        )
        
        grpc_connected = test_result.get('success', False)
        
        return HealthResponse(
            status="healthy" if grpc_connected else "unhealthy",
            timestamp=datetime.now().isoformat(),
            grpc_connection=grpc_connected,
            service_info={
                "name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "grpc_server": settings.GRPC_SERVER_ADDRESS,
                "max_workers": settings.MAX_CONCURRENT_WORKERS,
                "max_batch_size": settings.MAX_BATCH_SIZE
            }
        )
    
    except Exception as e:
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.now().isoformat(),
            grpc_connection=False,
            service_info={
                "name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "error": str(e)
            }
        )
