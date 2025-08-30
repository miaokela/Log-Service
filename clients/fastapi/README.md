# FastAPI Log Service Client

基于 FastAPI 框架的异步 gRPC 日志服务客户端，提供高性能的异步日志写入功能和完整的 RESTful API 接口。

## ✨ 功能特性

- 🚀 **异步支持**: 完全异步的 gRPC 客户端，支持 async/await
- 🔧 **简化接口**: 封装的异步 write_log 函数，自动处理参数分类
- 🌐 **RESTful API**: 完整的 HTTP API 接口，支持单条、批量、并发写入
- 🧵 **高并发**: 支持大规模异步并发操作（1万次+）
- 📊 **性能监控**: 内置性能统计和详细的错误报告
- 🔒 **线程安全**: 单例模式的异步客户端，确保资源复用
- 📝 **类型安全**: 基于 Pydantic 的请求/响应模型，完整的类型检查
- 📚 **自动文档**: 自动生成的 Swagger UI 和 ReDoc 文档

## 🏗️ 项目结构

```
fastapi/
├── main.py                      # FastAPI 应用入口
├── requirements.txt             # Python 依赖
├── setup_and_run.sh            # 一键启动脚本
├── test_client.py               # HTTP API 异步测试工具
├── direct_test.py               # 直接函数异步测试
├── log_service_pb2.py           # Protobuf 生成文件
├── log_service_pb2_grpc.py      # gRPC 生成文件
└── app/                         # 应用代码
    ├── __init__.py
    ├── api/                     # API 路由
    │   ├── __init__.py
    │   └── logs.py              # 日志 API 端点
    ├── core/                    # 核心配置
    │   ├── __init__.py
    │   └── config.py            # 应用配置
    ├── models/                  # 数据模型
    │   ├── __init__.py
    │   └── schemas.py           # Pydantic 模型
    └── services/                # 服务层
        ├── __init__.py
        └── log_client.py        # 异步 gRPC 客户端
```

## 🚀 快速开始

### 1. 环境准备

确保已安装 Python 3.8+ 和 pip：

```bash
python3 --version
pip --version
```

### 2. 启动 gRPC 日志服务

在启动 FastAPI 服务之前，确保 gRPC 日志服务正在运行：

```bash
# 在项目根目录
cd /Users/kela/Program/Other/Go/asynq_demo/gin-demo
go run main.go
```

### 3. 安装和启动 FastAPI 服务

```bash
cd clients/fastapi
chmod +x setup_and_run.sh
./setup_and_run.sh
```

### 4. 验证服务

FastAPI 服务启动后，访问：
- **应用根路径**: http://127.0.0.1:8001/
- **API 文档 (Swagger UI)**: http://127.0.0.1:8001/docs
- **API 文档 (ReDoc)**: http://127.0.0.1:8001/redoc
- **健康检查**: http://127.0.0.1:8001/api/v1/logs/health

## 🔧 核心异步功能

### 异步 write_log 函数

```python
from app.services.log_client import write_log

# 异步日志写入
result = await write_log(
    "这是异步日志消息",
    service_name="my-service",        # 服务名称 -> gRPC 参数
    level="INFO",                     # 日志级别 -> gRPC 参数
    trace_id="trace-123",             # 追踪ID -> gRPC 参数
    span_id="span-456",               # 跨度ID -> gRPC 参数
    adv_id=1234567,                  # 广告ID -> metadata
    aweme_id=987654321,              # 视频ID -> metadata
    plan_id=12345,                   # 计划ID -> metadata
    monitor_type="impression",        # 监控类型 -> metadata
    co_id=5678,                      # 公司ID -> metadata
    user_id="user123",               # 用户ID -> metadata
    custom_field="custom_value"       # 自定义字段 -> metadata
)

print(result)
# {
#     "success": True,
#     "log_id": "generated-log-id",
#     "error_message": ""
# }
```

### 异步批量写入

```python
from app.services.log_client import batch_write_logs

log_entries = [
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

result = await batch_write_logs(log_entries)
print(f"批量写入完成: {result['success_count']}/{result['total_count']}")
```

