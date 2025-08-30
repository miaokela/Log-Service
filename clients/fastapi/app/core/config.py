#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI 应用配置
"""

import os
from typing import Optional


class Settings:
    """应用设置"""
    
    # 应用信息
    APP_NAME: str = "FastAPI Log Service Client"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "高性能异步日志服务 FastAPI 客户端"
    
    # 服务器配置
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8001))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # gRPC 服务器配置
    GRPC_SERVER_HOST: str = os.getenv("GRPC_SERVER_HOST", "localhost")
    GRPC_SERVER_PORT: int = int(os.getenv("GRPC_SERVER_PORT", 50051))
    
    @property
    def GRPC_SERVER_ADDRESS(self) -> str:
        return f"{self.GRPC_SERVER_HOST}:{self.GRPC_SERVER_PORT}"
    
    # 日志配置
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # API 配置
    API_V1_PREFIX: str = "/api/v1"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
    
    # 并发配置
    MAX_CONCURRENT_WORKERS: int = int(os.getenv("MAX_CONCURRENT_WORKERS", 50))
    MAX_BATCH_SIZE: int = int(os.getenv("MAX_BATCH_SIZE", 1000))
    MAX_CONCURRENT_REQUESTS: int = int(os.getenv("MAX_CONCURRENT_REQUESTS", 10000))
    
    # CORS 配置
    ALLOW_ORIGINS: list = ["*"]
    ALLOW_CREDENTIALS: bool = True
    ALLOW_METHODS: list = ["*"]
    ALLOW_HEADERS: list = ["*"]


# 全局设置实例
settings = Settings()
