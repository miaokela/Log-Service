# 日志管理系统 - Docker 容器管理脚本

## 📦 脚本说明

### 1. `docker-start.sh` - 启动容器脚本
用于启动所有容器服务（不重新构建镜像）

```bash
./docker-start.sh
```

**功能：**
- 清理网络冲突
- 停止现有容器
- 清理孤立容器
- 启动所有服务
- 健康状态检查
- 显示访问地址

### 2. `docker-rebuild.sh` - 重新构建脚本
用于重新构建所有镜像并启动容器

```bash
./docker-rebuild.sh
```

**功能：**
- 停止并移除所有容器
- 清理Docker网络和未使用镜像
- 重新构建所有镜像
- 启动所有服务
- 详细的健康检查
- 显示构建的镜像信息

## 🌐 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 管理后台 | http://localhost:3000 | React前端界面 |
| 后端API | http://localhost:8080 | Go REST API |
| MongoDB | localhost:27017 | 数据库服务 |
| gRPC服务 | localhost:50051 | 日志服务gRPC接口 |

## 🔧 常用命令

### 查看容器状态
```bash
docker-compose ps
```

### 查看服务日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f admin-frontend
docker-compose logs -f admin-backend
docker-compose logs -f log-service
docker-compose logs -f mongodb
```

### 重启单个服务
```bash
docker-compose restart admin-frontend
docker-compose restart admin-backend
docker-compose restart log-service
docker-compose restart mongodb
```

### 停止所有服务
```bash
docker-compose down
```

### 进入容器内部
```bash
# 进入MongoDB容器
docker exec -it log-service-mongodb mongosh

# 进入后端容器
docker exec -it log-admin-backend sh

# 进入前端容器
docker exec -it log-admin-frontend sh
```

## 🧪 API 测试命令

### 健康检查
```bash
curl http://localhost:8080/health
```

### 获取统计信息
```bash
curl http://localhost:3000/api/stats/
```

### 获取索引列表
```bash
curl http://localhost:3000/api/indexes/
```

### 获取日志列表
```bash
curl http://localhost:3000/api/logs/?limit=10
```

## 🐛 故障排除

### 1. 端口冲突
如果遇到端口被占用的错误：
```bash
# 查看端口占用
lsof -i :3000
lsof -i :8080
lsof -i :27017
lsof -i :50051

# 杀死占用进程
kill -9 <PID>
```

### 2. 容器启动失败
```bash
# 查看容器详细错误信息
docker-compose logs <service-name>

# 重新构建特定服务
docker-compose up --build <service-name>
```

### 3. 网络问题
```bash
# 清理所有Docker网络
docker network prune -f

# 重新创建网络
docker-compose down
docker-compose up -d
```

### 4. 存储卷问题
```bash
# 查看存储卷
docker volume ls

# 清理未使用的存储卷
docker volume prune -f
```

## 📝 开发建议

1. **修改前端代码后**：使用 `./docker-rebuild.sh`
2. **修改后端代码后**：使用 `./docker-rebuild.sh`
3. **仅重启服务**：使用 `./docker-start.sh`
4. **查看实时日志**：使用 `docker-compose logs -f`

## 🚀 生产环境部署

生产环境建议：
1. 修改 MongoDB 默认密码
2. 配置 SSL/TLS 证书
3. 使用环境变量管理配置
4. 设置数据备份策略
5. 配置监控和日志收集
