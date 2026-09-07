package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/zeromicro/go-zero/core/logx"

	"X402AiPolyMarket/PolyMarket/internal/utils"
)

type RecoverMiddleware struct{}

func NewRecoverMiddleware() *RecoverMiddleware {
	return &RecoverMiddleware{}
}

func (m *RecoverMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				// 记录错误堆栈
				logx.Errorf("Panic recovered: %v\n%s", err, debug.Stack())

				// 返回服务器错误
				utils.ServerError(w, fmt.Sprintf("Internal server error: %v", err))
			}
		}()

		next(w, r)
	}
}

