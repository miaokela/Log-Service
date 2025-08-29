# Log Service Admin 管理界面

这是一个基于现有日志服务构建的Web管理界面，提供了直观的日志管理和查询功能。

## 🌟 特性

- **科技感界面设计**: 采用深色主题和霓虹蓝色调，营造科技感氛围
- **实时日志查询**: 支持多条件组合查询，实时显示日志数据
- **自定义日志创建**: 提供友好的表单界面，支持快速模板填充
- **统计仪表盘**: 直观显示日志统计信息和分布情况
- **响应式设计**: 适配不同屏幕尺寸，支持移动端访问

## 🏗️ 架构

```
admin/
├── backend/          # Go + Gin 后端API
│   ├── main.go      # 主程序入口
│   ├── handlers.go  # HTTP处理器
│   ├── go.mod       # Go模块文件
│   └── Dockerfile   # 后端容器构建文件
└── frontend/         # React + TypeScript 前端
    ├── src/
    │   ├── components/  # 公共组件
    │   ├── pages/      # 页面组件
    │   ├── utils/      # 工具函数
    │   └── App.tsx     # 应用入口
    ├── package.json    # 前端依赖
    ├── Dockerfile      # 前端容器构建文件
    └── nginx.conf      # Nginx配置
```

## 🚀 快速开始

### 1. 启动所有服务

使用提供的启动脚本：

```bash
./admin/start-admin.sh
```

或手动启动：

```bash
# 在项目根目录下
docker-compose up --build -d
```

### 2. 访问服务

- **管理界面**: http://localhost:3000
- **后端API**: http://localhost:8080
- **原日志服务**: grpc://localhost:50051

### 3. 服务验证

检查所有服务状态：
```bash
docker-compose ps
```

查看特定服务日志：
```bash
docker-compose logs -f admin-frontend
docker-compose logs -f admin-backend
```

## 📱 功能模块

### 仪表盘 (Dashboard)
- 总日志数统计
- 24小时内日志统计  
- 错误日志统计
- 活跃服务数统计
- 最近日志列表
- 日志级别分布图

### 日志查询 (Log Query)
- **基础查询**: 服务名、日志级别、消息关键字
- **高级筛选**: 时间范围、Trace ID
- **分页显示**: 支持自定义每页条数
- **实时搜索**: 输入即搜索，响应迅速

### 日志创建 (Log Create)
- **表单创建**: 完整的日志条目创建表单
- **元数据支持**: 动态添加键值对元数据
- **快速模板**: 预置的错误、警告、信息日志模板
- **字段验证**: 前端表单验证，确保数据完整性

## 🎨 界面设计

### 科技感主题
- **配色方案**: 深色背景 + 霓虹蓝主色调
- **视觉效果**: 毛玻璃效果、发光边框、渐变按钮
- **动画交互**: 平滑过渡、悬停效果、脉冲动画

### 响应式布局
- **桌面端**: 侧边栏 + 主内容区布局
- **移动端**: 自适应布局，touch友好的交互
- **组件库**: 基于Ant Design，深度定制样式

## 🔧 API接口

### 后端接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/logs` | GET | 查询日志列表 |
| `/api/logs` | POST | 创建新日志 |
| `/api/logs/:id` | GET | 获取单条日志 |
| `/api/logs/:id` | DELETE | 删除日志 |
| `/api/stats` | GET | 获取统计信息 |
| `/health` | GET | 健康检查 |

### 查询参数

```typescript
interface QueryParams {
  service_name?: string;    // 服务名筛选
  level?: string;          // 日志级别
  message?: string;        // 消息关键字
  trace_id?: string;       // Trace ID
  start_time?: string;     // 开始时间 (ISO 8601)
  end_time?: string;       // 结束时间 (ISO 8601)
  limit?: number;          // 每页条数 (默认20)
  offset?: number;         // 偏移量 (默认0)
}
```

## 🗄️ 数据结构

### 日志条目 (LogEntry)

```typescript
interface LogEntry {
  id: string;                      // 唯一标识
  service_name: string;            // 服务名称
  level: string;                   // 日志级别 (DEBUG|INFO|WARN|ERROR|FATAL)
  message: string;                 // 日志消息
  timestamp: string;               // 时间戳
  metadata: Record<string, string>; // 元数据键值对
  trace_id: string;                // 分布式追踪ID
  span_id: string;                 // Span ID
}
```

## 🔒 安全考虑

- **CORS配置**: 允许跨域访问，生产环境需配置具体域名
- **输入验证**: 前后端双重验证，防止恶意输入
- **SQL注入防护**: 使用MongoDB的参数化查询
- **容器安全**: 最小化容器镜像，定期更新基础镜像

## 🐳 Docker配置

### 服务编排

```yaml
# docker-compose.yml 新增服务
admin-backend:
  build: ./admin/backend
  ports: ["8080:8080"]
  depends_on: [mongodb]

admin-frontend:  
  build: ./admin/frontend
  ports: ["3000:80"]
  depends_on: [admin-backend]
```

### 网络配置
- 所有服务运行在同一网络 `log-service-network`
- 前端通过Nginx代理访问后端API
- 后端直接连接MongoDB数据库

## 🛠️ 开发指南

### 本地开发

1. **后端开发**:
```bash
cd admin/backend
go mod download
go run .
```

2. **前端开发**:
```bash
cd admin/frontend  
npm install
npm start
```

### 添加新功能

1. **后端新接口**: 在 `handlers.go` 中添加处理函数
2. **前端新页面**: 在 `src/pages/` 下创建新组件
3. **路由配置**: 在 `App.tsx` 中添加路由规则
4. **导航菜单**: 在 `components/Sidebar.tsx` 中添加菜单项

### 样式定制

主要样式文件：
- `src/index.css`: 全局样式和科技感效果
- `src/App.css`: 组件库样式覆盖
- 组件内联样式：动态响应主题

## 📈 性能优化

- **前端**: React.memo、懒加载、虚拟滚动
- **后端**: 数据库索引、分页查询、连接池
- **网络**: Nginx gzip压缩、静态资源缓存
- **数据库**: MongoDB索引优化，复合索引

## 🚦 监控与日志

- **健康检查**: 各服务都配置了健康检查端点
- **日志输出**: 结构化日志，便于问题排查
- **性能监控**: 可集成APM工具监控性能

## 🔮 未来规划

- [ ] 用户认证与权限管理
- [ ] 日志导出功能（Excel、CSV）
- [ ] 实时日志流显示
- [ ] 更多统计图表（时间序列、饼图等）
- [ ] 日志告警和通知
- [ ] 多语言支持

---

**技术栈**: Go + Gin + MongoDB + React + TypeScript + Ant Design + Docker

**设计理念**: 简洁高效、科技美感、用户友好
