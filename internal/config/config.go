package config

import (
	"os"
	"strconv"
)

// Config 应用配置
type Config struct {
	Server   ServerConfig   `json:"server"`
	MongoDB  MongoDBConfig  `json:"mongodb"`
	LogQueue LogQueueConfig `json:"log_queue"`
}

// ServerConfig 服务器配置
type ServerConfig struct {
	Port int `json:"port"`
}

// MongoDBConfig MongoDB配置
type MongoDBConfig struct {
	URI      string `json:"uri"`
	Database string `json:"database"`
}

// LogQueueConfig 日志队列配置
type LogQueueConfig struct {
	BufferSize  int `json:"buffer_size"`
	FlushPeriod int `json:"flush_period"` // seconds
	BatchSize   int `json:"batch_size"`
}

// LoadConfig 加载配置
func LoadConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Port: getEnvAsInt("SERVER_PORT", 50051),
		},
		MongoDB: MongoDBConfig{
			URI:      getEnv("MONGODB_URI", "mongodb://localhost:27017"),
			Database: getEnv("MONGODB_DATABASE", "log_service"),
		},
		LogQueue: LogQueueConfig{
			BufferSize:  getEnvAsInt("LOG_BUFFER_SIZE", 1000),
			FlushPeriod: getEnvAsInt("LOG_FLUSH_PERIOD", 5),
			BatchSize:   getEnvAsInt("LOG_BATCH_SIZE", 100),
		},
	}
}

// getEnv 获取环境变量，如果不存在则返回默认值
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsInt 获取环境变量并转换为int，如果不存在或转换失败则返回默认值
func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
