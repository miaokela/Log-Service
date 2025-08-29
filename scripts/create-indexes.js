// MongoDB索引创建脚本
// 为日志服务的metadata字段创建索引以提高查询性能

print("正在为logs集合创建metadata字段索引...");

// 切换到log_service数据库
db = db.getSiblingDB('log_service');

// 1. 为常用的metadata字段创建单独索引
print("创建metadata.adv_id索引...");
db.logs.createIndex({ "metadata.adv_id": 1 }, { name: "metadata_adv_id_1" });

print("创建metadata.aweme_id索引...");
db.logs.createIndex({ "metadata.aweme_id": 1 }, { name: "metadata_aweme_id_1" });

print("创建metadata.plan_id索引...");
db.logs.createIndex({ "metadata.plan_id": 1 }, { name: "metadata_plan_id_1" });

print("创建metadata.user_id索引...");
db.logs.createIndex({ "metadata.user_id": 1 }, { name: "metadata_user_id_1" });

print("创建metadata.region索引...");
db.logs.createIndex({ "metadata.region": 1 }, { name: "metadata_region_1" });

print("创建metadata.platform索引...");
db.logs.createIndex({ "metadata.platform": 1 }, { name: "metadata_platform_1" });

// 2. 创建复合索引，提高多条件查询性能
print("创建service_name + metadata.adv_id复合索引...");
db.logs.createIndex({ 
    "service_name": 1, 
    "metadata.adv_id": 1, 
    "timestamp": -1 
}, { name: "service_metadata_adv_time" });

print("创建service_name + metadata.user_id复合索引...");
db.logs.createIndex({ 
    "service_name": 1, 
    "metadata.user_id": 1, 
    "timestamp": -1 
}, { name: "service_metadata_user_time" });

print("创建level + metadata.adv_id复合索引...");
db.logs.createIndex({ 
    "level": 1, 
    "metadata.adv_id": 1, 
    "timestamp": -1 
}, { name: "level_metadata_adv_time" });

// 3. 创建文本索引用于消息内容搜索
print("创建消息内容文本索引...");
db.logs.createIndex({ 
    "message": "text", 
    "service_name": "text" 
}, { 
    name: "text_search_idx",
    default_language: "none"  // 关闭语言分析，支持中文
});

// 4. 显示创建完成的索引
print("\n索引创建完成！当前所有索引:");
db.logs.getIndexes().forEach(function(index) {
    print("- " + index.name + ": " + JSON.stringify(index.key));
});

// 5. 显示索引大小统计
print("\n索引大小统计:");
var stats = db.logs.stats();
print("集合大小: " + (stats.size / 1024 / 1024).toFixed(2) + " MB");
print("索引大小: " + (stats.totalIndexSize / 1024 / 1024).toFixed(2) + " MB");
print("文档数量: " + stats.count);

print("\n索引创建脚本执行完成！");
