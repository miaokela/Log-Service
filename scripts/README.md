# 测试数据插入脚本

本目录包含了用于插入300万条测试数据的脚本，服务名称为 `zhenhaotou`，包含随机生成的 `adv_id`、`aweme_id`、`plan_id` 等元数据。

## ✅ 当前状态

**已完成**: 成功插入了约40万条测试数据
**待完成**: 剩余260万条数据

## 脚本说明

### Go版本 (推荐)
- **初始脚本**: `insert_test_data.go` - 已完成40万条数据插入
- **继续脚本**: `insert_remaining_data.go` - 用于插入剩余260万条数据
- **运行初始**: `./scripts/run_insert_test_data.sh`
- **运行剩余**: `./scripts/run_insert_remaining_data.sh`
- **特点**: 
  - 优化后的批量插入，减少服务器压力
  - 调整并发数和批次大小避免队列满
  - 添加批次间延迟控制

### Python版本 (备选)
- **脚本**: `insert_test_data.py`  
- **运行**: `./scripts/run_insert_test_data_python.sh`
- **特点**:
  - 使用gRPC Python客户端
  - 线程池并发处理
  - 自动设置Python环境

## 使用方法

### 1. 确保服务运行
```bash
# 启动所有服务
docker-compose up -d

# 或者使用脚本启动
./start.sh
```

### 2. 运行数据插入 (选择其一)

#### Go版本 (推荐)
```bash
./scripts/run_insert_test_data.sh
```

#### Python版本
```bash
./scripts/run_insert_test_data_python.sh
```

## 数据格式

插入的测试数据包含以下字段：

```json
{
  "service_name": "zhenhaotou",
  "level": "INFO|DEBUG|WARN|ERROR|FATAL",
  "message": "随机日志消息 - 编号",
  "timestamp": "2024-08-29T10:30:00Z",
  "metadata": {
    "adv_id": "adv_1724912345_123456",
    "aweme_id": "aweme_1724912345_789012", 
    "plan_id": "plan_1724912345_345678",
    "user_id": "12345",
    "region": "北京|上海|广州|深圳|杭州",
    "platform": "iOS|Android|Web|Desktop"
  },
  "trace_id": "trace_1724912345_456789",
  "span_id": "span_1724912345_012345"
}
```

## 性能参数

- **总记录数**: 3,000,000 条
- **批次大小**: 1,000 条/批次  
- **并发数**: 10 个协程/线程
- **预计时间**: 10-30 分钟
- **预计速度**: 2,000-5,000 条/秒

## 验证数据

插入完成后，可以通过以下方式验证：

### 1. Web管理界面
```
http://localhost:3000
```

### 2. 命令行查询
```bash
# Go客户端
go run examples/client.go

# Python客户端  
python3 clients/python/client.py
```

### 3. 直接查询MongoDB
```bash
# 进入MongoDB容器
docker exec -it gin-demo-mongo-1 mongosh log_service

# 查询记录数
db.logs.countDocuments({service_name: "zhenhaotou"})

# 查看示例数据
db.logs.findOne({service_name: "zhenhaotou"})
```

## 故障排除

### 连接失败
- 确保gRPC服务在端口50051运行
- 检查Docker容器状态：`docker-compose ps`

### 插入速度慢
- 可以调整批次大小和并发数
- 检查系统资源使用情况
- 确保MongoDB有足够磁盘空间

### Python依赖问题
- 运行 `cd clients/python && ./setup_and_run.sh` 安装依赖
- 确保protobuf文件已生成
