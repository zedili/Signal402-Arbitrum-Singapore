package user

import (
	"context"

	"X402AiPolyMarket/PolyMarket/internal/middleware"
	"X402AiPolyMarket/PolyMarket/internal/model"
	"X402AiPolyMarket/PolyMarket/internal/svc"
	"X402AiPolyMarket/PolyMarket/internal/types"
	"X402AiPolyMarket/PolyMarket/internal/utils"

	"github.com/zeromicro/go-zero/core/logx"
)

type ProfileLogic struct {
	logx.Logger
	ctx    context.Context
	svcCtx *svc.ServiceContext
}

func NewProfileLogic(ctx context.Context, svcCtx *svc.ServiceContext) *ProfileLogic {
	return &ProfileLogic{
		Logger: logx.WithContext(ctx),
		ctx:    ctx,
		svcCtx: svcCtx,
	}
}

func (l *ProfileLogic) GetProfile() (*types.UserProfileResponse, error) {
	// 从 context 获取用户 ID
	userID, ok := middleware.GetUserID(l.ctx)
	if !ok {
		return nil, utils.NewError(utils.CodeUnauthorized, "Unauthorized")
	}

	// 查询用户信息
	var user model.User
	if err := model.DB.First(&user, userID).Error; err != nil {
		logx.Errorf("Failed to query user: %v", err)
		return nil, utils.NewError(utils.CodeNotFound, "User not found")
	}

	// 获取用户统计数据
	stats := user.GetStats()

	return &types.UserProfileResponse{
		ID:            user.ID,
		WalletAddress: user.WalletAddress,
		Username:      user.Username,
		AvatarURL:     user.AvatarURL,
		Email:         user.Email,
		Bio:           user.Bio,
		CreatedAt:     user.CreatedAt,
		LastLoginAt:   user.LastLoginAt,
		Stats: &types.UserStats{
			TotalTrades: stats.TotalTrades,
			TotalVolume: stats.TotalVolume,
			TotalProfit: stats.TotalProfit,
			WinCount:    stats.WinCount,
			LoseCount:   stats.LoseCount,
			WinRate:     stats.WinRate,
		},
	}, nil
}

func (l *ProfileLogic) UpdateProfile(req *types.UpdateProfileRequest) (*types.UserProfileResponse, error) {
	// 从 context 获取用户 ID
	userID, ok := middleware.GetUserID(l.ctx)
	if !ok {
		return nil, utils.NewError(utils.CodeUnauthorized, "Unauthorized")
	}

	// 查询用户信息
	var user model.User
	if err := model.DB.First(&user, userID).Error; err != nil {
		logx.Errorf("Failed to query user: %v", err)
		return nil, utils.NewError(utils.CodeNotFound, "User not found")
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Username != nil {
		updates["username"] = *req.Username
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Bio != nil {
		updates["bio"] = *req.Bio
	}

	// 执行更新
	if len(updates) > 0 {
		if err := model.DB.Model(&user).Updates(updates).Error; err != nil {
			logx.Errorf("Failed to update user: %v", err)
			return nil, utils.NewError(utils.CodeServerError, "Failed to update profile")
		}
	}

	// 重新查询用户信息
	if err := model.DB.First(&user, userID).Error; err != nil {
		logx.Errorf("Failed to query user: %v", err)
		return nil, utils.NewError(utils.CodeServerError, "Failed to query user")
	}

	return &types.UserProfileResponse{
		ID:            user.ID,
		WalletAddress: user.WalletAddress,
		Username:      user.Username,
		AvatarURL:     user.AvatarURL,
		Email:         user.Email,
		Bio:           user.Bio,
		CreatedAt:     user.CreatedAt,
		LastLoginAt:   user.LastLoginAt,
	}, nil
}

