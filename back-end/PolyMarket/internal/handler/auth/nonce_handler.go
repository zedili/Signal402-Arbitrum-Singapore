package auth

import (
	"encoding/json"
	"net/http"

	"X402AiPolyMarket/PolyMarket/internal/logic/auth"
	"X402AiPolyMarket/PolyMarket/internal/svc"
	"X402AiPolyMarket/PolyMarket/internal/types"
	"X402AiPolyMarket/PolyMarket/internal/utils"
)

func NonceHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.NonceRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.ParamError(w, "Invalid request body")
			return
		}

		l := auth.NewNonceLogic(r.Context(), svcCtx)
		resp, err := l.GetNonce(&req)
		if err != nil {
			if customErr, ok := utils.IsCustomError(err); ok {
				utils.Error(w, customErr.Code, customErr.Msg)
			} else {
				utils.ServerError(w, err.Error())
			}
			return
		}

		utils.Success(w, resp)
	}
}

