#!/bin/bash

# Log Service Admin 启动脚本

echo "🚀 启动 Log Service Admin..."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 停止并清理现有容器
echo "🧹 清理现有容器..."
docker-compose down

# 构建并启动所有服务
echo "🔨 构建并启动服务..."
docker-compose up --build -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 20

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

echo ""
echo "✅ 服务启动完成！"
echo ""
echo "📊 访问地址："
echo "  - Admin 前端: http://localhost:3000"
echo "  - Admin 后端: http://localhost:8080"
echo "  - Log Service: grpc://localhost:50051"
echo "  - MongoDB: mongodb://localhost:27017"
echo ""
echo "🔧 管理命令："
echo "  - 查看日志: docker-compose logs -f [service_name]"
echo "  - 停止服务: docker-compose down"
echo "  - 重启服务: docker-compose restart [service_name]"
echo ""
