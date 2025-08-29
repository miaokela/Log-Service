# 部署指南

## 🚀 快速部署

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- Go 1.21+ (本地开发)
- Protocol Buffers 编译器 (protoc)

### 一键部署

```bash
# 克隆项目
git clone <repository-url>
cd log-service

# 启动服务
./start.sh
```

## 📋 部署方式

### 方式一：Docker Compose 部署（推荐）

```bash
# 构建并启动服务
docker-compose up --build -d

# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 方式二：本地开发部署

```bash
# 1. 启动 MongoDB
docker run -d --name mongodb -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:7.0

# 2. 设置环境变量
export MONGODB_URI="mongodb://localhost:27017/log_service"
export SERVER_PORT=50051

# 3. 构建并运行服务
make build
./bin/log-service
```

### 方式三：生产环境部署

```bash
# 1. 修改环境变量
cp docker-compose.yml docker-compose.prod.yml

# 2. 编辑生产配置
vim docker-compose.prod.yml

# 3. 使用生产配置启动
docker-compose -f docker-compose.prod.yml up -d
```

## ⚙️ 配置说明

### 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SERVER_PORT` | 50051 | gRPC 服务端口 |
| `MONGODB_URI` | mongodb://localhost:27017 | MongoDB 连接字符串 |
| `MONGODB_DATABASE` | log_service | 数据库名称 |
| `LOG_BUFFER_SIZE` | 1000 | 日志队列缓冲区大小 |
| `LOG_FLUSH_PERIOD` | 5 | 批量刷新周期(秒) |
| `LOG_BATCH_SIZE` | 100 | 单次批量写入数量 |

### MongoDB 配置

```yaml
# docker-compose.yml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: password123
  MONGO_INITDB_DATABASE: log_service
```

## 🔧 性能调优

### 1. 队列配置优化

根据日志量调整以下参数：

```bash
# 高并发场景
LOG_BUFFER_SIZE=5000
LOG_BATCH_SIZE=500
LOG_FLUSH_PERIOD=3

# 低延迟场景  
LOG_BUFFER_SIZE=100
LOG_BATCH_SIZE=20
LOG_FLUSH_PERIOD=1
```

### 2. MongoDB 性能优化

```javascript
// 在 MongoDB 中执行
db.logs.createIndex({ "service_name": 1, "timestamp": -1 })
db.logs.createIndex({ "level": 1, "timestamp": -1 })
db.logs.createIndex({ "trace_id": 1 })
db.logs.createIndex({ "timestamp": -1 })

// 启用分片（大规模部署）
sh.enableSharding("log_service")
sh.shardCollection("log_service.logs", { "timestamp": 1 })
```

### 3. 容器资源配置

```yaml
# docker-compose.yml
services:
  log-service:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '1.0'
          memory: 512M
          
  mongodb:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 4G
        reservations:
          cpus: '2.0'
          memory: 2G
```

## 🔍 监控与健康检查

### 1. 服务健康检查

```bash
# 检查 gRPC 服务
grpc_health_probe -addr=localhost:50051

# 检查 MongoDB
docker exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### 2. 监控指标

- **队列状态**: 查看 `service.log` 中的批量刷新日志
- **写入性能**: 监控 logs/second 指标
- **MongoDB 性能**: 使用 MongoDB Compass 或 mongostat
- **容器资源**: 使用 `docker stats`

### 3. 日志监控

```bash
# 实时查看服务日志
docker-compose logs -f log-service

# 查看 MongoDB 日志
docker-compose logs -f mongodb

# 查看错误日志
docker-compose logs log-service | grep -i error
```

## 🚨 故障排除

### 常见问题

1. **连接拒绝错误**
   ```bash
   # 检查端口是否正确
   netstat -tlnp | grep 50051
   
   # 检查防火墙
   sudo ufw status
   ```

2. **MongoDB 连接失败**
   ```bash
   # 检查 MongoDB 状态
   docker-compose exec mongodb mongosh --eval "db.runCommand({connectionStatus: 1})"
   
   # 检查网络连接
   docker-compose exec log-service nc -zv mongodb 27017
   ```

3. **队列堆积**
   ```bash
   # 调整队列参数
   export LOG_BUFFER_SIZE=10000
   export LOG_BATCH_SIZE=1000
   
   # 重启服务
   docker-compose restart log-service
   ```

4. **性能问题**
   ```bash
   # 检查 MongoDB 索引
   docker-compose exec mongodb mongosh log_service --eval "db.logs.getIndexes()"
   
   # 查看慢查询
   docker-compose exec mongodb mongosh --eval "db.setProfilingLevel(2, {slowms: 100})"
   ```

## 📊 性能基准

### 测试环境
- **CPU**: 4 cores
- **内存**: 8GB
- **存储**: SSD

### 性能指标
- **单条写入**: ~30,000 logs/second
- **批量写入**: ~90,000 logs/second  
- **查询性能**: ~150 queries/second
- **平均延迟**: <1ms per log

### 压力测试

```bash
# 运行性能基准测试
go run examples/performance_benchmark.go

# 查看结果
cat service.log | grep "Successfully flushed"
```

## 🔐 安全配置

### 1. MongoDB 安全

```yaml
# docker-compose.prod.yml
environment:
  MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
  MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
volumes:
  - ./mongo-keyfile:/data/keyfile:ro
command: --auth --keyFile /data/keyfile
```

### 2. gRPC TLS

```go
// main.go 中添加 TLS 支持
creds, err := credentials.LoadTLS("server.crt", "server.key")
if err != nil {
    log.Fatal(err)
}
s := grpc.NewServer(grpc.Creds(creds))
```

### 3. 网络安全

```yaml
# docker-compose.prod.yml
networks:
  log-service-network:
    driver: bridge
    internal: true  # 限制外部访问
```

## 🔄 备份与恢复

### MongoDB 备份

```bash
# 创建备份
docker-compose exec mongodb mongodump --uri="mongodb://admin:password123@localhost:27017/log_service?authSource=admin" --out=/backup

# 恢复备份
docker-compose exec mongodb mongorestore --uri="mongodb://admin:password123@localhost:27017/log_service?authSource=admin" /backup/log_service
```

### 自动化备份

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec mongodb mongodump --uri="mongodb://admin:password123@localhost:27017/log_service?authSource=admin" --out=/backup/log_service_$DATE

# 添加到 crontab
# 0 2 * * * /path/to/backup.sh
```
