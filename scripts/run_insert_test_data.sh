#!/bin/bash

# 插入测试数据脚本
# 使用方法: ./scripts/run_insert_test_data.sh

set -e

echo "========================================="
echo "开始插入300万条测试数据"
echo "服务名称: zhenhaotou"
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

# 构建并运行数据插入程序
echo "构建数据插入程序..."
go build -o bin/insert_test_data scripts/insert_test_data.go

echo "开始插入数据..."
echo "预计耗时: 10-30分钟 (取决于系统性能)"
echo "========================================="

# 运行数据插入程序
./bin/insert_test_data

echo "========================================="
echo "数据插入完成！"
echo "========================================="

# 清理二进制文件
rm -f bin/insert_test_data

echo "可以通过以下方式验证数据:"
echo "1. 查看管理界面: http://localhost:3000"
echo "2. 使用客户端查询: go run examples/client.go"
echo "3. 直接查询MongoDB: docker exec -it gin-demo-mongo-1 mongosh log_service"
