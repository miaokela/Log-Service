#!/bin/bash

# TypeScript gRPC 客户端设置和运行脚本

echo "=== TypeScript gRPC 客户端设置 ==="

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "错误: 请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: 请先安装 npm"
    exit 1
fi

# 安装依赖
echo "安装 TypeScript 依赖..."
npm install

# 清理之前生成的文件
echo "清理之前的生成文件..."
npm run clean || true

# 创建生成目录
mkdir -p src/generated

# 生成 protobuf TypeScript 代码
echo "生成 protobuf TypeScript 代码..."
npx grpc_tools_node_protoc \
    --proto_path=../../proto \
    --js_out=import_style=commonjs,binary:./src/generated \
    --grpc_out=grpc_js:./src/generated \
    --ts_out=grpc_js:./src/generated \
    ../../proto/log_service.proto

# 检查生成的文件
if [ -f "src/generated/log_service_pb.js" ] && [ -f "src/generated/log_service_grpc_pb.js" ]; then
    echo "✅ Protobuf 代码生成成功"
    echo "  - src/generated/log_service_pb.js"
    echo "  - src/generated/log_service_grpc_pb.js"
    echo "  - src/generated/log_service_pb.d.ts"
    echo "  - src/generated/log_service_grpc_pb.d.ts"
else
    echo "❌ Protobuf 代码生成失败"
    exit 1
fi

# 编译 TypeScript
echo "编译 TypeScript 代码..."
npm run build

if [ -f "dist/client.js" ]; then
    echo "✅ TypeScript 编译成功"
else
    echo "❌ TypeScript 编译失败"
    exit 1
fi

echo ""
echo "🚀 运行 TypeScript 客户端测试:"
echo "  npm start"
echo "  # 或者"
echo "  npm run dev"
echo ""
echo "💡 提示: 请确保日志服务正在运行 (localhost:50051)"
