package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
)

// GenerateNonce 生成登录随机数
func GenerateNonce() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GenerateLoginMessage 生成登录消息
func GenerateLoginMessage(nonce string) string {
	return fmt.Sprintf("Sign this message to login: %s", nonce)
}

