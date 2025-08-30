import json
import time
import random
import concurrent.futures
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .client import write_log


@csrf_exempt
@require_http_methods(["POST"])
def write_log_view(request):
    """单条日志写入接口"""
    try:
        data = json.loads(request.body)
        message = data.get('message', '')
        
        if not message:
            return JsonResponse({
                'success': False,
                'error': 'Message is required'
            }, status=400)
        
        # 移除 message，其余参数都传给 write_log
        kwargs = {k: v for k, v in data.items() if k != 'message'}
        
        result = write_log(message, **kwargs)
        
        return JsonResponse(result)
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def batch_write_test_view(request):
    """批量写入测试接口"""
    try:
        data = json.loads(request.body)
        count = data.get('count', 100)
        
        if count > 10000:
            return JsonResponse({
                'success': False,
                'error': 'Count cannot exceed 10000'
            }, status=400)
        
        results = []
        start_time = time.time()
        
        for i in range(count):
            # 生成测试数据
            test_data = {
                'service_name': 'django-batch-test',
                'level': random.choice(['DEBUG', 'INFO', 'WARN', 'ERROR']),
                'trace_id': f'batch-trace-{i+1:06d}',
                'span_id': f'batch-span-{i+1:06d}',
                'adv_id': random.randint(1000000, 9999999),
                'aweme_id': random.randint(100000000, 999999999),
                'plan_id': random.randint(10000, 99999),
                'monitor_type': random.choice(['impression', 'click', 'conversion', 'view']),
                'co_id': random.randint(1000, 9999),
                'batch_id': f'batch-{int(time.time())}-{i+1}',
                'timestamp': datetime.now().isoformat(),
            }
            
            message = f"批量测试日志 {i+1}/{count} - {test_data['monitor_type']} event"
            
            result = write_log(message, **test_data)
            results.append(result)
        
        end_time = time.time()
        duration = end_time - start_time
        
        success_count = sum(1 for r in results if r.get('success'))
        
        return JsonResponse({
            'success': True,
            'total_count': count,
            'success_count': success_count,
            'failed_count': count - success_count,
            'duration_seconds': round(duration, 3),
            'logs_per_second': round(success_count / duration, 2) if duration > 0 else 0,
            'results': results[:10]  # 只返回前10条结果作为示例
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def concurrent_test_view(request):
    """并发写入测试接口 - 1万次并发调用"""
    try:
        data = json.loads(request.body)
        total_count = data.get('count', 10000)
        max_workers = data.get('max_workers', 50)  # 控制并发数
        
        if total_count > 10000:
            return JsonResponse({
                'success': False,
                'error': 'Count cannot exceed 10000'
            }, status=400)
        
        def write_single_log(index):
            """写入单条日志的函数"""
            try:
                # 生成测试数据
                test_data = {
                    'service_name': 'django-concurrent-test',
                    'level': random.choice(['DEBUG', 'INFO', 'WARN', 'ERROR']),
                    'trace_id': f'concurrent-trace-{index:06d}',
                    'span_id': f'concurrent-span-{index:06d}',
                    'adv_id': random.randint(1000000, 9999999),
                    'aweme_id': random.randint(100000000, 999999999),
                    'plan_id': random.randint(10000, 99999),
                    'monitor_type': random.choice(['impression', 'click', 'conversion', 'view']),
                    'co_id': random.randint(1000, 9999),
                    'request_id': f'req-{int(time.time())}-{index}',
                    'thread_id': f'thread-{index % max_workers}',
                    'timestamp': datetime.now().isoformat(),
                }
                
                message = f"并发测试日志 {index}/{total_count} - {test_data['monitor_type']} event from {test_data['service_name']}"
                
                return write_log(message, **test_data)
            
            except Exception as e:
                return {
                    'success': False,
                    'log_id': '',
                    'error_message': str(e)
                }
        
        start_time = time.time()
        results = []
        
        # 使用线程池并发执行
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            future_to_index = {
                executor.submit(write_single_log, i): i 
                for i in range(1, total_count + 1)
            }
            
            # 收集结果
            for future in concurrent.futures.as_completed(future_to_index):
                index = future_to_index[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    results.append({
                        'success': False,
                        'log_id': '',
                        'error_message': f'Future exception: {str(e)}'
                    })
        
        end_time = time.time()
        duration = end_time - start_time
        
        success_count = sum(1 for r in results if r.get('success'))
        failed_count = total_count - success_count
        
        return JsonResponse({
            'success': True,
            'test_type': 'concurrent',
            'total_count': total_count,
            'success_count': success_count,
            'failed_count': failed_count,
            'max_workers': max_workers,
            'duration_seconds': round(duration, 3),
            'logs_per_second': round(success_count / duration, 2) if duration > 0 else 0,
            'sample_results': results[:10],  # 前10条结果作为示例
            'error_summary': {
                'total_errors': failed_count,
                'sample_errors': [r.get('error_message', '') for r in results if not r.get('success')][:5]
            }
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
