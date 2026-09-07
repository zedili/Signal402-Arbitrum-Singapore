package health

import (
	"context"

	"X402AiPolyMarket/PolyMarket/internal/model"
	"X402AiPolyMarket/PolyMarket/internal/svc"

	"github.com/zeromicro/go-zero/core/logx"
)

type HealthLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewHealthLogic(ctx context.Context, svcCtx *svc.ServiceContext) *HealthLogic {
	return &HealthLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

type HealthResponse struct {
	Status   string `json:"status"`
	Database string `json:"database"`
	Redis    string `json:"redis"`
}

func (l *HealthLogic) Health() (*HealthResponse, error) {
	resp := &HealthResponse{
		Status: "ok",
	}

	// 检查数据库连接
	sqlDB, err := model.DB.DB()
	if err != nil || sqlDB.Ping() != nil {
		resp.Database = "disconnected"
	} else {
		resp.Database = "connected"
	}

	// 检查Redis连接
	if err := model.RDB.Ping(l.ctx).Err(); err != nil {
		resp.Redis = "disconnected"
	} else {
		resp.Redis = "connected"
	}

	return resp, nil
}

