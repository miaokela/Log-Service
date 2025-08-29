#!/bin/bash

# 日志管理系统 - 容器启动脚本
# 用于启动所有必要的容器服务

echo "=================================================="
echo "          日志管理系统 - 容器启动"
echo "=================================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误：Docker未运行，请先启动Docker"
    exit 1
fi

# 检查docker-compose是否存在
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误：docker-compose未安装"
    exit 1
fi

echo "🚀 开始启动容器..."

# 清理可能存在的网络冲突
echo "🧹 清理网络..."
docker network prune -f

# 停止并移除所有相关容器
echo "🛑 停止现有容器..."
docker-compose down

# 移除可能的孤立容器
echo "🗑️  清理孤立容器..."
docker rm -f log-service-mongodb 2>/dev/null || true
docker rm -f admin-frontend 2>/dev/null || true
docker rm -f admin-backend 2>/dev/null || true
docker rm -f log-service-app 2>/dev/null || true

# 启动所有服务
echo "🔄 启动所有容器..."
docker-compose up -d

# 等待容器启动
echo "⏳ 等待容器启动完成..."
sleep 15

# 检查容器状态
echo ""
echo "📊 容器状态检查："
echo "----------------------------------------"
docker-compose ps

echo ""
echo "🔍 健康检查："
echo "----------------------------------------"

# 检查MongoDB
if docker exec log-service-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB: 运行正常"
else
    echo "❌ MongoDB: 连接失败"
fi

# 检查后端服务
sleep 5
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ 后端服务: 运行正常"
else
    echo "❌ 后端服务: 连接失败"
fi

# 检查管理后台
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 管理后台: 运行正常"
else
    echo "❌ 管理后台: 连接失败"
fi

echo ""
echo "=================================================="
echo "           启动完成！"
echo "=================================================="
echo "📱 管理后台: http://localhost:3000"
echo "🔗 后端API:  http://localhost:8080"
echo "🗄️  MongoDB:  localhost:27017"
echo ""
echo "📋 常用命令："
echo "   查看日志: docker-compose logs -f [服务名]"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart [服务名]"
echo "=================================================="
