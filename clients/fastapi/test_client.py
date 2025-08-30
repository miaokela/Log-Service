#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
FastAPI Log Service 测试客户端
测试异步 API 接口功能
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, Any, List


class FastAPILogServiceTester:
    """FastAPI 日志服务测试器"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8001"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self.session:
            await self.session.close()
    
    async def test_health_check(self) -> bool:
        """测试健康检查"""
        print("\n=== 测试1: 健康检查 ===")
        
        url = f"{self.base_url}/api/v1/logs/health"
        
        try:
            async with self.session.get(url) as response:
                result = await response.json()
                
                print(f"状态码: {response.status}")
                print(f"服务状态: {result.get('status')}")
                print(f"gRPC连接: {result.get('grpc_connection')}")
                print(f"服务信息: {result.get('service_info', {})}")
                
                return result.get('grpc_connection', False)
        
        except Exception as e:
            print(f"健康检查失败: {e}")
            return False
    
    async def test_single_log_write(self) -> bool:
        """测试单条日志写入"""
        print("\n=== 测试2: 单条异步日志写入 ===")
        
        url = f"{self.base_url}/api/v1/logs/write"
        data = {
            "message": "这是来自FastAPI异步客户端的测试日志",
            "service_name": "fastapi-test-service",
            "level": "INFO",
            "trace_id": "fastapi-trace-001",
            "span_id": "fastapi-span-001",
            "adv_id": 1234567,
            "aweme_id": 987654321,
            "plan_id": 12345,
            "monitor_type": "impression",
            "co_id": 5678,
            "metadata": {
                "user_id": "test-user-123",
                "session_id": "session-456",
                "client_type": "fastapi_async"
            }
        }
        
        try:
            async with self.session.post(url, json=data) as response:
                result = await response.json()
                
                print(f"状态码: {response.status}")
                print(f"结果: {result}")
                
                return result.get('success', False)
        
        except Exception as e:
            print(f"单条日志写入失败: {e}")
            return False
    
    async def test_batch_write(self, count: int = 100) -> bool:
        """测试批量日志写入"""
        print(f"\n=== 测试3: 批量异步写入 {count} 条日志 ===")
        
        url = f"{self.base_url}/api/v1/logs/batch"
        
        # 生成批量日志数据
        log_entries = []
        for i in range(count):
            entry = {
                "message": f"FastAPI批量异步日志 {i+1}/{count}",
                "service_name": "fastapi-batch-test",
                "level": ["DEBUG", "INFO", "WARN", "ERROR"][i % 4],
                "trace_id": f"batch-trace-{i+1:04d}",
                "span_id": f"batch-span-{i+1:04d}",
                "adv_id": 1000000 + i,
                "aweme_id": 100000000 + i,
                "plan_id": 10000 + i,
                "monitor_type": ["impression", "click", "conversion", "view"][i % 4],
                "co_id": 1000 + (i % 100),
                "metadata": {
                    "batch_index": i + 1,
                    "timestamp": datetime.now().isoformat()
                }
            }
            log_entries.append(entry)
        
        data = {"log_entries": log_entries}
        
        try:
            start_time = time.time()
            async with self.session.post(url, json=data) as response:
                result = await response.json()
                end_time = time.time()
            
            print(f"状态码: {response.status}")
            print(f"总耗时: {end_time - start_time:.3f} 秒")
            print(f"成功写入: {result.get('success_count', 0)}/{result.get('total_count', 0)}")
            print(f"失败数量: {result.get('error_count', 0)}")
            
            if result.get('errors'):
                print("错误示例:")
                for error in result['errors'][:3]:
                    print(f"  - {error}")
            
            return result.get('success_count', 0) > 0
        
        except Exception as e:
            print(f"批量日志写入失败: {e}")
            return False
    
    async def test_concurrent_write(self, count: int = 1000, max_workers: int = 20) -> bool:
        """测试并发写入"""
        print(f"\n=== 测试4: 并发异步写入 {count} 条日志 (最大 {max_workers} 个协程) ===")
        
        url = f"{self.base_url}/api/v1/logs/concurrent-test"
        data = {
            "count": count,
            "max_workers": max_workers
        }
        
        try:
            start_time = time.time()
            print("开始并发测试，请稍候...")
            
            async with self.session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=300)) as response:
                result = await response.json()
                end_time = time.time()
            
            print(f"状态码: {response.status}")
            print(f"客户端总耗时: {end_time - start_time:.3f} 秒")
            print(f"服务端耗时: {result.get('duration_seconds', 0)} 秒")
            print(f"成功写入: {result.get('success_count', 0)}/{result.get('total_count', 0)}")
            print(f"失败数量: {result.get('failed_count', 0)}")
            print(f"写入速度: {result.get('logs_per_second', 0)} logs/second")
            print(f"并发协程数: {result.get('max_workers', 0)}")
            
            # 显示错误示例（如果有）
            error_summary = result.get('error_summary', {})
            if error_summary.get('total_errors', 0) > 0:
                print(f"错误总数: {error_summary['total_errors']}")
                print("错误示例:")
                for i, error in enumerate(error_summary.get('sample_errors', [])[:3], 1):
                    if error:
                        print(f"  {i}. {error}")
            
            return result.get('success', False)
        
        except Exception as e:
            print(f"并发测试失败: {e}")
            return False
    
    async def test_concurrent_manual_requests(self, count: int = 500) -> bool:
        """手动并发请求测试"""
        print(f"\n=== 测试5: 手动并发异步请求 {count} 次 ===")
        
        async def send_single_request(index: int) -> Dict[str, Any]:
            """发送单个异步请求"""
            url = f"{self.base_url}/api/v1/logs/write"
            data = {
                "message": f"手动并发异步测试日志 {index}",
                "service_name": "fastapi-manual-concurrent",
                "level": "INFO",
                "trace_id": f"manual-trace-{index:06d}",
                "span_id": f"manual-span-{index:06d}",
                "adv_id": 2000000 + index,
                "aweme_id": 200000000 + index,
                "plan_id": 20000 + index,
                "monitor_type": "click",
                "co_id": 2000 + (index % 100),
                "metadata": {
                    "request_index": index,
                    "timestamp": datetime.now().isoformat()
                }
            }
            
            try:
                async with self.session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=30)) as response:
                    result = await response.json()
                    return {
                        'index': index,
                        'success': result.get('success', False),
                        'log_id': result.get('log_id', ''),
                        'error': result.get('error_message', '')
                    }
            
            except Exception as e:
                return {
                    'index': index,
                    'success': False,
                    'log_id': '',
                    'error': str(e)
                }
        
        start_time = time.time()
        
        # 创建并发任务
        tasks = [send_single_request(i) for i in range(1, count + 1)]
        
        # 并发执行所有任务
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # 统计结果
        success_count = 0
        failed_count = 0
        errors = []
        
        for result in results:
            if isinstance(result, Exception):
                failed_count += 1
                errors.append(str(result))
            elif isinstance(result, dict):
                if result.get('success'):
                    success_count += 1
                else:
                    failed_count += 1
                    if result.get('error'):
                        errors.append(f"Index {result['index']}: {result['error']}")
        
        print(f"总耗时: {duration:.3f} 秒")
        print(f"成功请求: {success_count}/{count}")
        print(f"失败请求: {failed_count}")
        print(f"请求速度: {success_count / duration:.2f} requests/second")
        
        # 显示失败示例
        if errors:
            print("失败请求示例:")
            for i, error in enumerate(errors[:5], 1):
                print(f"  {i}. {error}")
        
        return success_count > count * 0.9  # 成功率超过90%


async def main():
    """主测试函数"""
    print("=== FastAPI Log Service 异步测试工具 ===")
    print("确保 FastAPI 服务器正在运行 (python main.py)")
    print("确保 gRPC 日志服务器正在运行")
    print()
    
    async with FastAPILogServiceTester() as tester:
        # 测试服务器连接
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{tester.base_url}/") as response:
                    if response.status == 200:
                        print(f"FastAPI 服务器状态: OK (HTTP {response.status})")
                    else:
                        print(f"FastAPI 服务器状态异常: HTTP {response.status}")
                        return
        except Exception as e:
            print(f"FastAPI 服务器连接失败: {e}")
            print("请确保 FastAPI 服务器正在运行")
            return
        
        # 运行测试
        tests_passed = 0
        total_tests = 5
        
        # 测试1: 健康检查
        if await tester.test_health_check():
            tests_passed += 1
            print("✅ 健康检查通过")
        else:
            print("❌ 健康检查失败")
            return
        
        # 测试2: 单条日志写入
        if await tester.test_single_log_write():
            tests_passed += 1
            print("✅ 单条异步日志写入通过")
        else:
            print("❌ 单条异步日志写入失败")
        
        # 测试3: 批量写入
        if await tester.test_batch_write(count=50):
            tests_passed += 1
            print("✅ 批量异步写入通过")
        else:
            print("❌ 批量异步写入失败")
        
        # 测试4: 并发写入测试
        if await tester.test_concurrent_write(count=500, max_workers=20):
            tests_passed += 1
            print("✅ 并发异步写入测试通过")
        else:
            print("❌ 并发异步写入测试失败")
        
        # 测试5: 手动并发请求
        if await tester.test_concurrent_manual_requests(count=200):
            tests_passed += 1
            print("✅ 手动并发异步请求通过")
        else:
            print("❌ 手动并发异步请求失败")
        
        print(f"\n=== 测试结果汇总 ===")
        print(f"通过测试: {tests_passed}/{total_tests}")
        
        if tests_passed == total_tests:
            print("✅ 所有异步测试通过!")
            
            # 可选：运行大规模测试
            choice = input("\n是否运行大规模异步并发测试 (1万次)? [y/N]: ").lower()
            if choice == 'y':
                print("\n开始大规模异步并发测试...")
                await tester.test_concurrent_write(count=10000, max_workers=50)
        else:
            print("❌ 部分异步测试失败，请检查服务器状态")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n测试被用户中断")
    except Exception as e:
        print(f"测试过程中发生错误: {e}")
