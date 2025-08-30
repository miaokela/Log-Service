# Django Log Service Client

基于 Django 框架的 gRPC 日志服务客户端，提供简化的日志写入功能和高性能并发测试接口。

## 功能特性

- 🚀 **高性能并发**: 支持多线程并发写入，可处理1万次并发日志写入
- 🔧 **简化接口**: 封装的 `write_log` 函数，自动处理参数分类和 metadata
- 🌐 **RESTful API**: 提供 HTTP 接口，方便集成和测试
- 📊 **性能监控**: 内置性能统计和错误报告
- 🔒 **线程安全**: 单例模式的客户端，确保线程安全

## 项目结构

```
django/
├── manage.py                    # Django 管理脚本
├── requirements.txt             # Python 依赖
├── setup_and_run.sh            # 安装和启动脚本
├── test_client.py               # HTTP API 测试客户端
├── direct_test.py               # 直接函数测试脚本
├── log_service_django/          # Django 项目配置
│   ├── __init__.py
│   ├── settings.py              # Django 设置
│   ├── urls.py                  # 主 URL 配置
│   ├── wsgi.py
│   └── asgi.py
└── log_client/                  # 日志客户端应用
    ├── __init__.py
    ├── apps.py                  # 应用配置
    ├── client.py                # gRPC 客户端封装
    ├── views.py                 # API 视图
    ├── urls.py                  # 应用 URL 配置
    ├── log_service_pb2.py       # Protobuf 生成文件
    └── log_service_pb2_grpc.py  # gRPC 生成文件
```

## 快速开始

### 1. 环境准备

确保已安装 Python 3.8+ 和 pip：

```bash
python3 --version
pip --version
```

### 2. 启动 gRPC 日志服务

在启动 Django 服务之前，确保 gRPC 日志服务正在运行：

```bash
# 在项目根目录
cd /Users/kela/Program/Other/Go/asynq_demo/gin-demo
go run main.go
```

### 3. 安装和启动 Django 服务

```bash
cd clients/django
chmod +x setup_and_run.sh
./setup_and_run.sh
```

### 4. 验证服务

Django 服务启动后，访问：
- 服务器状态: http://127.0.0.1:8000/admin/
- API 文档: 见下文 API 接口部分

## 核心功能

### write_log 函数

封装的核心日志写入函数：

```python
from log_client.client import write_log

# 基本用法
result = write_log(
    "这是日志消息",
    service_name="my-service",    # 服务名称 -> gRPC 参数
    level="INFO",                 # 日志级别 -> gRPC 参数
    trace_id="trace-123",         # 追踪ID -> gRPC 参数
    span_id="span-456",           # 跨度ID -> gRPC 参数
    adv_id=1234567,              # 广告ID -> metadata
    aweme_id=987654321,          # 视频ID -> metadata
    plan_id=12345,               # 计划ID -> metadata
    monitor_type="impression",    # 监控类型 -> metadata
    co_id=5678,                  # 公司ID -> metadata
    user_id="user123",           # 用户ID -> metadata
    custom_field="custom_value"   # 自定义字段 -> metadata
)

print(result)
# {
#     "success": True,
#     "log_id": "generated-log-id",
#     "error_message": ""
# }
```

**参数说明：**
- `message` (位置参数): 日志消息内容
- `service_name`, `level`, `trace_id`, `span_id`: 会作为 gRPC 的直接参数
- 其他所有命名参数: 自动放入 `metadata` 字段

## API 接口

### 1. 单条日志写入

**POST** `/api/write_log/`

```bash
curl -X POST http://127.0.0.1:8000/api/write_log/ \
  -H "Content-Type: application/json" \
  -d '{
    "message": "测试日志消息",
    "service_name": "test-service",
    "level": "INFO",
    "trace_id": "trace-001",
    "adv_id": 1234567,
    "aweme_id": 987654321,
    "plan_id": 12345,
    "monitor_type": "impression",
    "co_id": 5678
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

### 2. 批量写入测试

**POST** `/api/batch_write_test/`

```bash
curl -X POST http://127.0.0.1:8000/api/batch_write_test/ \
  -H "Content-Type: application/json" \
  -d '{
    "count": 1000
  }'
