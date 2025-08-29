#!/bin/bash

# Python版本的数据插入脚本
# 使用方法: ./scripts/run_insert_test_data_python.sh

set -e

echo "========================================="
echo "开始插入300万条测试数据 (Python版本)"
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

# 检查Python客户端是否已设置
if [ ! -f "clients/python/log_service_pb2.py" ]; then
    echo "设置Python客户端..."
    cd clients/python
    ./setup_and_run.sh
    cd ../..
fi

echo "开始插入数据..."
echo "预计耗时: 10-30分钟 (取决于系统性能)"
echo "========================================="

# 运行Python数据插入程序
python3 scripts/insert_test_data.py

echo "========================================="
echo "数据插入完成！"
echo "========================================="

echo "可以通过以下方式验证数据:"
echo "1. 查看管理界面: http://localhost:3000"
echo "2. 使用客户端查询: python3 clients/python/client.py"
echo "3. 直接查询MongoDB: docker exec -it gin-demo-mongo-1 mongosh log_service"
