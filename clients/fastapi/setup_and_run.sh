#!/bin/bash

# FastAPI Log Service 设置和运行脚本

echo "=== FastAPI Log Service 设置和运行脚本 ==="

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

# 检查依赖是否安装成功
echo "检查 FastAPI 安装..."
python -c "import fastapi; print(f'FastAPI 版本: {fastapi.__version__}')"

echo "检查 gRPC 安装..."
python -c "import grpc; print('gRPC 已安装')"

echo ""
echo "=== 设置完成 ==="
echo ""
echo "启动 FastAPI 开发服务器..."
echo "服务器将在 http://127.0.0.1:8001 启动"
echo ""
echo "可用的 API 接口："
echo "  POST /api/v1/logs/write           - 单条日志写入 (异步)"
echo "  POST /api/v1/logs/batch           - 批量日志写入 (异步)"
echo "  POST /api/v1/logs/concurrent-test - 并发写入测试 (1万次异步)"
echo "  GET  /api/v1/logs/health          - 健康检查"
echo ""
echo "API 文档："
echo "  Swagger UI: http://127.0.0.1:8001/docs"
echo "  ReDoc:      http://127.0.0.1:8001/redoc"
echo ""

# 启动 FastAPI 开发服务器
python main.py
