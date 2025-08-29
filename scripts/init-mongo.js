// MongoDB初始化脚本
db = db.getSiblingDB('log_service');

// 创建日志集合
db.createCollection('logs');

// 创建索引以提升查询性能
db.logs.createIndex({ "service_name": 1, "timestamp": -1 });
db.logs.createIndex({ "level": 1, "timestamp": -1 });
db.logs.createIndex({ "trace_id": 1 });
db.logs.createIndex({ "timestamp": -1 });
db.logs.createIndex({ "created_at": -1 });

// 创建用于日志服务的用户
db.createUser({
  user: 'log_service_user',
  pwd: 'log_service_password',
  roles: [
    {
      role: 'readWrite',
      db: 'log_service'
    }
  ]
});

print('MongoDB initialization completed for log-service');
