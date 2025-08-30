#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Django Log Service 测试脚本
测试封装的 write_log 函数和 API 接口
"""

import requests
import json
import time
import concurrent.futures
from datetime import datetime


class DjangoLogServiceTester:
    """Django 日志服务测试器"""
    
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def test_single_log_write(self):
        """测试单条日志写入"""
        print("\n=== 测试1: 单条日志写入 ===")
        
        url = f"{self.base_url}/api/write_log/"
        data = {
            "message": "这是来自Django客户端的测试日志",
            "service_name": "django-test-service",
            "level": "INFO",
            "trace_id": "django-trace-001",
            "span_id": "django-span-001",
            "adv_id": 1234567,
            "aweme_id": 987654321,
            "plan_id": 12345,
            "monitor_type": "impression",
            "co_id": 5678,
            "user_id": "test-user-123",
            "campaign": "summer-sale-2024"
        }
        
        try:
            response = self.session.post(url, json=data)
            result = response.json()
            
            print(f"状态码: {response.status_code}")
            print(f"结果: {result}")
            
            return result.get('success', False)
        
        except Exception as e:
            print(f"请求失败: {e}")
            return False
    
    def test_batch_write(self, count: int = 100):
        """测试批量写入"""
        print(f"\n=== 测试2: 批量写入 {count} 条日志 ===")
        
        url = f"{self.base_url}/api/batch_write_test/"
        data = {"count": count}
        
        try:
            start_time = time.time()
            response = self.session.post(url, json=data)
            end_time = time.time()
            
            result = response.json()
            
            print(f"状态码: {response.status_code}")
            print(f"总耗时: {end_time - start_time:.3f} 秒")
            print(f"成功写入: {result.get('success_count', 0)}/{result.get('total_count', 0)}")
            print(f"写入速度: {result.get('logs_per_second', 0)} logs/second")
            
            return result.get('success', False)
        
        except Exception as e:
            print(f"请求失败: {e}")
            return False
    
    def test_concurrent_write(self, count: int = 10000, max_workers: int = 50):
        """测试并发写入"""
        print(f"\n=== 测试3: 并发写入 {count} 条日志 (最大 {max_workers} 个线程) ===")
        
        url = f"{self.base_url}/api/concurrent_test/"
        data = {
            "count": count,
            "max_workers": max_workers
        }
        
        try:
            start_time = time.time()
            print("开始并发测试，请稍候...")
            
            response = self.session.post(url, json=data, timeout=300)  # 5分钟超时
            end_time = time.time()
            
            result = response.json()
            
            print(f"状态码: {response.status_code}")
            print(f"总耗时: {end_time - start_time:.3f} 秒")
            print(f"成功写入: {result.get('success_count', 0)}/{result.get('total_count', 0)}")
            print(f"失败数量: {result.get('failed_count', 0)}")
            print(f"写入速度: {result.get('logs_per_second', 0)} logs/second")
            print(f"并发线程数: {result.get('max_workers', 0)}")
            
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
            print(f"请求失败: {e}")
            return False
    
    def test_manual_concurrent_requests(self, count: int = 1000, max_workers: int = 20):
        """手动并发请求测试"""
        print(f"\n=== 测试4: 手动并发请求 {count} 次 (最大 {max_workers} 个线程) ===")
        
        def send_single_request(index):
            """发送单个请求"""
            try:
                url = f"{self.base_url}/api/write_log/"
                data = {
                    "message": f"手动并发测试日志 {index}",
                    "service_name": "django-manual-concurrent",
                    "level": "INFO",
                    "trace_id": f"manual-trace-{index:06d}",
                    "span_id": f"manual-span-{index:06d}",
                    "adv_id": 1000000 + index,
                    "aweme_id": 100000000 + index,
                    "plan_id": 10000 + index,
                    "monitor_type": "click",
                    "co_id": 1000 + (index % 100),
                    "request_index": index,
                    "timestamp": datetime.now().isoformat()
                }
                
                response = self.session.post(url, json=data, timeout=30)
                result = response.json()
                
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
        results = []
        
        # 使用线程池并发执行
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_index = {
                executor.submit(send_single_request, i): i 
                for i in range(1, count + 1)
            }
            
            for future in concurrent.futures.as_completed(future_to_index):
                try:
                    result = future.result()
                    results.append(result)
                    
                    if len(results) % 100 == 0:
                        print(f"已完成: {len(results)}/{count}")
                
                except Exception as e:
                    print(f"Future 异常: {e}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        success_count = sum(1 for r in results if r['success'])
        failed_count = count - success_count
        
        print(f"总耗时: {duration:.3f} 秒")
        print(f"成功请求: {success_count}/{count}")
        print(f"失败请求: {failed_count}")
        print(f"请求速度: {success_count / duration:.2f} requests/second")
        
        # 显示失败示例
        failed_results = [r for r in results if not r['success']]
        if failed_results:
            print("失败请求示例:")
            for i, result in enumerate(failed_results[:5], 1):
                print(f"  {i}. Index {result['index']}: {result['error']}")
        
        return success_count == count


def main():
    """主测试函数"""
    print("=== Django Log Service 测试工具 ===")
    print("确保 Django 服务器正在运行 (python manage.py runserver)")
    print("确保 gRPC 日志服务器正在运行")
    print()
    
    tester = DjangoLogServiceTester()
    
    # 测试服务器连接
    try:
        response = requests.get(f"{tester.base_url}/admin/", timeout=5)
        print(f"Django 服务器状态: OK (HTTP {response.status_code})")
    except Exception as e:
        print(f"Django 服务器连接失败: {e}")
        print("请确保 Django 服务器正在运行")
        return
    
    # 运行测试
    tests_passed = 0
    total_tests = 4
    
    # 测试1: 单条日志写入
    if tester.test_single_log_write():
        tests_passed += 1
    
    # 测试2: 批量写入
    if tester.test_batch_write(count=50):
        tests_passed += 1
    
    # 测试3: 并发写入测试 (较小规模)
    if tester.test_concurrent_write(count=1000, max_workers=20):
        tests_passed += 1
    
    # 测试4: 手动并发请求
    if tester.test_manual_concurrent_requests(count=500, max_workers=10):
        tests_passed += 1
    
    print(f"\n=== 测试结果汇总 ===")
    print(f"通过测试: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("✅ 所有测试通过!")
        
        # 可选：运行大规模测试
        choice = input("\n是否运行大规模并发测试 (1万次)? [y/N]: ").lower()
        if choice == 'y':
            print("\n开始大规模并发测试...")
            tester.test_concurrent_write(count=10000, max_workers=50)
    else:
        print("❌ 部分测试失败，请检查服务器状态")


if __name__ == "__main__":
    main()
