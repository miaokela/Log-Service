#!/bin/bash

# 日志服务启动脚本

echo "=== 日志服务启动脚本 ==="

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "错误: 请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: 请先安装Docker Compose"
    exit 1
fi

# 创建必要的目录
mkdir -p logs

# 设置权限
chmod +x scripts/init-mongo.js

echo "正在启动日志服务..."

# 停止并删除旧的容器
docker-compose down

# 构建并启动服务
docker-compose up --build -d

echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "=== 服务状态 ==="
docker-compose ps

# 检查MongoDB连接
echo "=== 检查MongoDB连接 ==="
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" || echo "MongoDB连接检查失败"

# 检查日志服务
echo "=== 检查日志服务 ==="
docker-compose logs log-service | tail -10

echo ""
echo "=== 启动完成 ==="
echo "日志服务gRPC端口: 50051"
echo "MongoDB端口: 27017"
echo ""
echo "使用以下命令查看日志:"
echo "  查看所有日志: docker-compose logs"
echo "  查看日志服务日志: docker-compose logs log-service"
echo "  查看MongoDB日志: docker-compose logs mongodb"
echo ""
echo "停止服务: docker-compose down"
