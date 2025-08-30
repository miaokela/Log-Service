#!/bin/bash

# Django Log Service Setup and Run Script

echo "=== Django Log Service 设置和运行脚本 ==="

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "安装 Python 依赖..."
pip install -r requirements.txt

# 检查 Django 项目
echo "检查 Django 项目配置..."
python manage.py check

# 创建数据库迁移（如果需要）
echo "创建数据库迁移..."
python manage.py makemigrations

# 应用数据库迁移
echo "应用数据库迁移..."
python manage.py migrate

echo ""
echo "=== 设置完成 ==="
echo ""
echo "启动 Django 开发服务器..."
echo "服务器将在 http://127.0.0.1:8000 启动"
echo ""
echo "可用的 API 接口："
echo "  POST /api/write_log/          - 单条日志写入"
echo "  POST /api/batch_write_test/   - 批量写入测试"
echo "  POST /api/concurrent_test/    - 并发写入测试（1万次）"
echo ""

# 启动 Django 开发服务器
python manage.py runserver

# Copy protobuf files from python client
echo "Copying protobuf files..."
cp ../python/log_service_pb2.py .
cp ../python/log_service_pb2_grpc.py .

# Run Django project
echo "Starting Django development server..."
python manage.py runserver 8000
