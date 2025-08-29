.PHONY: proto build run test clean docker-build docker-up docker-down

# 生成protobuf代码
proto:
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/log_service.proto

# 安装依赖
deps:
	go mod download
	go mod tidy

# 构建应用
build: proto
	go build -o bin/log-service .

# 运行应用（本地开发）
run: build
	./bin/log-service

# 运行测试
test:
	go test ./...

# 构建测试客户端
build-client: proto
	go build -o bin/client examples/client.go

# 运行测试客户端
run-client: build-client
	./bin/client

# 清理构建文件
clean:
	rm -rf bin/
	rm -f proto/*.pb.go

# 构建Docker镜像
docker-build:
	docker-compose build

# 启动Docker服务
docker-up:
	docker-compose up -d

# 停止Docker服务
docker-down:
	docker-compose down

# 查看Docker日志
docker-logs:
	docker-compose logs -f

# 重启服务
restart: docker-down docker-up

# 完整的开发环境设置
setup: deps proto build

# 安装protobuf工具
install-protoc-tools:
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
