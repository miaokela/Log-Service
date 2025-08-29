#!/usr/bin/env python3
"""
插入300万条测试数据到日志服务
服务名称: zhenhaotou
包含字段: adv_id, aweme_id, plan_id (随机生成)
"""

import grpc
import random
import string
import time
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import sys
import os

# 添加proto文件路径
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'clients', 'python'))

try:
    import log_service_pb2
    import log_service_pb2_grpc
except ImportError:
    print("错误: 无法导入protobuf文件")
    print("请确保已经生成了Python的protobuf文件")
    print("运行: cd clients/python && ./setup_and_run.sh")
    sys.exit(1)

# 配置常量
TOTAL_RECORDS = 3000000  # 300万条记录
BATCH_SIZE = 1000        # 每批1000条
MAX_WORKERS = 10         # 最大并发数
SERVICE_NAME = "zhenhaotou"
GRPC_ADDRESS = "localhost:50051"

# 日志级别
LOG_LEVELS = [
    log_service_pb2.DEBUG,
    log_service_pb2.INFO,
    log_service_pb2.WARN,
    log_service_pb2.ERROR,
    log_service_pb2.FATAL
]

# 日志消息模板
LOG_MESSAGES = [
    "用户访问页面",
    "API请求处理", 
    "数据库查询执行",
    "缓存更新操作",
    "文件上传完成",
    "用户登录成功",
    "订单创建完成",
    "支付处理成功",
    "数据同步完成",
    "任务执行结束"
]

class DataInserter:
    def __init__(self):
        self.channel = None
        self.stub = None
        self.total_inserted = 0
        self.start_time = None
        self.lock = threading.Lock()
        
    def connect(self):
        """连接到gRPC服务"""
        print(f"连接到gRPC服务器: {GRPC_ADDRESS}")
        self.channel = grpc.insecure_channel(GRPC_ADDRESS)
        self.stub = log_service_pb2_grpc.LogServiceStub(self.channel)
        
        # 测试连接
        try:
            response = self.stub.WriteLog(log_service_pb2.WriteLogRequest(
                log_entry=self.generate_log_entry()
            ))
            if response.success:
                print(f"连接测试成功，日志ID: {response.log_id}")
            else:
                raise Exception(f"测试写入失败: {response.error_message}")
        except Exception as e:
            print(f"连接测试失败: {e}")
            raise
    
    def generate_random_id(self, prefix):
        """生成随机ID"""
        timestamp = str(int(time.time() * 1000000))
        random_suffix = ''.join(random.choices(string.digits, k=6))
        return f"{prefix}_{timestamp}_{random_suffix}"
    
    def generate_log_entry(self):
        """生成随机日志条目"""
        # 生成随机时间戳（最近30天内）
        now = datetime.now()
        random_days = random.randint(0, 29)
        random_hours = random.randint(0, 23)
        random_minutes = random.randint(0, 59)
        random_seconds = random.randint(0, 59)
        
        timestamp = now - timedelta(
            days=random_days,
            hours=random_hours, 
            minutes=random_minutes,
            seconds=random_seconds
        )
        
        return log_service_pb2.LogEntry(
            service_name=SERVICE_NAME,
            level=random.choice(LOG_LEVELS),
            message=f"{random.choice(LOG_MESSAGES)} - {random.randint(1, 10000)}",
            timestamp=timestamp.isoformat(),
            metadata={
                "adv_id": self.generate_random_id("adv"),
                "aweme_id": self.generate_random_id("aweme"), 
                "plan_id": self.generate_random_id("plan"),
                "user_id": str(random.randint(1, 100000)),
                "region": random.choice(["北京", "上海", "广州", "深圳", "杭州"]),
                "platform": random.choice(["iOS", "Android", "Web", "Desktop"])
            },
            trace_id=self.generate_random_id("trace"),
            span_id=self.generate_random_id("span")
        )
    
    def insert_batch(self, batch_num, batch_size):
        """插入一批数据"""
        try:
            # 生成批次数据
            log_entries = []
            for _ in range(batch_size):
                log_entries.append(self.generate_log_entry())
            
            # 执行批量插入
            response = self.stub.BatchWriteLog(log_service_pb2.BatchWriteLogRequest(
                log_entries=log_entries
            ))
            
            if response.success:
                with self.lock:
                    self.total_inserted += len(log_entries)
                    if batch_num % 100 == 0:
                        elapsed = time.time() - self.start_time
                        rate = self.total_inserted / elapsed
                        print(f"批次 {batch_num}: 已插入 {self.total_inserted:,} 条记录, "
                              f"速度: {rate:.0f} 条/秒")
                return True
            else:
                print(f"批次 {batch_num} 失败: {response.error_message}")
                return False
                
        except Exception as e:
            print(f"批次 {batch_num} 异常: {e}")
            return False
    
    def run_insertion(self):
        """运行数据插入"""
        print(f"开始插入测试数据...")
        print(f"配置: 总记录数={TOTAL_RECORDS:,}, 批次大小={BATCH_SIZE}, 并发数={MAX_WORKERS}")
        
        self.start_time = time.time()
        
        # 计算批次数
        total_batches = (TOTAL_RECORDS + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"将执行 {total_batches} 个批次")
        
        # 使用线程池执行批量插入
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = []
            
            for batch_num in range(total_batches):
                # 计算当前批次大小
                remaining = TOTAL_RECORDS - batch_num * BATCH_SIZE
                current_batch_size = min(BATCH_SIZE, remaining)
                
                future = executor.submit(self.insert_batch, batch_num + 1, current_batch_size)
                futures.append(future)
            
            # 等待所有任务完成
            success_count = 0
            for future in futures:
                if future.result():
                    success_count += 1
        
        # 输出统计信息
        duration = time.time() - self.start_time
        print("\n" + "="*50)
        print("数据插入完成！")
        print(f"成功批次: {success_count}/{total_batches}")
        print(f"插入记录: {self.total_inserted:,}/{TOTAL_RECORDS:,}")
        print(f"总耗时: {duration:.2f} 秒")
        print(f"插入速度: {self.total_inserted/duration:.0f} 条/秒")
        print("="*50)
    
    def close(self):
        """关闭连接"""
        if self.channel:
            self.channel.close()

def main():
    inserter = DataInserter()
    
    try:
        inserter.connect()
        inserter.run_insertion()
    except KeyboardInterrupt:
        print("\n中断插入操作...")
    except Exception as e:
        print(f"插入失败: {e}")
        sys.exit(1)
    finally:
        inserter.close()
    
    print("\n可以通过以下方式验证数据:")
    print("1. 查看管理界面: http://localhost:3000")
    print("2. 使用客户端查询: python clients/python/client.py")
    print("3. 直接查询MongoDB")

if __name__ == "__main__":
    main()
