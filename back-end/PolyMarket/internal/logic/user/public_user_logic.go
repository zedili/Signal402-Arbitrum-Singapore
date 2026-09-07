package user

import (
	"context"

	"X402AiPolyMarket/PolyMarket/internal/model"
	"X402AiPolyMarket/PolyMarket/internal/svc"
	"X402AiPolyMarket/PolyMarket/internal/types"
	"X402AiPolyMarket/PolyMarket/internal/utils"

	"github.com/zeromicro/go-zero/core/logx"
)

type PublicUserLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewPublicUserLogic(ctx context.Context, svcCtx *svc.ServiceContext) *PublicUserLogic {
	return &PublicUserLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *PublicUserLogic) GetPublicUser(address string) (*types.PublicUserResponse, error) {
	// 验证地址格式
	if !utils.IsValidAddress(address) {
		return nil, utils.NewError(utils.CodeInvalidAddress, "Invalid wallet address")
	}

	// 标准化地址
	normalizedAddress := utils.NormalizeAddress(address)

	// 查询用户信息
	var user model.User
	if err := model.DB.Where("wallet_address = ?", normalizedAddress).First(&user).Error; err != nil {
		logx.Errorf("Failed to query user: %v", err)
		return nil, utils.NewError(utils.CodeNotFound, "User not found")
	}

	// 获取用户统计数据
	stats := user.GetStats()

	return &types.PublicUserResponse{
		WalletAddress: user.WalletAddress,
		Username:      user.Username,
		AvatarURL:     user.AvatarURL,
		Bio:           user.Bio,
		CreatedAt:     user.CreatedAt,
		Stats: &types.UserStats{
			TotalTrades: stats.TotalTrades,
			WinRate:     stats.WinRate,
		},
	}, nil
}

