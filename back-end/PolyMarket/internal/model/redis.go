package model

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"

	"X402AiPolyMarket/PolyMarket/internal/config"
)

var RDB *redis.Client

// InitRedis 初始化Redis连接
func InitRedis(c config.RedisConfig) error {
	RDB = redis.NewClient(&redis.Options{
		Addr:     c.Host,
		Password: c.Password,
		DB:       c.DB,
		PoolSize: c.PoolSize,
	})

	// 测试连接
	ctx := context.Background()
	if err := RDB.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect redis: %w", err)
	}

	return nil
}

// CloseRedis 关闭Redis连接
func CloseRedis() error {
	if RDB != nil {
		return RDB.Close()
	}
	return nil
}

