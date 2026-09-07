package health

import (
	"net/http"

	"X402AiPolyMarket/PolyMarket/internal/logic/health"
	"X402AiPolyMarket/PolyMarket/internal/svc"
	"X402AiPolyMarket/PolyMarket/internal/utils"
)

func HealthHandler(svcCtx *svc.ServiceContext) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		l := health.NewHealthLogic(r.Context(), svcCtx)
		resp, err := l.Health()
		if err != nil {
			utils.ServerError(w, err.Error())
			return
		}

		utils.Success(w, resp)
	}
}

