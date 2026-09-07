#!/bin/bash

# 依赖安装脚本
echo "========================================="
echo "  PolyMarket 后端依赖安装脚本"
echo "========================================="
echo ""

# 检查 Go 版本
echo "检查 Go 版本..."
go version
if [ $? -ne 0 ]; then
    echo "错误: 未安装 Go 或 Go 不在 PATH 中"
    exit 1
fi
echo ""

# 进入项目目录
cd "$(dirname "$0")/.."
echo "当前目录: $(pwd)"
echo ""

# 初始化 go.mod（如果不存在）
if [ ! -f "go.mod" ]; then
    echo "初始化 go.mod..."
    go mod init X402AiPolyMarket/PolyMarket
fi
echo ""

# 安装核心依赖
echo "安装 go-zero 框架..."
go get -u github.com/zeromicro/go-zero@latest

echo "安装数据库驱动..."
go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql

echo "安装 Redis 客户端..."
go get -u github.com/redis/go-redis/v9

echo "安装以太坊相关..."
go get -u github.com/ethereum/go-ethereum

echo "安装 JWT..."
go get -u github.com/golang-jwt/jwt/v5

echo "安装工具库..."
go get -u github.com/google/uuid
go get -u golang.org/x/crypto

echo ""
echo "整理依赖..."
go mod tidy

echo ""
echo "========================================="
echo "  依赖安装完成！"
echo "========================================="
echo ""
echo "下一步："
echo "1. 配置数据库: mysql -u root -p < scripts/init_db.sql"
echo "2. 修改配置文件: etc/polymarket-api.yaml"
echo "3. 启动服务: go run polymarket.go"
echo ""

