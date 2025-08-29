# 使用官方Go镜像作为构建环境
FROM golang:1.23-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装protobuf编译器和相关工具
RUN apk add --no-cache protobuf-dev

# 复制go模块文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 安装protoc-gen-go和protoc-gen-go-grpc（使用兼容版本）
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.31.0
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.3.0

# 复制源代码
COPY . .

# 生成protobuf代码
RUN protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/log_service.proto

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o log-service .

# 使用轻量级的alpine镜像作为运行环境
FROM alpine:latest

# 安装ca-certificates用于HTTPS请求
RUN apk --no-cache add ca-certificates

# 设置工作目录
WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=builder /app/log-service .

# 暴露端口
EXPOSE 50051

# 运行应用
CMD ["./log-service"]
