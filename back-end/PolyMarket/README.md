# PolyMarket 后端服务

X402AiPolyMarket 项目的后端服务，基于 go-zero 微服务框架构建。

## 🚀 快速开始

### 1. 环境要求

- Go 1.20+
- MySQL 8.0+
- Redis 6.0+
- goctl (go-zero 代码生成工具)

### 2. 安装依赖

```bash
# 进入项目目录
cd back-end/PolyMarket

# 安装依赖
go mod tidy
```

### 3. 配置数据库

```bash
# 创建数据库并初始化表结构
mysql -u root -p < scripts/init_db.sql
```

### 4. 修改配置文件

编辑 `etc/polymarket-api.yaml`，修改数据库和Redis连接信息：

```yaml
MySQL:
  Host: 127.0.0.1
  Port: 3306
  User: root
  Password: your_password  # 修改为你的密码
  Database: polymarket

Redis:
  Host: 127.0.0.1:6379
  Password: ""  # 如果有密码请填写
```

### 5. 启动服务

```bash
# 开发环境
go run polymarket.go -f etc/polymarket-api.yaml

# 或者编译后运行
go build -o polymarket
./polymarket -f etc/polymarket-api.yaml
```

### 6. 测试接口

```bash
# 健康检查
curl http://localhost:8888/api/v1/health

# 预期响应
{
  "code": 0,
  "msg": "success",
  "data": {
    "status": "ok",
    "database": "connected",
    "redis": "connected"
  },
  "timestamp": 1704355200
}
```

## 📁 项目结构

```
PolyMarket/
├── api/                    # API定义文件
├── etc/                    # 配置文件
├── internal/               # 内部代码
│   ├── config/            # 配置结构体
│   ├── handler/           # HTTP处理器
│   ├── logic/             # 业务逻辑
│   ├── middleware/        # 中间件
│   ├── model/             # 数据模型
│   ├── svc/               # 服务上下文
│   ├── types/             # 类型定义
│   └── utils/             # 工具函数
├── scripts/               # 脚本文件
├── logs/                  # 日志目录
└── polymarket.go          # 主入口
```

## 🔧 开发指南

### 添加新接口

1. 修改 `api/polymarket.api` 文件
2. 运行代码生成：`goctl api go -api api/polymarket.api -dir .`
3. 在 `internal/logic` 中实现业务逻辑

### 数据库操作

使用 GORM 进行数据库操作：

```go
import "X402AiPolyMarket/PolyMarket/internal/model"

// 查询示例
var user User
model.DB.Where("wallet_address = ?", address).First(&user)
```

### Redis 操作

```go
import "X402AiPolyMarket/PolyMarket/internal/model"

// 设置缓存
model.RDB.Set(ctx, "key", "value", time.Hour)

// 获取缓存
val, err := model.RDB.Get(ctx, "key").Result()
```

## 📝 API 文档

### 统一响应格式

```json
{
  "code": 0,
  "msg": "success",
  "data": {},
  "timestamp": 1704355200
}
```

### 错误码

- `0` - 成功
- `1001` - 参数错误
- `1002` - 未授权
- `1005` - 服务器错误

## 🔒 安全注意事项

1. **生产环境配置**：
   - 修改 JWT Secret
   - 限制 CORS 允许的来源
   - 使用环境变量管理敏感信息

2. **数据库安全**：
   - 不要在代码中硬编码密码
   - 使用强密码
   - 定期备份数据

## 📊 监控与日志

日志文件位于 `logs/` 目录，可以通过修改配置文件调整日志级别：

```yaml
Log:
  Level: info  # debug, info, warn, error
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 📄 License

MIT License

