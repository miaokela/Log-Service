#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简单测试脚本 - 直接测试 write_log 函数
不依赖 Django 服务器，直接连接 gRPC 服务
"""

import sys
import os

# 添加当前目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'log_service_django.settings')

import django
django.setup()

from log_client.client import write_log
import log_service_pb2
import time
import random
import concurrent.futures
from datetime import datetime


def test_write_log_function():
    """测试 write_log 函数"""
    print("=== 测试 write_log 函数 ===")
    
    # 测试基本功能
    result = write_log(
        "测试消息：基本功能测试",
        service_name="django-direct-test",
        level="INFO",
        trace_id="direct-trace-001",
        span_id="direct-span-001",
        adv_id=1234567,
        aweme_id=987654321,
        plan_id=12345,
        monitor_type="impression",
        co_id=5678,
        test_type="direct_function_call"
    )
    
    print(f"测试结果: {result}")
    return result.get('success', False)


def test_concurrent_write_log(count: int = 1000):
    """测试并发调用 write_log 函数"""
    print(f"\n=== 并发测试 write_log 函数 ({count} 次调用) ===")
    
    def write_single_log(index):
        """写入单条日志"""
        try:
            return write_log(
                f"并发测试消息 {index}",
                service_name="django-concurrent-direct",
                level=random.choice(["DEBUG", "INFO", "WARN", "ERROR"]),
                trace_id=f"concurrent-direct-{index:06d}",
                span_id=f"span-{index:06d}",
                adv_id=random.randint(1000000, 9999999),
                aweme_id=random.randint(100000000, 999999999),
                plan_id=random.randint(10000, 99999),
                monitor_type=random.choice(["impression", "click", "conversion", "view"]),
                co_id=random.randint(1000, 9999),
                index=index,
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            return {
                'success': False,
                'log_id': '',
                'error_message': str(e)
            }
    
    start_time = time.time()
    results = []
    
    # 使用线程池进行并发测试
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        future_to_index = {
            executor.submit(write_single_log, i): i 
            for i in range(1, count + 1)
        }
        
        for future in concurrent.futures.as_completed(future_to_index):
            try:
                result = future.result()
                results.append(result)
                
                if len(results) % 100 == 0:
                    print(f"已完成: {len(results)}/{count}")
            
            except Exception as e:
                results.append({
                    'success': False,
                    'log_id': '',
                    'error_message': str(e)
                })
    
    end_time = time.time()
    duration = end_time - start_time
    
    success_count = sum(1 for r in results if r.get('success'))
    failed_count = count - success_count
    
    print(f"\n并发测试结果:")
    print(f"总耗时: {duration:.3f} 秒")
    print(f"成功写入: {success_count}/{count}")
    print(f"失败写入: {failed_count}")
    print(f"写入速度: {success_count / duration:.2f} logs/second")
    
    # 显示失败示例
    failed_results = [r for r in results if not r.get('success')]
    if failed_results:
        print("\n失败示例:")
        for i, result in enumerate(failed_results[:5], 1):
            print(f"  {i}. {result.get('error_message', 'Unknown error')}")
    
    return success_count > count * 0.9  # 成功率超过90%认为测试通过


def test_large_scale_concurrent(count: int = 10000):
    """大规模并发测试"""
    print(f"\n=== 大规模并发测试 ({count} 次调用) ===")
    
    def write_batch_logs(start_index, batch_size):
        """批量写入日志"""
        results = []
        for i in range(start_index, start_index + batch_size):
            try:
                result = write_log(
                    f"大规模测试消息 {i}",
                    service_name="django-large-scale",
                    level=random.choice(["DEBUG", "INFO", "WARN", "ERROR"]),
                    trace_id=f"large-scale-{i:06d}",
                    span_id=f"span-{i:06d}",
                    adv_id=random.randint(1000000, 9999999),
                    aweme_id=random.randint(100000000, 999999999),
                    plan_id=random.randint(10000, 99999),
                    monitor_type=random.choice(["impression", "click", "conversion", "view"]),
                    co_id=random.randint(1000, 9999),
                    batch_index=start_index // 100,
                    item_index=i,
                    timestamp=datetime.now().isoformat()
                )
                results.append(result)
            except Exception as e:
                results.append({
                    'success': False,
                    'log_id': '',
                    'error_message': str(e)
                })
        return results
    
    start_time = time.time()
    all_results = []
    
    # 分批处理，每批100条
    batch_size = 100
    max_workers = 50
    
    batches = [(i, min(batch_size, count - i)) for i in range(0, count, batch_size)]
    
    print(f"分为 {len(batches)} 个批次，每批最多 {batch_size} 条日志")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_batch = {
            executor.submit(write_batch_logs, start_idx, size): (start_idx, size)
            for start_idx, size in batches
        }
        
        completed_batches = 0
        for future in concurrent.futures.as_completed(future_to_batch):
            try:
                batch_results = future.result()
                all_results.extend(batch_results)
                
                completed_batches += 1
                if completed_batches % 10 == 0:
                    print(f"已完成批次: {completed_batches}/{len(batches)}")
            
            except Exception as e:
                print(f"批次处理失败: {e}")
    
    end_time = time.time()
    duration = end_time - start_time
    
    success_count = sum(1 for r in all_results if r.get('success'))
    failed_count = len(all_results) - success_count
    
    print(f"\n大规模测试结果:")
    print(f"总耗时: {duration:.3f} 秒")
    print(f"实际处理: {len(all_results)} 条")
    print(f"成功写入: {success_count}")
    print(f"失败写入: {failed_count}")
    print(f"成功率: {success_count / len(all_results) * 100:.2f}%")
    print(f"写入速度: {success_count / duration:.2f} logs/second")
    
    return success_count > len(all_results) * 0.95  # 成功率超过95%


def main():
    """主函数"""
    print("=== Django Log Service 直接函数测试 ===")
    print("注意：此测试直接调用 write_log 函数，需要 gRPC 服务器运行")
    print()
    
    try:
        # 测试1: 基本功能
        if test_write_log_function():
            print("✅ 基本功能测试通过")
        else:
            print("❌ 基本功能测试失败")
            return
        
        # 测试2: 中等规模并发
        if test_concurrent_write_log(1000):
            print("✅ 中等规模并发测试通过")
        else:
            print("❌ 中等规模并发测试失败")
        
        # 询问是否进行大规模测试
        choice = input("\n是否进行大规模测试 (1万次并发)? [y/N]: ").lower()
        if choice == 'y':
            if test_large_scale_concurrent(10000):
                print("✅ 大规模并发测试通过")
            else:
                print("❌ 大规模并发测试失败")
        
        print("\n🎉 测试完成!")
    
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")


if __name__ == "__main__":
    main()