```

**响应：**
```json
{
  "success": true,
  "total_count": 1000,
  "success_count": 998,
  "failed_count": 2,
  "duration_seconds": 5.234,
  "logs_per_second": 190.65,
  "results": [...]
}
```

### 3. 并发写入测试（1万次）

**POST** `/api/concurrent_test/`

```bash
curl -X POST http://127.0.0.1:8000/api/concurrent_test/ \
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
  "test_type": "concurrent",
  "total_count": 10000,
  "success_count": 9987,
  "failed_count": 13,
  "max_workers": 50,
  "duration_seconds": 45.678,
  "logs_per_second": 218.56,
  "sample_results": [...],
  "error_summary": {
    "total_errors": 13,
    "sample_errors": [...]
  }
}
```

## 测试工具

### 1. HTTP API 测试

```bash
python test_client.py
```

功能：
- 测试单条日志写入
- 测试批量写入 (50条)
- 测试并发写入 (1000条)
- 测试手动并发请求 (500条)
- 可选择运行大规模测试 (1万条)

### 2. 直接函数测试

```bash
python direct_test.py
```

功能：
- 直接测试 `write_log` 函数
- 中等规模并发测试 (1000次)
- 大规模并发测试 (1万次)
- 不依赖 HTTP 服务器

## 性能特性

### 并发处理能力

- **单线程**: ~200 logs/second
- **多线程 (20 workers)**: ~500-800 logs/second  
- **多线程 (50 workers)**: ~800-1200 logs/second

### 测试数据特征

自动生成的测试数据包含：

```python
{
    "service_name": "django-concurrent-test",
    "level": "INFO",  # 随机选择
    "trace_id": "concurrent-trace-001234",
    "span_id": "concurrent-span-001234", 
    "adv_id": 1234567,        # 随机广告ID
    "aweme_id": 987654321,    # 随机视频ID
    "plan_id": 12345,         # 随机计划ID
    "monitor_type": "impression",  # 随机监控类型
    "co_id": 5678,            # 随机公司ID
    "timestamp": "2024-08-30T10:30:45.123456+00:00"
}
```

## 配置说明

### Django 设置 (`log_service_django/settings.py`)

```python
# gRPC 服务器地址
LOG_SERVICE_GRPC_SERVER = "localhost:50051"

# 允许的主机
ALLOWED_HOSTS = ['*']

# 安装的应用
INSTALLED_APPS = [
    # ...
    'log_client',
]
```

### 客户端配置 (`log_client/client.py`)

```python
class DjangoLogServiceClient:
    def __init__(self):
        # 从 Django 设置读取服务器地址
        self.server_address = getattr(settings, 'LOG_SERVICE_GRPC_SERVER', 'localhost:50051')
```

## 故障排除

### 1. gRPC 连接错误

```
Failed to connect to log service: [Errno 61] Connection refused
```

**解决方案：**
- 确保 gRPC 日志服务正在运行
- 检查服务地址配置是否正确
- 验证网络连接

### 2. Django 导入错误

```
Import "django" could not be resolved from source
```

**解决方案：**
```bash
# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 并发测试超时

**解决方案：**
- 降低并发数量 (`max_workers`)
- 增加请求超时时间
- 检查 gRPC 服务器性能

### 4. 内存使用过高

**解决方案：**
- 分批处理大量请求
- 降低并发线程数
- 优化客户端连接池

## 扩展开发

### 添加新的 API 接口

1. 在 `log_client/views.py` 中添加新视图
2. 在 `log_client/urls.py` 中添加 URL 路由
3. 更新测试脚本

### 自定义 metadata 字段

```python
# 在 write_log 调用中添加任意字段
result = write_log(
    "消息内容",
    # gRPC 参数
    service_name="my-service",
    level="INFO",
    # 自定义 metadata (会自动处理)
    user_type="premium",
    region="asia",
    experiment_id="exp_123",
    custom_metrics={"cpu_usage": 0.85}
)
```

## 依赖项

- Django 4.2.7
- grpcio 1.59.3
- grpcio-tools 1.59.3
- protobuf >= 4.21.0
- requests >= 2.28.0

## 许可证

此项目遵循 MIT 许可证。
