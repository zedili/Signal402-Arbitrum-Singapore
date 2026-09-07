package auth

import (
	"context"

	"X402AiPolyMarket/PolyMarket/internal/middleware"
	"X402AiPolyMarket/PolyMarket/internal/model"
	"X402AiPolyMarket/PolyMarket/internal/svc"
	"X402AiPolyMarket/PolyMarket/internal/utils"

	"github.com/zeromicro/go-zero/core/logx"
)

type LogoutLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewLogoutLogic(ctx context.Context, svcCtx *svc.ServiceContext) *LogoutLogic {
	return &LogoutLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *LogoutLogic) Logout() error {
	// 从 context 获取用户 ID
	userID, ok := middleware.GetUserID(l.ctx)
	if !ok {
		return utils.NewError(utils.CodeUnauthorized, "Unauthorized")
	}

	// 删除用户的所有 Refresh Token
	if err := model.DB.Where("user_id = ?", userID).Delete(&model.RefreshToken{}).Error; err != nil {
		logx.Errorf("Failed to delete refresh tokens: %v", err)
		return utils.NewError(utils.CodeServerError, "Failed to logout")
	}

	return nil
}

