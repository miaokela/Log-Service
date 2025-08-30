#!/bin/bash

echo "=== Django Log Service 项目验证 ==="
echo ""

# 检查项目结构
echo "📁 检查项目结构:"
echo "Django 项目目录: $(pwd)"

required_files=(
    "manage.py"
    "requirements.txt" 
    "setup_and_run.sh"
    "test_client.py"
    "direct_test.py"
    "README.md"
    "log_service_django/settings.py"
    "log_service_django/urls.py"
    "log_client/client.py"
    "log_client/views.py"
    "log_client/urls.py"
    "log_client/log_service_pb2.py"
    "log_client/log_service_pb2_grpc.py"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
        missing_files+=("$file")
    fi
done

echo ""

if [ ${#missing_files[@]} -eq 0 ]; then
    echo "🎉 所有必需文件都存在!"
else
    echo "⚠️  缺失 ${#missing_files[@]} 个文件"
    echo "缺失的文件:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
fi

echo ""
echo "📋 项目功能概述:"
echo ""
echo "1. 🔧 核心功能:"
echo "   - 封装的 write_log() 函数"
echo "   - 线程安全的 gRPC 客户端"
echo "   - 自动参数分类 (gRPC参数 vs metadata)"
echo ""
echo "2. 🌐 API 接口:"
echo "   - POST /api/write_log/          # 单条日志写入"
echo "   - POST /api/batch_write_test/   # 批量写入测试"
echo "   - POST /api/concurrent_test/    # 并发写入测试 (1万次)"
echo ""
echo "3. 🧪 测试工具:"
echo "   - ./test_client.py              # HTTP API 测试"
echo "   - ./direct_test.py              # 直接函数测试"
echo ""
echo "4. 📊 支持的 metadata 字段:"
echo "   - adv_id, aweme_id, plan_id, monitor_type, co_id"
echo "   - 以及任意自定义字段"
echo ""
echo "=== 使用说明 ==="
echo ""
echo "1. 启动 gRPC 日志服务 (在项目根目录):"
echo "   cd ../../ && go run main.go"
echo ""
echo "2. 启动 Django 服务:"
echo "   ./setup_and_run.sh"
echo ""
echo "3. 运行测试:"
echo "   # HTTP API 测试"
echo "   ./test_client.py"
echo "   "
echo "   # 直接函数测试"
echo "   ./direct_test.py"
echo ""
echo "4. 手动测试 API:"
echo "   curl -X POST http://127.0.0.1:8000/api/write_log/ \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"message\": \"测试消息\", \"adv_id\": 123, \"monitor_type\": \"click\"}'"
echo ""
echo "详细文档请查看: README.md"