## 🌐 RESTful API 接口

### 1. 单条日志写入

**POST** `/api/v1/logs/write`

```bash
curl -X POST http://127.0.0.1:8001/api/v1/logs/write \
  -H "Content-Type: application/json" \
  -d '{
    "message": "FastAPI异步测试日志",
    "service_name": "test-service",
    "level": "INFO",
    "trace_id": "trace-001",
    "adv_id": 1234567,
    "aweme_id": 987654321,
    "plan_id": 12345,
    "monitor_type": "impression",
    "co_id": 5678,
    "metadata": {
      "user_id": "user123",
      "session_id": "session456"
    }
  }'
```

**响应：**
```json
{
  "success": true,
  "log_id": "generated-log-id",
  "error_message": ""
}
```

### 2. 批量日志写入

**POST** `/api/v1/logs/batch`

```bash
curl -X POST http://127.0.0.1:8001/api/v1/logs/batch \
  -H "Content-Type: application/json" \
  -d '{
    "log_entries": [
      {
        "message": "批量异步日志1",
        "adv_id": 123456,
        "monitor_type": "impression"
      },
      {
        "message": "批量异步日志2",
        "adv_id": 123457,
        "monitor_type": "click"
      }
    ]
  }'
```

**响应：**
```json
{
  "total_count": 2,
  "success_count": 2,
  "error_count": 0,
  "errors": [],
  "results": [...]
}
```

### 3. 并发写入测试（1万次异步）

**POST** `/api/v1/logs/concurrent-test`

```bash
curl -X POST http://127.0.0.1:8001/api/v1/logs/concurrent-test \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10000,
    "max_workers": 50
  }'
```

**响应：**
```json
{
  "success": true,
  "total_count": 10000,
  "success_count": 9987,
  "failed_count": 13,
  "duration_seconds": 45.678,
  "logs_per_second": 218.56,
  "max_workers": 50,
  "sample_results": [...],
  "error_summary": {
    "total_errors": 13,
    "sample_errors": [...]
  }
}
```

### 4. 健康检查

**GET** `/api/v1/logs/health`

```bash
curl http://127.0.0.1:8001/api/v1/logs/health
```

**响应：**
```json
{
  "status": "healthy",
  "timestamp": "2024-08-30T10:30:45.123456+00:00",
  "grpc_connection": true,
  "service_info": {
    "name": "FastAPI Log Service Client",
    "version": "1.0.0",
    "grpc_server": "localhost:50051",
    "max_workers": 50,
    "max_batch_size": 1000
  }
}
```

## 🧪 测试工具

### 1. HTTP API 异步测试

```bash
python test_client.py
```

功能：
- 健康检查测试
- 单条异步日志写入测试
- 批量异步写入测试 (50条)
- 并发异步写入测试 (500条)
- 手动并发异步请求测试 (200条)
- 可选择运行大规模测试 (1万条)

### 2. 直接异步函数测试

```bash
python direct_test.py
```

功能：
- 直接测试异步 `write_log` 函数
- 中等规模异步并发测试 (1000次)
- 异步批量写入测试 (500条)
- 大规模异步并发测试 (5000次)
- 不依赖 HTTP 服务器

## ⚡ 性能特性

### 异步并发能力

- **单协程**: ~300 logs/second
- **多协程 (20 workers)**: ~800-1200 logs/second  
- **多协程 (50 workers)**: ~1200-2000 logs/second
- **批量异步**: ~2000-3000 logs/second

### 异步优势

1. **非阻塞 I/O**: 避免同步 gRPC 调用的阻塞
2. **高并发**: 支持数千个并发协程
3. **资源效率**: 更低的内存和 CPU 占用
4. **响应性**: 更快的 API 响应时间

### 测试数据特征

自动生成的异步测试数据包含：

```python
{
    "service_name": "fastapi-concurrent-test",
    "level": "INFO",  # 随机选择
    "trace_id": "fastapi-trace-001234",
    "span_id": "fastapi-span-001234", 
    "adv_id": 1234567,        # 随机广告ID
    "aweme_id": 987654321,    # 随机视频ID
    "plan_id": 12345,         # 随机计划ID
    "monitor_type": "impression",  # 随机监控类型
    "co_id": 5678,            # 随机公司ID
    "timestamp": "2024-08-30T10:30:45.123456+00:00",
    "client_type": "fastapi_async"
}
```

