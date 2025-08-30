#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
异步执行验证脚本
专门用于验证和展示异步函数的非阻塞特性
"""

import sys
import os
import asyncio
import time
import threading
import concurrent.futures
from datetime import datetime
from typing import List, Dict, Any

# 添加当前目录到 Python 路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.log_client import write_log, get_log_client


class AsyncExecutionMonitor:
    """异步执行监控器"""
    
    def __init__(self):
        self.events = []
        self.thread_usage = {}
        self.start_time = time.time()
    
    def log_event(self, event_type: str, details: str = "", task_id: str = ""):
        """记录执行事件"""
        current_time = time.time()
        thread_id = threading.get_ident()
        
        event = {
            'timestamp': current_time,
            'relative_time_ms': (current_time - self.start_time) * 1000,
            'thread_id': thread_id,
            'event_type': event_type,
            'task_id': task_id,
            'details': details,
            'readable_time': datetime.fromtimestamp(current_time).strftime('%H:%M:%S.%f')[:-3]
        }
        
        self.events.append(event)
        
        # 统计线程使用
        if thread_id not in self.thread_usage:
            self.thread_usage[thread_id] = 0
        self.thread_usage[thread_id] += 1
        
        return event
    
    def print_timeline(self, max_events: int = 20):
        """打印执行时间轴"""
        print("\n📅 执行时间轴 (最近 {} 个事件):".format(min(max_events, len(self.events))))
        print("   时间(ms)   线程ID    事件类型           任务ID    详情")
        print("   " + "-" * 80)
        
        for event in self.events[-max_events:]:
            print(f"   {event['relative_time_ms']:7.1f}   {event['thread_id']}   "
                  f"{event['event_type']:<15}   {event['task_id']:<8}   {event['details']}")
    
    def analyze_concurrency(self):
        """分析并发性"""
        print("\n⚡ 并发性分析:")
        
        # 分析任务启动时间间隔
        starts = [e for e in self.events if e['event_type'] == 'task_start']
        if len(starts) >= 2:
            intervals = []
            for i in range(1, len(starts)):
                interval = starts[i]['relative_time_ms'] - starts[i-1]['relative_time_ms']
                intervals.append(interval)
            
            avg_interval = sum(intervals) / len(intervals)
            max_interval = max(intervals)
            min_interval = min(intervals)
            
            print(f"  任务启动间隔: 平均 {avg_interval:.2f}ms, 最大 {max_interval:.2f}ms, 最小 {min_interval:.2f}ms")
            
            if avg_interval < 10:
                print(f"  ✅ 真正的异步并发执行 (平均间隔 < 10ms)")
            elif avg_interval < 50:
                print(f"  ⚠️  部分并发，可能有轻微阻塞 (平均间隔 < 50ms)")
            else:
                print(f"  ❌ 可能存在显著阻塞 (平均间隔 >= 50ms)")
        
        # 分析线程使用
        print(f"\n🧵 线程使用分析:")
        main_thread = min(self.thread_usage.keys())  # 通常主线程ID最小
        print(f"  主线程ID: {main_thread}")
        print(f"  总线程数: {len(self.thread_usage)}")
        
        for thread_id, count in sorted(self.thread_usage.items()):
            thread_type = "主线程" if thread_id == main_thread else "工作线程"
            print(f"    线程 {thread_id} ({thread_type}): {count} 个事件")
        
        # 检查任务重叠
        task_starts = {e['task_id']: e['relative_time_ms'] for e in self.events if e['event_type'] == 'task_start'}
        task_ends = {e['task_id']: e['relative_time_ms'] for e in self.events if e['event_type'] == 'task_end'}
        
        overlapping_count = 0
        for task1_id, start1 in task_starts.items():
            for task2_id, start2 in task_starts.items():
                if task1_id != task2_id:
                    end1 = task_ends.get(task1_id, float('inf'))
                    end2 = task_ends.get(task2_id, float('inf'))
                    
                    # 检查是否有时间重叠
                    if not (end1 <= start2 or end2 <= start1):
                        overlapping_count += 1
        
        overlapping_pairs = overlapping_count // 2  # 每对任务被计算了两次
        print(f"  重叠执行的任务对数: {overlapping_pairs}")
        
        return avg_interval if len(starts) >= 2 else None


# 创建全局监控器
monitor = AsyncExecutionMonitor()


async def monitored_write_log(task_id: str, message: str, **kwargs):
    """带监控的异步日志写入"""
    monitor.log_event("task_start", f"开始执行", task_id)
    
    try:
        # 记录 gRPC 调用开始
        monitor.log_event("grpc_start", "开始 gRPC 调用", task_id)
        
        result = await write_log(message, task_id=task_id, **kwargs)
        
        # 记录 gRPC 调用结束
        monitor.log_event("grpc_end", f"gRPC 调用完成", task_id)
        monitor.log_event("task_end", f"任务完成: {result.get('success', False)}", task_id)
        
        return result
        
    except Exception as e:
        monitor.log_event("task_error", f"任务失败: {str(e)}", task_id)
        return {"success": False, "error": str(e)}


async def demonstrate_blocking_vs_nonblocking():
    """演示阻塞 vs 非阻塞执行"""
    print("=== 🔍 阻塞 vs 非阻塞演示 ===\n")
    
    # 1. 模拟阻塞调用 (串行)
    print("📍 测试1: 模拟阻塞串行调用")
    start_blocking = time.time()
    
    monitor.log_event("blocking_test_start", "开始阻塞测试")
    
    # 串行调用 (模拟阻塞)
    for i in range(3):
        task_id = f"blocking-{i}"
        monitor.log_event("blocking_task_start", f"串行任务开始", task_id)
        result = await monitored_write_log(task_id, f"阻塞测试消息 {i}")
        monitor.log_event("blocking_task_end", f"串行任务结束", task_id)
    
    end_blocking = time.time()
    blocking_duration = end_blocking - start_blocking
    
    monitor.log_event("blocking_test_end", f"阻塞测试结束，耗时 {blocking_duration:.3f}s")
    print(f"✅ 串行执行完成，总耗时: {blocking_duration:.3f}秒\n")
    
    # 清空监控记录，准备下一个测试
    monitor.events.clear()
    monitor.thread_usage.clear()
    monitor.start_time = time.time()
    
    # 2. 真正的异步并发调用
    print("📍 测试2: 真正的异步并发调用")
    monitor.log_event("async_test_start", "开始异步测试")
    
    # 并发调用
    tasks = []
    for i in range(3):
        task_id = f"async-{i}"
        task = monitored_write_log(task_id, f"异步测试消息 {i}")
        tasks.append(task)
    
    start_async = time.time()
    results = await asyncio.gather(*tasks)
    end_async = time.time()
    async_duration = end_async - start_async
    
    monitor.log_event("async_test_end", f"异步测试结束，耗时 {async_duration:.3f}s")
    print(f"✅ 异步并发执行完成，总耗时: {async_duration:.3f}秒\n")
    
    # 3. 对比分析
    print("📊 性能对比:")
    print(f"  串行执行耗时: {blocking_duration:.3f}秒")
    print(f"  并发执行耗时: {async_duration:.3f}秒")
    print(f"  性能提升: {(blocking_duration/async_duration - 1)*100:.1f}%")
    
    if async_duration < blocking_duration * 0.8:
        print(f"  ✅ 异步并发显著提升了性能！")
    else:
        print(f"  ⚠️  性能提升不明显，可能存在阻塞")
    
    return async_duration


async def test_high_concurrency():
    """测试高并发异步执行"""
    print("\n=== ⚡ 高并发异步执行测试 ===")
    
    concurrency_levels = [10, 50, 100]
    
    for level in concurrency_levels:
        print(f"\n📍 测试 {level} 个并发任务:")
        
        # 清空监控记录
        monitor.events.clear()
        monitor.thread_usage.clear()
        monitor.start_time = time.time()
        
        # 创建并发任务
        tasks = []
        for i in range(level):
            task_id = f"concurrent-{level}-{i}"
            task = monitored_write_log(
                task_id, 
                f"高并发测试消息 {i}/{level}",
                concurrency_level=level,
                batch_index=i
            )
            tasks.append(task)
        
        # 执行并发任务
        start_time = time.time()
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()
        
        duration = end_time - start_time
        success_count = len([r for r in results if isinstance(r, dict) and r.get('success', False)])
        
        print(f"  总耗时: {duration:.3f}秒")
        print(f"  成功任务: {success_count}/{level}")
        print(f"  处理速度: {level/duration:.1f} 任务/秒")
        
        # 分析并发性
        avg_interval = monitor.analyze_concurrency()
        
        if avg_interval and avg_interval < 5:
            print(f"  ✅ 真正的高并发执行")
        elif avg_interval and avg_interval < 20:
            print(f"  ⚠️  中等并发性能")
        else:
            print(f"  ❌ 可能存在并发瓶颈")


async def main():
    """主函数"""
    print("🔍 异步执行验证和分析工具")
    print("=" * 50)
    print("此工具将详细分析异步函数的执行特性，帮助你验证:")
    print("• 是否真正异步执行（非阻塞）")
    print("• 线程使用情况")
    print("• 并发性能表现")
    print("• 任务执行时间轴")
    print()
    
    try:
        # 1. 阻塞 vs 非阻塞演示
        async_duration = await demonstrate_blocking_vs_nonblocking()
        
        # 显示详细的执行分析
        monitor.print_timeline()
        monitor.analyze_concurrency()
        
        # 2. 高并发测试
        choice = input("\n是否进行高并发测试? [y/N]: ").lower()
        if choice == 'y':
            await test_high_concurrency()
        
        print("\n🎉 异步验证测试完成!")
        print("\n💡 如何判断是否真正异步:")
        print("1. 查看任务启动间隔：< 10ms 表示真正并发")
        print("2. 查看线程使用：多个工作线程表示真正异步")
        print("3. 查看性能提升：并发比串行快 20% 以上")
        print("4. 查看时间轴：任务执行有时间重叠")
        
        # 清理连接
        client = get_log_client()
        await client.disconnect()
        
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"异步验证测试失败: {e}")
