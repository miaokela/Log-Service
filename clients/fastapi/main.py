#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI 主应用入口
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.logs import router as logs_router

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    docs_url=settings.DOCS_URL,
    redoc_url=settings.REDOC_URL,
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOW_ORIGINS,
    allow_credentials=settings.ALLOW_CREDENTIALS,
    allow_methods=settings.ALLOW_METHODS,
    allow_headers=settings.ALLOW_HEADERS,
)

# 注册路由
app.include_router(
    logs_router,
    prefix=f"{settings.API_V1_PREFIX}/logs",
    tags=["日志管理"]
)


@app.get("/", summary="根路径")
async def root():
    """根路径，返回服务基本信息"""
    return JSONResponse({
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "description": settings.APP_DESCRIPTION,
        "docs_url": settings.DOCS_URL,
        "grpc_server": settings.GRPC_SERVER_ADDRESS,
        "endpoints": {
            "health": f"{settings.API_V1_PREFIX}/logs/health",
            "write_log": f"{settings.API_V1_PREFIX}/logs/write",
            "batch_write": f"{settings.API_V1_PREFIX}/logs/batch",
            "concurrent_test": f"{settings.API_V1_PREFIX}/logs/concurrent-test"
        }
    })


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 启动完成")
    print(f"📡 gRPC 服务器: {settings.GRPC_SERVER_ADDRESS}")
    print(f"📚 API 文档: http://{settings.HOST}:{settings.PORT}{settings.DOCS_URL}")


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    from app.services.log_client import get_log_client
    
    try:
        client = get_log_client()
        await client.disconnect()
        print("🔌 gRPC 连接已断开")
    except Exception as e:
        print(f"⚠️ 断开连接时出错: {e}")
    
    print(f"🛑 {settings.APP_NAME} 已关闭")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
