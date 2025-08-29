# Log Service - 高性能日志服务

基于 gRPC + MongoDB + Docker 构建的高性能日志服务，支持非阻塞日志写入和灵活的日志查询。现已集成 Web 管理界面！

## ✅ 功能特性

- [x] 技术栈：gRPC + MongoDB + Docker
- [x] 日志写入、日志灵活查询 gRPC 服务
- [x] 非阻塞设计 - 使用队列缓冲和批量写入
- [x] Docker Compose 一键部署
- [x] **🆕 Web 管理界面** - 科技感 React + Gin 管理界面
- [x] **🆕 可视化查询** - 直观的日志查询和统计功能
- [x] **🆕 自定义创建** - 友好的日志创建表单界面

## 🎯 新增功能：Admin 管理界面

### 🌟 界面特色
- **科技感设计**：深色主题 + 霓虹蓝色调，毛玻璃效果
- **实时查询**：多条件组合查询，实时显示结果
- **统计仪表盘**：日志数量、级别分布、服务统计
- **响应式布局**：完美适配桌面和移动端

### 🚀 快速启动 Admin
```bash
# 启动包含管理界面的完整服务
./admin/start-admin.sh

# 或使用 docker-compose
docker-compose up --build -d
```

### 📱 访问地址
- **管理界面**: http://localhost:3000
- **后端API**: http://localhost:8080
- **原gRPC服务**: grpc://localhost:50051

### 🔧 验证服务
```bash
# 验证所有服务是否正常
./admin/verify-admin.sh
```

## 🏗️ 架构设计

### 核心组件

1. **gRPC 服务层** - 对外提供日志写入和查询接口
2. **队列管理器** - 实现非阻塞的日志写入，使用内存队列缓冲
3. **批量处理器** - 定期批量写入日志到 MongoDB，提升性能
4. **MongoDB 存储** - 高性能文档数据库，支持复杂查询和索引

### 非阻塞设计

- **内存队列缓冲**：日志写入请求先进入内存队列，立即返回
- **批量写入**：后台定期批量写入到 MongoDB，减少I/O开销
- **队列满保护**：队列满时丢弃新日志，保护服务稳定性

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

```bash
# 一键启动服务
./start.sh
```

### 方式二：使用 Docker Compose

```bash
# 构建并启动服务
docker-compose up --build -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f log-service
```

### 方式三：使用 Makefile

```bash
# 安装 protobuf 工具
make install-protoc-tools

# 设置开发环境
make setup

# 启动 Docker 服务
make docker-up

# 查看日志
make docker-logs
```

## 📋 服务信息

启动完成后，服务将在以下端口运行：

- **日志服务 gRPC 端口**: `50051`
- **MongoDB 端口**: `27017`

## 🧪 测试客户端

项目包含了完整的测试客户端，演示如何使用各种API：

```bash
# 构建并运行测试客户端
make run-client

# 或者手动构建
go build -o bin/client examples/client.go
./bin/client
```

测试客户端将演示：
- 单条日志写入
- 批量日志写入  
- 按服务名查询
- 按日志级别查询
- 按 trace_id 查询

## 📖 API 接口

### gRPC 服务定义

```protobuf
service LogService {
  // 写入单条日志
  rpc WriteLog(WriteLogRequest) returns (WriteLogResponse);
  
  // 批量写入日志
  rpc BatchWriteLog(BatchWriteLogRequest) returns (BatchWriteLogResponse);
  
  // 查询日志
  rpc QueryLog(QueryLogRequest) returns (QueryLogResponse);
}
```

### 日志级别

- `DEBUG` = 0
- `INFO` = 1  
- `WARN` = 2
- `ERROR` = 3
- `FATAL` = 4

### 查询功能

支持以下查询条件：
- 服务名称
- 日志级别
- 时间范围（start_time, end_time）
- 元数据过滤器
- trace_id
- 分页（limit, offset）

## ⚙️ 配置选项

服务支持通过环境变量进行配置：

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| `SERVER_PORT` | 50051 | gRPC 服务端口 |
| `MONGODB_URI` | mongodb://localhost:27017 | MongoDB 连接URI |
| `MONGODB_DATABASE` | log_service | MongoDB 数据库名 |
| `LOG_BUFFER_SIZE` | 1000 | 日志队列缓冲区大小 |
| `LOG_FLUSH_PERIOD` | 5 | 批量写入周期（秒） |
| `LOG_BATCH_SIZE` | 100 | 单次批量写入数量 |

## 📁 项目结构

```
.
├── main.go                 # 应用入口
├── proto/                  # protobuf 定义
│   └── log_service.proto
├── internal/               # 内部包
│   ├── config/            # 配置管理
│   ├── storage/           # MongoDB 存储层
│   ├── queue/             # 日志队列管理
│   └── service/           # gRPC 服务实现
├── examples/              # 示例代码
│   └── client.go          # 测试客户端
├── scripts/               # 脚本文件
│   └── init-mongo.js      # MongoDB 初始化脚本
├── docker-compose.yml     # Docker Compose 配置
├── Dockerfile            # Docker 镜像构建
├── Makefile              # 构建脚本
└── start.sh              # 启动脚本
```

## 🛠️ 开发

### 本地开发环境

1. 安装依赖：
```bash
go mod download
```

2. 安装 protobuf 工具：
```bash
make install-protoc-tools
```

3. 生成 protobuf 代码：
```bash
make proto
```

4. 启动 MongoDB（使用 Docker）：
```bash
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

5. 运行服务：
```bash
make run
```

### 构建命令

```bash
# 清理构建文件
make clean

# 生成 protobuf 代码
make proto

# 构建应用
make build

# 运行测试
make test

# 构建 Docker 镜像
make docker-build
```

## 🔧 运维管理

### 查看服务状态

```bash
# 查看容器状态
docker-compose ps

# 查看服务日志
docker-compose logs log-service

# 查看 MongoDB 日志
docker-compose logs mongodb
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 或使用 Makefile
make docker-down
```

### 数据持久化

MongoDB 数据存储在 Docker volume `mongodb_data` 中，停止容器不会丢失数据。

如需完全清理：
```bash
docker-compose down -v  # 删除 volumes
```

## 🚨 生产环境建议

1. **安全性**：
   - 修改 MongoDB 默认密码
   - 使用 TLS 加密 gRPC 连接
   - 配置防火墙规则

2. **性能优化**：
   - 根据日志量调整队列缓冲区大小
   - 优化 MongoDB 索引
   - 考虑使用 MongoDB 分片集群

3. **监控**：
   - 添加 Prometheus metrics
   - 配置日志告警
   - 监控队列堆积情况

4. **高可用**：
   - 部署多个服务实例
   - 使用 MongoDB 副本集
   - 配置负载均衡器
