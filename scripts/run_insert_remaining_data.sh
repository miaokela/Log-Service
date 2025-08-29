#!/bin/bash

# 继续插入剩余数据的脚本
# 使用方法: ./scripts/run_insert_remaining_data.sh

set -e

echo "========================================="
echo "继续插入剩余测试数据"
echo "当前已有约40万条，继续插入260万条"
echo "========================================="

# 检查服务是否运行
echo "检查gRPC服务是否运行..."
if ! nc -z localhost 50051; then
    echo "错误: gRPC服务 (localhost:50051) 未运行"
    echo "请先启动服务: docker-compose up -d 或 ./start.sh"
    exit 1
fi

echo "gRPC服务运行正常"

# 进入项目根目录
cd "$(dirname "$0")/.."

# 先查看当前数据量
echo "查看当前数据量..."
CURRENT_COUNT=$(docker exec -it log-service-mongodb mongosh --authenticationDatabase admin -u admin -p password123 log_service --eval "db.logs.countDocuments({service_name: 'zhenhaotou'})" --quiet)
echo "当前zhenhaotou服务日志数量: $CURRENT_COUNT"

# 构建并运行数据插入程序
echo "构建剩余数据插入程序..."
go build -o bin/insert_remaining_data scripts/insert_remaining_data.go

echo "开始插入剩余数据..."
echo "配置: 批次大小=200, 并发数=3, 间隔=100ms"
echo "预计耗时: 30-60分钟"
echo "========================================="

# 运行数据插入程序
./bin/insert_remaining_data

echo "========================================="
echo "数据插入完成！"

# 查看最终数据量
FINAL_COUNT=$(docker exec -it log-service-mongodb mongosh --authenticationDatabase admin -u admin -p password123 log_service --eval "db.logs.countDocuments({service_name: 'zhenhaotou'})" --quiet)
echo "最终zhenhaotou服务日志数量: $FINAL_COUNT"
echo "========================================="

# 清理二进制文件
rm -f bin/insert_remaining_data

echo "可以通过以下方式验证数据:"
echo "1. 查看管理界面: http://localhost:3000"
echo "2. 使用客户端查询: go run examples/client.go"
echo "3. 直接查询MongoDB: docker exec -it gin-demo-mongo-1 mongosh log_service"
