#!/bin/bash

# Admin 服务验证脚本

echo "🔍 验证 Admin 服务..."

# 检查后端健康状态
echo "检查后端服务..."
backend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ "$backend_health" = "200" ]; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常 (HTTP $backend_health)"
fi

# 检查前端服务
echo "检查前端服务..."
frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$frontend_health" = "200" ]; then
    echo "✅ 前端服务正常"
else
    echo "❌ 前端服务异常 (HTTP $frontend_health)"
fi

# 测试API接口
echo "测试API接口..."

# 获取统计信息
stats_response=$(curl -s http://localhost:8080/api/stats)
if [ $? -eq 0 ]; then
    echo "✅ 统计接口正常"
    echo "   统计数据: $stats_response"
else
    echo "❌ 统计接口异常"
fi

# 创建测试日志
echo "创建测试日志..."
test_log='{"service_name":"test-service","level":"INFO","message":"Admin验证测试日志","metadata":{"test":"true"}}'
create_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$test_log" \
  http://localhost:8080/api/logs)

if [ $? -eq 0 ]; then
    echo "✅ 日志创建接口正常"
    echo "   创建结果: $create_response"
else
    echo "❌ 日志创建接口异常"
fi

# 查询日志
echo "查询日志..."
query_response=$(curl -s "http://localhost:8080/api/logs?limit=5")
if [ $? -eq 0 ]; then
    echo "✅ 日志查询接口正常"
    echo "   查询到 $(echo $query_response | grep -o '"total":[0-9]*' | cut -d':' -f2) 条日志"
else
    echo "❌ 日志查询接口异常"
fi

echo ""
echo "🎯 验证完成！"
echo "如果所有服务都正常，可以访问 http://localhost:3000 使用管理界面"
