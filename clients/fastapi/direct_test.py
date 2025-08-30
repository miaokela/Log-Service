#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI 直接异步函数测试脚本
直接测试异步 write_log 函数，不依赖 HTTP 服务器
包含异步执行验证和线程非阻塞测试
"""

import sys
import os
import asyncio
import time
import random
import threading
import concurrent.futures
from datetime import datetime, timezone
from typing import List, Dict, Any

# 添加当前目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.log_client import write_log, batch_write_logs, get_log_client


# 全局变量用于监控异步执行
execution_log = []
thread_usage = {}


def log_execution(event_type: str, thread_id: int, timestamp: float, details: str = ""):
    """记录执行事件，用于分析异步行为"""
    execution_log.append({
        'event_type': event_type,
        'thread_id': thread_id,
        'timestamp': timestamp,
        'details': details,
        'readable_time': datetime.fromtimestamp(timestamp).strftime('%H:%M:%S.%f')[:-3]
    })
    
    if thread_id not in thread_usage:
        thread_usage[thread_id] = 0
    thread_usage[thread_id] += 1


async def test_async_execution_verification():
    """验证异步执行的非阻塞特性"""
    print("=== 🔍 异步执行验证测试 ===")
    print("此测试验证异步调用是否真正非阻塞，是否在不同线程中执行\n")
    
    main_thread_id = threading.get_ident()
    log_execution("test_start", main_thread_id, time.time(), "主测试线程")
    
    # 创建多个异步任务，记录它们的执行情况
    async def traced_write_log(index: int, delay: float = 0):
        """带追踪的异步日志写入"""
        current_thread = threading.get_ident()
        start_time = time.time()
        
        log_execution("task_start", current_thread, start_time, f"任务{index}开始")
        
        # 可选的延迟来观察并发
        if delay > 0:
            await asyncio.sleep(delay)
        
        try:
            result = await write_log(
                f"异步验证测试消息 {index}",
                service_name="async-verification-test",
                task_id=index,
                thread_id=current_thread,
                start_timestamp=start_time
            )
            
            end_time = time.time()
            log_execution("task_complete", current_thread, end_time, 
                         f"任务{index}完成，耗时{end_time-start_time:.3f}s")
            
            return result
            
        except Exception as e:
            end_time = time.time()
            log_execution("task_error", current_thread, end_time, 
                         f"任务{index}失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # 1. 测试简单的非阻塞异步调用
    print("📍 测试1: 简单异步调用验证")
    task1 = traced_write_log(1)
    task2 = traced_write_log(2)
    task3 = traced_write_log(3)
    
    start_concurrent = time.time()
    results = await asyncio.gather(task1, task2, task3)
    end_concurrent = time.time()
    
    print(f"✅ 3个任务并发执行完成，总耗时: {end_concurrent - start_concurrent:.3f}秒")
    
    # 2. 测试带延迟的异步调用（更明显的并发效果）
    print("\n📍 测试2: 带延迟的并发异步调用")
    delayed_tasks = [
        traced_write_log(f"delayed-{i}", delay=0.1) 
        for i in range(5)
    ]
    
    start_delayed = time.time()
    delayed_results = await asyncio.gather(*delayed_tasks)
    end_delayed = time.time()
    
    print(f"✅ 5个带延迟任务并发执行完成，总耗时: {end_delayed - start_delayed:.3f}秒")
    print(f"   如果是串行执行，预期耗时应该 > 0.5秒")
    print(f"   实际并发执行耗时: {end_delayed - start_delayed:.3f}秒")
    
    # 3. 分析执行线程使用情况
    print(f"\n📊 线程使用分析:")
    print(f"主线程ID: {main_thread_id}")
    print(f"使用的线程数量: {len(thread_usage)}")
    for thread_id, count in thread_usage.items():
        thread_type = "主线程" if thread_id == main_thread_id else "工作线程"
        print(f"  线程{thread_id} ({thread_type}): 执行了 {count} 个事件")
    
    # 4. 时间轴分析
    print(f"\n📅 执行时间轴分析:")
    execution_log.sort(key=lambda x: x['timestamp'])
    
    start_time = execution_log[0]['timestamp'] if execution_log else time.time()
    overlapping_tasks = 0
    
    for i, event in enumerate(execution_log[-10:]):  # 显示最后10个事件
        relative_time = (event['timestamp'] - start_time) * 1000  # 转换为毫秒
        print(f"  {relative_time:6.1f}ms [{event['thread_id']}] {event['event_type']}: {event['details']}")
    
    # 5. 检查真正的并发性
    task_starts = [e for e in execution_log if e['event_type'] == 'task_start']
    if len(task_starts) >= 2:
        # 检查是否有任务几乎同时开始（证明非阻塞）
        time_diffs = []
        for i in range(1, len(task_starts)):
            diff = (task_starts[i]['timestamp'] - task_starts[i-1]['timestamp']) * 1000
            time_diffs.append(diff)
        
        avg_start_diff = sum(time_diffs) / len(time_diffs)
        print(f"\n⚡ 并发性分析:")
        print(f"  任务启动平均间隔: {avg_start_diff:.2f}毫秒")
        if avg_start_diff < 10:  # 小于10毫秒认为是真正并发
            print(f"  ✅ 确认为真正的异步并发执行 (间隔 < 10ms)")
        else:
            print(f"  ⚠️  可能存在阻塞，任务启动间隔较大")
    
    return len([r for r in results + delayed_results if r.get('success', False)])


async def test_write_log_function():
    """测试异步 write_log 函数"""
    print("\n=== 测试异步 write_log 函数 ===")
    
    # 测试基本功能
    result = await write_log(
        "测试消息：FastAPI异步基本功能测试",
        service_name="fastapi-direct-test",
        level="INFO",
        trace_id="direct-trace-001",
        span_id="direct-span-001",
        adv_id=1234567,
        aweme_id=987654321,
        plan_id=12345,
        monitor_type="impression",
        co_id=5678,
        test_type="direct_async_function_call",
        client_type="fastapi_async"
    )
    
    print(f"测试结果: {result}")
    return result.get('success', False)


async def test_concurrent_write_log(count: int = 1000):
    """测试并发异步调用 write_log 函数"""
    print(f"\n=== 并发测试异步 write_log 函数 ({count} 次调用) ===")
    
    async def write_single_log(index: int):
        """写入单条异步日志"""
        try:
            return await write_log(
                f"FastAPI异步并发测试消息 {index}",
                service_name="fastapi-concurrent-direct",
                level=random.choice(["DEBUG", "INFO", "WARN", "ERROR"]),
                trace_id=f"concurrent-direct-{index:06d}",
                span_id=f"span-{index:06d}",
                adv_id=random.randint(1000000, 9999999),
                aweme_id=random.randint(100000000, 999999999),
                plan_id=random.randint(10000, 99999),
                monitor_type=random.choice(["impression", "click", "conversion", "view"]),
                co_id=random.randint(1000, 9999),
                index=index,
                timestamp=datetime.now().isoformat(),
                client_type="fastapi_async_direct"
            )
        except Exception as e:
            return {
                'success': False,
                'log_id': '',
                'error_message': str(e)
            }
    
    start_time = time.time()
    
    # 创建并发任务
    tasks = [write_single_log(i) for i in range(1, count + 1)]
    
    # 并发执行所有任务
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # 统计结果
    success_count = 0
    failed_count = 0
    errors = []
    
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            failed_count += 1
            errors.append(f"Task {i+1}: {str(result)}")
        elif isinstance(result, dict):
            if result.get('success'):
                success_count += 1
            else:
                failed_count += 1
                errors.append(f"Task {i+1}: {result.get('error_message', 'Unknown error')}")
        else:
            failed_count += 1
            errors.append(f"Task {i+1}: Unexpected result type")
    
    print(f"\n异步并发测试结果:")
    print(f"总耗时: {duration:.3f} 秒")
    print(f"成功写入: {success_count}/{count}")
    print(f"失败写入: {failed_count}")
    print(f"写入速度: {success_count / duration:.2f} logs/second")
    
    # 显示失败示例
    if errors:
        print("\n失败示例:")
        for i, error in enumerate(errors[:5], 1):
            print(f"  {i}. {error}")
    
    return success_count > count * 0.9  # 成功率超过90%认为测试通过


async def test_batch_write_logs(count: int = 500):
    """测试异步批量写入函数"""
    print(f"\n=== 测试异步批量写入函数 ({count} 条日志) ===")
    
    # 生成测试日志条目
    log_entries = []
    for i in range(count):
        entry = {
            "message": f"FastAPI异步批量测试日志 {i+1}/{count}",
            "service_name": "fastapi-batch-direct",
            "level": random.choice(["DEBUG", "INFO", "WARN", "ERROR"]),
            "trace_id": f"batch-direct-{i+1:06d}",
            "span_id": f"span-{i+1:06d}",
            "adv_id": random.randint(1000000, 9999999),
            "aweme_id": random.randint(100000000, 999999999),
            "plan_id": random.randint(10000, 99999),
            "monitor_type": random.choice(["impression", "click", "conversion", "view"]),
            "co_id": random.randint(1000, 9999),
            "batch_index": i + 1,
            "timestamp": datetime.now().isoformat(),
            "client_type": "fastapi_async_batch"
        }
        log_entries.append(entry)
    
    start_time = time.time()
    
    # 异步批量写入
    result = await batch_write_logs(log_entries)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n异步批量写入结果:")
    print(f"总耗时: {duration:.3f} 秒")
    print(f"总数量: {result.get('total_count', 0)}")
    print(f"成功写入: {result.get('success_count', 0)}")
    print(f"失败写入: {result.get('error_count', 0)}")
    print(f"写入速度: {result.get('success_count', 0) / duration:.2f} logs/second")
    
    # 显示错误示例
    errors = result.get('errors', [])
    if errors:
        print("错误示例:")
        for i, error in enumerate(errors[:3], 1):
            print(f"  {i}. {error}")
    
    return result.get('success_count', 0) > count * 0.9


async def test_large_scale_concurrent(count: int = 5000):
    """大规模异步并发测试"""
    print(f"\n=== 大规模异步并发测试 ({count} 次调用) ===")
    
    # 分批处理，避免创建过多协程
    batch_size = 100
    batches = [list(range(i, min(i + batch_size, count))) for i in range(0, count, batch_size)]
    
    print(f"分为 {len(batches)} 个批次，每批最多 {batch_size} 个协程")
    
    async def process_batch(batch_indices):
        """处理一个批次的日志写入"""
        tasks = []
        for i in batch_indices:
            task = write_log(
                f"FastAPI大规模异步测试消息 {i+1}",
                service_name="fastapi-large-scale",
                level=random.choice(["DEBUG", "INFO", "WARN", "ERROR"]),
                trace_id=f"large-scale-{i+1:06d}",
                span_id=f"span-{i+1:06d}",
                adv_id=random.randint(1000000, 9999999),
                aweme_id=random.randint(100000000, 999999999),
                plan_id=random.randint(10000, 99999),
                monitor_type=random.choice(["impression", "click", "conversion", "view"]),
                co_id=random.randint(1000, 9999),
                batch_id=len(batch_indices),
                item_index=i + 1,
                timestamp=datetime.now().isoformat(),
                client_type="fastapi_async_large_scale"
            )
            tasks.append(task)
        
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    start_time = time.time()
    
    # 并发处理所有批次
    batch_tasks = [process_batch(batch) for batch in batches]
    batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
    
    end_time = time.time()
    duration = end_time - start_time
    
    # 汇总结果
    all_results = []
    for batch_result in batch_results:
        if isinstance(batch_result, Exception):
            print(f"批次处理异常: {batch_result}")
            continue
        all_results.extend(batch_result)
    
    success_count = 0
    failed_count = 0
    errors = []
    
    for i, result in enumerate(all_results):
        if isinstance(result, Exception):
            failed_count += 1
            errors.append(f"Item {i+1}: {str(result)}")
        elif isinstance(result, dict):
            if result.get('success'):
                success_count += 1
            else:
                failed_count += 1
                errors.append(f"Item {i+1}: {result.get('error_message', 'Unknown error')}")
    
    print(f"\n大规模异步测试结果:")
    print(f"总耗时: {duration:.3f} 秒")
    print(f"实际处理: {len(all_results)} 条")
    print(f"成功写入: {success_count}")
    print(f"失败写入: {failed_count}")
    print(f"成功率: {success_count / len(all_results) * 100:.2f}%")
    print(f"写入速度: {success_count / duration:.2f} logs/second")
    
    return success_count > len(all_results) * 0.95  # 成功率超过95%


async def main():
    """主函数"""
    print("=== FastAPI Log Service 直接异步函数测试 ===")
    print("注意：此测试直接调用异步 write_log 函数，需要 gRPC 服务器运行")
    print()
    
    try:
        # 🔍 测试0: 异步执行验证 (新增)
        successful_verifications = await test_async_execution_verification()
        print(f"✅ 异步执行验证完成，成功验证 {successful_verifications} 个任务")
        
        # 测试1: 基本功能
        if await test_write_log_function():
            print("✅ 异步基本功能测试通过")
        else:
            print("❌ 异步基本功能测试失败")
            return
        
        # 测试2: 中等规模并发
        if await test_concurrent_write_log(1000):
            print("✅ 中等规模异步并发测试通过")
        else:
            print("❌ 中等规模异步并发测试失败")
        
        # 测试3: 批量写入
        if await test_batch_write_logs(500):
            print("✅ 异步批量写入测试通过")
        else:
            print("❌ 异步批量写入测试失败")
        
        # 询问是否进行大规模测试
        choice = input("\n是否进行大规模异步测试 (5000次并发)? [y/N]: ").lower()
        if choice == 'y':
            if await test_large_scale_concurrent(5000):
                print("✅ 大规模异步并发测试通过")
            else:
                print("❌ 大规模异步并发测试失败")
        
        print("\n🎉 异步测试完成!")
        
        # 清理连接
        client = get_log_client()
        await client.disconnect()
    
    except Exception as e:
        print(f"❌ 异步测试过程中发生错误: {e}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"异步测试失败: {e}")
