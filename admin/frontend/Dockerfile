# Production stage - 直接使用已构建的文件
FROM nginx:alpine

# 复制构建好的静态文件
COPY build/ /usr/share/nginx/html/

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]
