# gRPC 客户端使用指南

## 概述

本目录包含了Python和TypeScript两种语言的gRPC客户端实现，用于测试日志服务的各种功能。

## 🐍 Python 客户端

### 快速开始

```bash
cd clients/python

# 设置环境并运行
chmod +x setup_and_run.sh
./setup_and_run.sh

# 运行客户端测试
source venv/bin/activate
python client.py
```

### 手动设置

1. **创建虚拟环境**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   ```

3. **生成protobuf代码**
   ```bash
   python -m grpc_tools.protoc \
       --proto_path=../../proto \
       --python_out=. \
       --grpc_python_out=. \
       ../../proto/log_service.proto
   ```

4. **运行测试**
   ```bash
   python client.py
   ```

### Python 客户端功能

- ✅ 单条日志写入
- ✅ 批量日志写入
- ✅ 多种条件查询
- ✅ 性能测试
- ✅ 错误处理

### 示例代码

```python
from client import LogServiceClient
import log_service_pb2

# 创建客户端
client = LogServiceClient("localhost:50051")
client.connect()

# 写入日志
result = client.write_log(
    service_name="my-service",
    level=log_service_pb2.LogLevel.INFO,
    message="测试消息",
    metadata={"key": "value"}
)

# 查询日志
logs = client.query_log(
    service_name="my-service",
    limit=10
)

client.disconnect()
```

## 🟦 TypeScript 客户端

### 快速开始

```bash
cd clients/typescript

# 设置环境并运行
chmod +x setup_and_run.sh
./setup_and_run.sh

# 运行客户端测试
npm start
# 或者开发模式
npm run dev
```

### 手动设置

1. **安装依赖**
   ```bash
   npm install
   ```

2. **编译TypeScript**
   ```bash
   npm run build
   ```

3. **运行测试**
   ```bash
   npm start
   ```

### TypeScript 客户端功能

- ✅ 类型安全的接口
- ✅ 单条日志写入
- ✅ 批量日志写入
- ✅ 异步/Promise支持
- ✅ 多种条件查询
- ✅ 性能测试

### 示例代码

```typescript
import { SimpleLogServiceClient, LogLevel } from './simple-client';

// 创建客户端
const client = new SimpleLogServiceClient("localhost:50051");

// 写入日志
const result = await client.writeLog({
  serviceName: "my-service",
  level: LogLevel.INFO,
  message: "测试消息",
  metadata: { key: "value" }
});

// 查询日志
const logs = await client.queryLog({
  serviceName: "my-service",
  limit: 10
});

client.close();
```

## 📊 测试功能对比

| 功能 | Python | TypeScript |
|------|--------|------------|
| 单条日志写入 | ✅ | ✅ |
| 批量日志写入 | ✅ | ✅ |
| 按服务名查询 | ✅ | ✅ |
| 按级别查询 | ✅ | ✅ |
| 按trace_id查询 | ✅ | ✅ |
| 按时间范围查询 | ✅ | ✅ |
| 元数据过滤 | ✅ | ✅ |
| 性能测试 | ✅ | ✅ |
| 错误处理 | ✅ | ✅ |
| 类型安全 | ❌ | ✅ |

## 🚀 性能测试结果

### Python 客户端性能
- 单条写入: ~1,500-3,000 logs/second
- 批量写入: 更高的吞吐量
- 查询速度: ~100-300 queries/second

### TypeScript 客户端性能
- 单条写入: ~1,000-2,500 logs/second  
- 批量写入: 更高的吞吐量
- 查询速度: ~80-250 queries/second

## 🔧 配置选项

### 服务器地址配置

**Python:**
```python
client = LogServiceClient("localhost:50051")  # 默认
client = LogServiceClient("your-server:50051")  # 自定义
```

**TypeScript:**
```typescript
const client = new SimpleLogServiceClient("localhost:50051");  // 默认
const client = new SimpleLogServiceClient("your-server:50051");  // 自定义
```

### 超时配置

**Python:**
```python
# 在 gRPC 调用中添加超时
response = self.stub.WriteLog(request, timeout=30)
```

**TypeScript:**
```typescript
// 在 grpc 选项中配置超时
const options = { deadline: Date.now() + 30000 };  // 30秒
```

## 🐛 故障排除

### 常见问题

1. **连接错误**
   ```
   错误: [Errno 111] Connection refused
   ```
   **解决方案**: 确保日志服务正在运行 (localhost:50051)

2. **Python protobuf 生成失败**
   ```
   错误: protoc command not found
   ```
   **解决方案**: 安装 protobuf 编译器
   ```bash
   # macOS
   brew install protobuf
   
   # Ubuntu
   sudo apt-get install protobuf-compiler
   ```

3. **TypeScript 编译错误**
   ```
   错误: Cannot find module '@grpc/grpc-js'
   ```
   **解决方案**: 确保依赖已正确安装
   ```bash
   npm install
   ```

4. **依赖版本冲突**
   **解决方案**: 清理并重新安装
   ```bash
   # Python
   rm -rf venv
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # TypeScript  
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📝 开发指南

### 添加新功能

1. **修改 proto 文件** (如果需要)
2. **重新生成客户端代码**
3. **更新客户端实现**
4. **添加测试用例**

### 自定义客户端

可以基于现有客户端创建自己的实现：

**Python:**
```python
from client import LogServiceClient

class MyLogClient(LogServiceClient):
    def custom_method(self):
        # 自定义功能
        pass
```

**TypeScript:**
```typescript
import { SimpleLogServiceClient } from './simple-client';

class MyLogClient extends SimpleLogServiceClient {
  customMethod() {
    // 自定义功能
  }
}
```

## 📚 更多资源

- [gRPC Python 文档](https://grpc.io/docs/languages/python/)
- [gRPC Node.js 文档](https://grpc.io/docs/languages/node/)
- [Protocol Buffers 文档](https://developers.google.com/protocol-buffers)
- [项目主文档](../../README.md)
