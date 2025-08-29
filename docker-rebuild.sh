#!/bin/bash

# 日志管理系统 - 容器重新构建脚本
# 用于重新构建并启动所有容器服务

echo "=================================================="
echo "       日志管理系统 - 容器重新构建"
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

echo "🛑 停止并移除所有容器..."

# 停止所有容器
docker-compose down

# 移除孤立容器
echo "🗑️  清理孤立容器..."
docker rm -f log-service-mongodb 2>/dev/null || true
docker rm -f admin-frontend 2>/dev/null || true
docker rm -f admin-backend 2>/dev/null || true
docker rm -f log-service-app 2>/dev/null || true

# 清理网络
echo "🧹 清理Docker网络..."
docker network prune -f

# 清理未使用的镜像
echo "🧽 清理未使用的镜像..."
docker image prune -f

# 显示构建进度
echo ""
echo "🔨 开始重新构建镜像..."
echo "----------------------------------------"

# 重新构建并启动所有服务
docker-compose up --build -d

echo ""
echo "⏳ 等待容器启动完成..."
sleep 20

# 检查容器状态
echo ""
echo "📊 容器状态检查："
echo "----------------------------------------"
docker-compose ps

echo ""
echo "🔍 健康检查："
echo "----------------------------------------"

# 检查MongoDB连接
echo "🔄 等待MongoDB启动..."
for i in {1..30}; do
    if docker exec log-service-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo "✅ MongoDB: 运行正常"
        break
    else
        if [ $i -eq 30 ]; then
            echo "❌ MongoDB: 启动超时"
        else
            echo "⏳ MongoDB启动中... ($i/30)"
            sleep 2
        fi
    fi
done

# 检查后端服务
echo "🔄 检查后端服务..."
sleep 5
for i in {1..10}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ 后端服务: 运行正常"
        break
    else
        if [ $i -eq 10 ]; then
            echo "❌ 后端服务: 连接失败"
        else
            echo "⏳ 后端服务启动中... ($i/10)"
            sleep 3
        fi
    fi
done

# 检查前端服务
echo "🔄 检查前端服务..."
for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ 管理后台: 运行正常"
        break
    else
        if [ $i -eq 10 ]; then
            echo "❌ 管理后台: 连接失败"
        else
            echo "⏳ 管理后台启动中... ($i/10)"
            sleep 2
        fi
    fi
done

# 显示镜像信息
echo ""
echo "🖼️  构建的镜像："
echo "----------------------------------------"
docker images | grep -E "(gin-demo|log-service)"

echo ""
echo "=================================================="
echo "           重新构建完成！"
echo "=================================================="
echo "📱 管理后台: http://localhost:3000"
echo "🔗 后端API:  http://localhost:8080"
echo "🗄️  MongoDB:  localhost:27017"
echo ""
echo "📋 测试命令："
echo "   curl http://localhost:8080/health"
echo "   curl http://localhost:3000/api/stats/"
echo "   curl http://localhost:3000/api/indexes/"
echo ""
echo "📋 管理命令："
echo "   查看日志: docker-compose logs -f [服务名]"
echo "   停止服务: docker-compose down"
echo "   重启服务: docker-compose restart [服务名]"
echo "=================================================="
