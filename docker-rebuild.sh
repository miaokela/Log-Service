#!/bin/bash

# 日志管理系统 - 容器重新构建脚本
# 用于重新构建并启动指定的容器服务

# 显示帮助信息
show_help() {
    echo "=================================================="
    echo "       日志管理系统 - 容器重新构建"
    echo "=================================================="
    echo ""
    echo "用法: $0 [服务名...]"
    echo ""
    echo "可用服务："
    echo "  mongodb       - MongoDB 数据库"
    echo "  log-service   - 日志服务后端"
    echo "  admin-backend - 管理后台后端"
    echo "  admin-frontend- 管理后台前端"
    echo "  all          - 所有服务（默认）"
    echo ""
    echo "示例："
    echo "  $0                      # 重新构建所有服务"
    echo "  $0 all                  # 重新构建所有服务"
    echo "  $0 admin-frontend       # 只重新构建前端"
    echo "  $0 admin-backend        # 只重新构建管理后台后端"
    echo "  $0 log-service          # 只重新构建日志服务"
    echo "  $0 mongodb              # 只重新构建数据库"
    echo "  $0 admin-frontend admin-backend  # 重新构建前端和管理后台后端"
    echo ""
    echo "=================================================="
}

# 解析命令行参数
SERVICES=()
BUILD_ALL=true
REBUILD_FRONTEND=false
REBUILD_ADMIN_BACKEND=false
REBUILD_LOG_SERVICE=false
REBUILD_MONGODB=false

if [ $# -eq 0 ]; then
    BUILD_ALL=true
elif [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
else
    BUILD_ALL=false
    for arg in "$@"; do
        case $arg in
            all)
                BUILD_ALL=true
                ;;
            admin-frontend)
                REBUILD_FRONTEND=true
                SERVICES+=("admin-frontend")
                ;;
            admin-backend)
                REBUILD_ADMIN_BACKEND=true
                SERVICES+=("admin-backend")
                ;;
            log-service)
                REBUILD_LOG_SERVICE=true
                SERVICES+=("log-service")
                ;;
            mongodb)
                REBUILD_MONGODB=true
                SERVICES+=("mongodb")
                ;;
            *)
                echo "❌ 错误：未知服务 '$arg'"
                echo "运行 '$0 --help' 查看可用服务"
                exit 1
                ;;
        esac
    done
fi

# 如果选择了all，设置所有服务
if [ "$BUILD_ALL" = true ]; then
    REBUILD_FRONTEND=true
    REBUILD_ADMIN_BACKEND=true
    REBUILD_LOG_SERVICE=true
    REBUILD_MONGODB=true
    SERVICES=("mongodb" "log-service" "admin-backend" "admin-frontend")
fi

echo "=================================================="
echo "       日志管理系统 - 容器重新构建"
echo "=================================================="
echo "🎯 将要重新构建的服务: ${SERVICES[*]}"
echo ""

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

# 停止指定服务
if [ "$BUILD_ALL" = true ]; then
    echo "🛑 停止并移除所有容器..."
    docker-compose down
else
    echo "🛑 停止指定的容器..."
    for service in "${SERVICES[@]}"; do
        docker-compose stop "$service" 2>/dev/null || true
        docker-compose rm -f "$service" 2>/dev/null || true
    done
fi

# 移除孤立容器（只在构建所有服务时执行）
if [ "$BUILD_ALL" = true ]; then
    echo "🗑️  清理孤立容器..."
    docker rm -f log-service-mongodb 2>/dev/null || true
    docker rm -f admin-frontend 2>/dev/null || true
    docker rm -f log-admin-backend 2>/dev/null || true
    docker rm -f log-service-app 2>/dev/null || true
    
    # 清理网络
    echo "🧹 清理Docker网络..."
    docker network prune -f
    
    # 清理未使用的镜像
    echo "🧽 清理未使用的镜像..."
    docker image prune -f
fi

# 前端打包（只在需要构建前端时执行）
if [ "$REBUILD_FRONTEND" = true ]; then
    echo ""
    echo "📦 开始前端打包..."
    echo "----------------------------------------"
    
    # 检查是否存在前端目录
    if [ -d "admin/frontend" ]; then
        cd admin/frontend
        
        # 检查是否有 package.json
        if [ -f "package.json" ]; then
            echo "📋 安装前端依赖..."
            npm install
            
            echo "🔨 构建前端应用..."
            npm run build
            
            if [ $? -eq 0 ]; then
                echo "✅ 前端打包成功"
            else
                echo "❌ 前端打包失败"
                exit 1
            fi
        else
            echo "⚠️  警告：未找到 package.json，跳过前端打包"
        fi
        
        cd ../..
    else
        echo "⚠️  警告：未找到前端目录，跳过前端打包"
    fi
