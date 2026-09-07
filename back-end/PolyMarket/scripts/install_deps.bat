@echo off

echo =========================================
echo   PolyMarket Backend Dependency Installer
echo =========================================
echo.

echo Checking Go version...
go version
if %errorlevel% neq 0 (
    echo ERROR: Go is not installed or not in PATH
    pause
    exit /b 1
)
echo.

cd /d "%~dp0.."
echo Current directory: %cd%
echo.

if not exist "go.mod" (
    echo Initializing go.mod...
    go mod init X402AiPolyMarket/PolyMarket
)
echo.

echo Installing go-zero...
go get -u github.com/zeromicro/go-zero@latest

echo Installing database drivers...
go get -u gorm.io/gorm
go get -u gorm.io/driver/mysql

echo Installing Redis client...
go get -u github.com/redis/go-redis/v9

echo Installing Ethereum libs...
go get -u github.com/ethereum/go-ethereum

echo Installing JWT...
go get -u github.com/golang-jwt/jwt/v5

echo Installing utilities...
go get -u github.com/google/uuid
go get -u golang.org/x/crypto

echo.
echo Tidying modules...
go mod tidy

echo.
echo =========================================
echo   Dependencies Installed Successfully
echo =========================================
echo.
pause
