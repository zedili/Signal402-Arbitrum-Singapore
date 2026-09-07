// Code scaffolded by goctl. Safe to edit.
// goctl 1.9.2

package svc

import (
	"X402AiPolyMarket/PolyMarket/internal/config"
	"X402AiPolyMarket/PolyMarket/internal/model"
)

type ServiceContext struct {
	Config config.Config
}

func NewServiceContext(c config.Config) *ServiceContext {
	// 初始化数据库
	if err := model.InitDB(c.MySQL); err != nil {
		panic(err)
	}

	// 初始化 Redis
	if err := model.InitRedis(c.Redis); err != nil {
		panic(err)
	}

	return &ServiceContext{
		Config: c,
	}
}