fi

# 显示构建进度
echo ""
echo "🔨 开始重新构建镜像..."
echo "----------------------------------------"

# 构建并启动指定服务
if [ "$BUILD_ALL" = true ]; then
    echo "🚀 重新构建并启动所有服务..."
    docker-compose up --build -d
else
    echo "🚀 重新构建并启动指定服务: ${SERVICES[*]}"
    docker-compose up --build -d "${SERVICES[@]}"
fi

echo ""
echo "⏳ 等待容器启动完成..."
sleep 10

# 检查容器状态
echo ""
echo "📊 容器状态检查："
echo "----------------------------------------"
docker-compose ps

echo ""
echo "🔍 健康检查："
echo "----------------------------------------"

# 检查MongoDB连接（如果MongoDB被重新构建）
if [ "$REBUILD_MONGODB" = true ]; then
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
fi

# 检查日志服务（如果日志服务被重新构建）
if [ "$REBUILD_LOG_SERVICE" = true ]; then
    echo "🔄 检查日志服务..."
    sleep 3
    if docker ps | grep -q log-service-app; then
        echo "✅ 日志服务: 容器运行正常"
    else
        echo "❌ 日志服务: 容器未运行"
    fi
fi

# 检查后端服务（如果管理后台后端被重新构建）
if [ "$REBUILD_ADMIN_BACKEND" = true ]; then
    echo "🔄 检查管理后台后端..."
    sleep 5
    for i in {1..10}; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            echo "✅ 管理后台后端: 运行正常"
            break
        else
            if [ $i -eq 10 ]; then
                echo "❌ 管理后台后端: 连接失败"
            else
                echo "⏳ 管理后台后端启动中... ($i/10)"
                sleep 3
            fi
        fi
    done
fi

# 检查前端服务（如果前端被重新构建）
if [ "$REBUILD_FRONTEND" = true ]; then
    echo "🔄 检查前端服务..."
    for i in {1..10}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ 管理后台前端: 运行正常"
            break
        else
            if [ $i -eq 10 ]; then
                echo "❌ 管理后台前端: 连接失败"
            else
                echo "⏳ 管理后台前端启动中... ($i/10)"
                sleep 2
            fi
        fi
    done
fi

# 显示构建结果
echo ""
echo "🖼️  相关镜像："
echo "----------------------------------------"
if [ "$BUILD_ALL" = true ]; then
    docker images | grep -E "(gin-demo|log-service)"
else
    for service in "${SERVICES[@]}"; do
        case $service in
            admin-frontend)
                docker images | grep "gin-demo.*frontend" || echo "  未找到前端镜像"
                ;;
            admin-backend)
                docker images | grep "gin-demo.*backend" || echo "  未找到管理后台后端镜像"
                ;;
            log-service)
                docker images | grep "gin-demo.*log-service" || echo "  未找到日志服务镜像"
                ;;
            mongodb)
                docker images | grep "mongo" || echo "  未找到MongoDB镜像"
                ;;
        esac
    done
fi

echo ""
echo "=================================================="
echo "           重新构建完成！"
echo "=================================================="
echo "🎯 已重新构建服务: ${SERVICES[*]}"
echo ""
if [ "$REBUILD_FRONTEND" = true ] || [ "$BUILD_ALL" = true ]; then
    echo "📱 管理后台: http://localhost:3000"
fi
if [ "$REBUILD_ADMIN_BACKEND" = true ] || [ "$BUILD_ALL" = true ]; then
    echo "🔗 后端API:  http://localhost:8080"
fi
if [ "$REBUILD_MONGODB" = true ] || [ "$BUILD_ALL" = true ]; then
    echo "🗄️  MongoDB:  localhost:27017"
fi
echo ""
echo "📋 测试命令："
if [ "$REBUILD_ADMIN_BACKEND" = true ] || [ "$BUILD_ALL" = true ]; then
    echo "   curl http://localhost:8080/health"
fi
if [ "$REBUILD_FRONTEND" = true ] || [ "$BUILD_ALL" = true ]; then
    echo "   curl http://localhost:3000/"
fi
echo ""
echo "📋 管理命令："
echo "   查看日志: docker-compose logs -f [服务名]"
echo "   停止服务: docker-compose stop [服务名]"
echo "   重启服务: docker-compose restart [服务名]"
echo "   查看帮助: $0 --help"
echo "=================================================="
