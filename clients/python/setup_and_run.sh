#!/bin/bash

# Python gRPC 客户端生成和运行脚本

echo "=== Python gRPC 客户端设置 ==="

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 请先安装 Python 3"
    exit 1
fi

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

# 生成 protobuf 代码
echo "生成 protobuf Python 代码..."
python -m grpc_tools.protoc \
    --proto_path=../../proto \
    --python_out=. \
    --grpc_python_out=. \
    ../../proto/log_service.proto

# 检查生成的文件
if [ -f "log_service_pb2.py" ] && [ -f "log_service_pb2_grpc.py" ]; then
    echo "✅ Protobuf 代码生成成功"
    echo "  - log_service_pb2.py"
    echo "  - log_service_pb2_grpc.py"
else
    echo "❌ Protobuf 代码生成失败"
    exit 1
fi

echo ""
echo "🚀 运行 Python 客户端测试:"
echo "  python client.py"
echo ""
echo "💡 提示: 请确保日志服务正在运行 (localhost:50051)"