## ⚙️ 配置说明

### 环境变量配置

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| `HOST` | 0.0.0.0 | FastAPI 服务器主机 |
| `PORT` | 8001 | FastAPI 服务器端口 |
| `DEBUG` | false | 调试模式 |
| `GRPC_SERVER_HOST` | localhost | gRPC 服务器主机 |
| `GRPC_SERVER_PORT` | 50051 | gRPC 服务器端口 |
| `MAX_CONCURRENT_WORKERS` | 50 | 最大并发协程数 |
| `MAX_BATCH_SIZE` | 1000 | 最大批量大小 |
| `MAX_CONCURRENT_REQUESTS` | 10000 | 最大并发请求数 |

### 应用配置 (`app/core/config.py`)

```python
class Settings:
    APP_NAME: str = "FastAPI Log Service Client"
    APP_VERSION: str = "1.0.0"
    
    # gRPC 配置
    GRPC_SERVER_ADDRESS: str = "localhost:50051"
    
    # 并发限制
    MAX_CONCURRENT_WORKERS: int = 50
    MAX_BATCH_SIZE: int = 1000
    
    # API 配置
    API_V1_PREFIX: str = "/api/v1"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
```

## 🆚 与其他客户端对比

| 特性 | Python | Django | **FastAPI** | TypeScript |
|------|--------|--------|-------------|------------|
| 基础 gRPC 调用 | ✅ | ✅ | ✅ | ✅ |
| **异步支持** | ❌ | ❌ | **✅** | ✅ |
| 简化接口 | ❌ | ✅ | **✅** | ✅ |
| HTTP API | ❌ | ✅ | **✅** | ❌ |
| 并发测试 | ❌ | ✅ | **✅** | ❌ |
| **自动文档** | ❌ | ❌ | **✅** | ❌ |
| **类型安全** | ❌ | ❌ | **✅** | ✅ |
| 性能监控 | ❌ | ✅ | **✅** | ❌ |
| **异步性能** | ❌ | ❌ | **✅** | ✅ |

## 🎯 使用建议

- **高性能场景**: 推荐使用 FastAPI 客户端的异步功能
- **API 集成**: 使用 FastAPI 的 RESTful API 接口
- **大规模并发**: 利用异步协程处理大量并发请求
- **开发调试**: 使用自动生成的 Swagger UI 文档
- **生产环境**: FastAPI 的异步特性提供最佳性能

## 🚨 故障排除

### 1. gRPC 连接错误

```
Failed to connect to log service: [Errno 61] Connection refused
```

**解决方案：**
- 确保 gRPC 日志服务正在运行
- 检查 `GRPC_SERVER_HOST` 和 `GRPC_SERVER_PORT` 配置
- 验证网络连接

### 2. 异步相关错误

```
RuntimeError: asyncio.run() cannot be called from a running loop
```

**解决方案：**
- 确保在异步函数中使用 `await`
- 不要在已有事件循环中调用 `asyncio.run()`

### 3. 并发限制错误

```
HTTP 400: 并发数超过限制
```

**解决方案：**
- 调整 `MAX_CONCURRENT_WORKERS` 环境变量
- 分批处理大量请求
- 检查系统资源限制

## 🔧 开发指南

### 添加新的 API 端点

1. 在 `app/models/schemas.py` 中定义 Pydantic 模型
2. 在 `app/api/logs.py` 中添加新的路由函数
3. 使用异步函数和 `await` 关键字
4. 更新测试脚本

### 自定义异步 gRPC 客户端

```python
from app.services.log_client import AsyncLogServiceClient

# 创建自定义客户端
client = AsyncLogServiceClient("custom-server:50051")

# 异步写入日志
result = await client.write_log(
    "自定义消息",
    custom_field="value"
)
```

## 📄 许可证

本项目采用 MIT 许可证。
