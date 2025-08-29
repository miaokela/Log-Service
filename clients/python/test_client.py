#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Log Service gRPC Python Client
"""

import grpc
import log_service_pb2
import log_service_pb2_grpc
from google.protobuf.timestamp_pb2 import Timestamp
from datetime import datetime
import time
import random
import string
from typing import List, Dict, Optional


class LogServiceClient:
    """Log service gRPC client"""
    
    def __init__(self, server_address: str = "localhost:50051"):
        self.server_address = server_address
        self.channel = None
        self.stub = None
    
    def connect(self):
        """Connect to gRPC server"""
        self.channel = grpc.insecure_channel(self.server_address)
        self.stub = log_service_pb2_grpc.LogServiceStub(self.channel)
        print(f"Connected to log service at {self.server_address}")
    
    def disconnect(self):
        """Disconnect from server"""
        if self.channel:
            self.channel.close()
            print("Disconnected from log service")
    
    def write_log(self, service_name: str, level: log_service_pb2.LogLevel, 
                  message: str, trace_id: str = None, metadata: dict = None) -> bool:
        """Write a single log entry"""
        
        log_entry = log_service_pb2.LogEntry(
            service_name=service_name,
            level=level,
            message=message,
            timestamp=datetime.now().isoformat() + "Z",
            trace_id=trace_id or self._generate_trace_id()
        )
        
        # Add metadata if provided
        if metadata:
            for key, value in metadata.items():
                log_entry.metadata[key] = str(value)
        
        request = log_service_pb2.WriteLogRequest(log_entry=log_entry)
        
        try:
            response = self.stub.WriteLog(request)
            if response.success:
                print(f"✅ Log written successfully: {response.log_id}")
                return True
            else:
                print(f"❌ Failed to write log: {response.error}")
                return False
        except grpc.RpcError as e:
            print(f"❌ gRPC error: {e}")
            return False
    
    def batch_write_logs(self, log_entries: List[Dict]) -> bool:
        """Write multiple logs in batch"""
        
        entries = []
        for entry_data in log_entries:
            log_entry = log_service_pb2.LogEntry(
                service_name=entry_data.get("service_name", "unknown"),
                level=entry_data.get("level", log_service_pb2.LogLevel.INFO),
                message=entry_data.get("message", ""),
                timestamp=entry_data.get("timestamp", datetime.now().isoformat() + "Z"),
                trace_id=entry_data.get("trace_id", self._generate_trace_id())
            )
            
            # Add metadata if provided
            metadata = entry_data.get("metadata", {})
            for key, value in metadata.items():
                log_entry.metadata[key] = str(value)
            
            entries.append(log_entry)
        
        request = log_service_pb2.BatchWriteLogRequest(log_entries=entries)
        
        try:
            response = self.stub.BatchWriteLog(request)
            print(f"✅ Batch write completed: {len(response.log_ids)} logs written")
            return True
        except grpc.RpcError as e:
            print(f"❌ gRPC error: {e}")
            return False
    
    def query_logs(self, service_name: str = None, level: log_service_pb2.LogLevel = None,
                   trace_id: str = None, start_time: str = None, end_time: str = None,
                   metadata_filters: dict = None, limit: int = 10, offset: int = 0) -> List:
        """Query logs with various filters"""
        
        request = log_service_pb2.QueryLogRequest(
            service_name=service_name,
            start_time=start_time,
            end_time=end_time,
            metadata_filters=metadata_filters or {},
            limit=limit,
            offset=offset,
            trace_id=trace_id
        )
        
        if level is not None:
            request.level = level
        
        try:
            response = self.stub.QueryLog(request)
            print(f"📊 Found {len(response.logs)} logs")
            return response.logs
        except grpc.RpcError as e:
            print(f"❌ gRPC error: {e}")
            return []
    
    def _generate_trace_id(self) -> str:
        """Generate a random trace ID"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=32))


def run_performance_test(client: LogServiceClient, num_logs: int = 100):
    """Run performance test"""
    print(f"\n🚀 Performance Test - Writing {num_logs} logs...")
    
    start_time = time.time()
    
    # Test single writes
    for i in range(num_logs):
        client.write_log(
            service_name="perf-test",
            level=log_service_pb2.LogLevel.INFO,
            message=f"Performance test log {i+1}",
            metadata={"test_id": f"perf_{i+1}", "batch": "single"}
        )
    
    end_time = time.time()
    duration = end_time - start_time
    logs_per_second = num_logs / duration
    
    print(f"📈 Single writes: {logs_per_second:.2f} logs/second")
    
    # Test batch writes
    batch_logs = []
    for i in range(num_logs):
        batch_logs.append({
            "service_name": "perf-test-batch",
            "level": log_service_pb2.LogLevel.INFO,
            "message": f"Batch performance test log {i+1}",
            "metadata": {"test_id": f"batch_perf_{i+1}", "batch": "batch"}
        })
    
    start_time = time.time()
    client.batch_write_logs(batch_logs)
    end_time = time.time()
    
    batch_duration = end_time - start_time
    batch_logs_per_second = num_logs / batch_duration
    
    print(f"📈 Batch writes: {batch_logs_per_second:.2f} logs/second")


def main():
    """Main test function"""
    
    # Create client
    client = LogServiceClient()
    
    try:
        # Connect to server
        client.connect()
        
        print("=== Python gRPC Client Test ===\n")
        
        # Test 1: Write single logs
        print("1. Testing single log writes...")
        client.write_log(
            service_name="test-service",
            level=log_service_pb2.LogLevel.INFO,
            message="Hello from Python client!",
            metadata={"version": "1.0", "env": "test"}
        )
        
        client.write_log(
            service_name="test-service",
            level=log_service_pb2.LogLevel.ERROR,
            message="Test error message",
            metadata={"error_code": "500", "severity": "high"}
        )
        
        # Test 2: Batch write
        print("\n2. Testing batch log writes...")
        batch_logs = [
            {
                "service_name": "batch-service",
                "level": log_service_pb2.LogLevel.DEBUG,
                "message": "Debug log 1",
                "metadata": {"component": "auth", "action": "login"}
            },
            {
                "service_name": "batch-service", 
                "level": log_service_pb2.LogLevel.WARN,
                "message": "Warning log 1",
                "metadata": {"component": "db", "action": "query"}
            },
            {
                "service_name": "batch-service",
                "level": log_service_pb2.LogLevel.INFO,
                "message": "Info log 1",
                "metadata": {"component": "api", "action": "response"}
            }
        ]
        client.batch_write_logs(batch_logs)
        
        # Wait a moment for logs to be processed
        time.sleep(1)
        
        # Test 3: Query logs
        print("\n3. Testing log queries...")
        
        # Query by service name
        logs = client.query_logs(service_name="test-service", limit=5)
        for log in logs:
            level_name = log_service_pb2.LogLevel.Name(log.level)
            print(f"  📝 {level_name}: {log.message}")
        
        # Query by level
        logs = client.query_logs(level=log_service_pb2.LogLevel.ERROR, limit=3)
        print(f"\n🔍 Error logs found: {len(logs)}")
        
        # Query with metadata filter
        logs = client.query_logs(
            metadata_filters={"component": "auth"}, 
            limit=5
        )
        print(f"🔍 Logs with auth component: {len(logs)}")
        
        # Performance test
        run_performance_test(client, 50)
        
        print("\n✅ All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
    finally:
        client.disconnect()


if __name__ == "__main__":
    main()
