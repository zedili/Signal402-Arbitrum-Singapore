package auth

import (
	"context"
	"time"

	"X402AiPolyMarket/PolyMarket/internal/model"
	"X402AiPolyMarket/PolyMarket/internal/svc"
	"X402AiPolyMarket/PolyMarket/internal/types"
	"X402AiPolyMarket/PolyMarket/internal/utils"

	"github.com/zeromicro/go-zero/core/logx"
	"gorm.io/gorm"
)

type RefreshLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewRefreshLogic(ctx context.Context, svcCtx *svc.ServiceContext) *RefreshLogic {
	return &RefreshLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *RefreshLogic) RefreshToken(req *types.RefreshTokenRequest) (*types.RefreshTokenResponse, error) {
	// 验证 Refresh Token 是否存在且未过期
	var refreshToken model.RefreshToken
	err := model.DB.Where("token = ? AND expires_at > ?", req.RefreshToken, time.Now()).
		First(&refreshToken).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, utils.NewError(utils.CodeUnauthorized, "Invalid or expired refresh token")
		}
		logx.Errorf("Failed to query refresh token: %v", err)
		return nil, utils.NewError(utils.CodeServerError, "Failed to verify refresh token")
	}

	// 查询用户信息
	var user model.User
	if err := model.DB.First(&user, refreshToken.UserID).Error; err != nil {
		logx.Errorf("Failed to query user: %v", err)
		return nil, utils.NewError(utils.CodeServerError, "Failed to query user")
	}

	// 生成新的 Access Token
	accessToken, err := utils.GenerateToken(
		user.ID,
		user.WalletAddress,
		l.svcCtx.Config.Auth.AccessSecret,
		l.svcCtx.Config.Auth.AccessExpire,
	)
	if err != nil {
		logx.Errorf("Failed to generate access token: %v", err)
		return nil, utils.NewError(utils.CodeServerError, "Failed to generate token")
	}

	return &types.RefreshTokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   l.svcCtx.Config.Auth.AccessExpire,
	}, nil
}

