# X402AiPolyMarket API接口设计文档

## 📌 接口规范

### 基础信息
- **Base URL**: `http://localhost:8888/api/v1`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式
```json
{
  "code": 0,           // 0:成功 其他:错误码
  "msg": "success",    // 响应消息
  "data": {},          // 响应数据
  "timestamp": 1704355200
}
```

### 错误码定义
```
0     - 成功
1001  - 参数错误
1002  - 未授权
1003  - 禁止访问
1004  - 资源不存在
1005  - 服务器错误
2001  - 钱包地址无效
2002  - 签名验证失败
3001  - 市场不存在
3002  - 市场已结束
4001  - 余额不足
4002  - 订单不存在
```

---

## 🔐 一、用户认证模块

### 1.1 钱包登录
**接口**: `POST /auth/login`

**请求参数**:
```json
{
  "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Sign this message to login: 1704355200"
}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "user": {
      "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "username": "User123",
      "avatar_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 1.2 刷新Token
**接口**: `POST /auth/refresh`

**请求头**:
```
Authorization: Bearer {refresh_token}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

### 1.3 登出
**接口**: `POST /auth/logout`

**请求头**:
```
Authorization: Bearer {token}
```

---

## 👤 二、用户管理模块

### 2.1 获取用户资料
**接口**: `GET /user/profile`

**请求头**:
```
Authorization: Bearer {token}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "username": "User123",
    "avatar_url": "https://...",
    "email": "user@example.com",
    "bio": "Crypto enthusiast",
    "created_at": "2024-01-01T00:00:00Z",
    "stats": {
      "total_trades": 156,
      "win_rate": 67.5,
      "total_profit": 12500.50,
      "total_volume": 85000.00
    }
  }
}
```

### 2.2 更新用户资料
**接口**: `PUT /user/profile`

**请求参数**:
```json
{
  "username": "NewUsername",
  "avatar_url": "https://...",
  "email": "newemail@example.com",
  "bio": "Updated bio"
}
```

### 2.3 获取用户统计
**接口**: `GET /user/stats`

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_trades": 156,
    "total_markets": 45,
    "win_rate": 67.5,
    "total_profit": 12500.50,
    "total_volume": 85000.00,
    "active_positions": 8,
    "rank": 125,
    "monthly_profit": 2500.00,
    "best_prediction": {
      "market_id": 123,
      "question": "Will Bitcoin reach $100k?",
      "profit": 5000.00
    }
  }
}
```

---

## 📊 三、市场管理模块

### 3.1 获取市场列表
**接口**: `GET /market/list`

**请求参数**:
```
page=1
page_size=20
category=CRYPTO          // 可选: CRYPTO, TECH, STOCKS, POLITICS, SPORTS, SCIENCE
status=1                 // 可选: 0:待开始 1:进行中 2:已结束 3:已结算
sort=volume              // 可选: volume, created_at, end_time
order=desc               // 可选: asc, desc
search=Bitcoin           // 可选: 搜索关键词
is_hot=true             // 可选: 是否热门
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": 247,
    "page": 1,
    "page_size": 20,
    "markets": [
      {
        "id": 1,
        "question": "Will Bitcoin reach $100,000 by end of 2025?",
        "description": "Market will resolve YES if...",
        "category": "CRYPTO",
        "creator_address": "0x...",
        "contract_address": "0x...",
        
        "yes_price": 67,
        "no_price": 33,
        "total_volume": "2400000",
        "total_liquidity": "500000",
        "participant_count": 1250,
        
        "ai_prediction": 72,
        "confidence": 22,
        "suggests": "YES",
        
        "start_time": "2024-01-01T00:00:00Z",
        "end_time": "2025-12-31T23:59:59Z",
        "status": 1,
        
        "is_hot": true,
        "is_featured": false,
        
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 3.2 获取市场详情
**接口**: `GET /market/:id`

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": 1,
    "question": "Will Bitcoin reach $100,000 by end of 2025?",
    "description": "This market will resolve to YES if Bitcoin (BTC) reaches or exceeds $100,000 USD on any major exchange before December 31, 2025 23:59:59 UTC.",
    "category": "CRYPTO",
    "creator": {
      "address": "0x...",
      "username": "CryptoTrader",
      "avatar_url": "https://..."
    },
    "contract_address": "0x...",

    "prices": {
      "yes_price": 67,
      "no_price": 33,
      "yes_shares": 670000,
      "no_shares": 330000
    },

    "stats": {
      "total_volume": "2400000",
      "total_liquidity": "500000",
      "participant_count": 1250,
      "total_yes_volume": "1608000",
      "total_no_volume": "792000"
    },

    "ai_analysis": {
      "prediction": 72,
      "confidence": 22,
      "suggests": "YES",
      "last_updated": "2024-01-04T10:00:00Z",
      "factors": [
        "Historical price trends show strong momentum",
        "Institutional adoption increasing",
        "Halving event in 2024"
      ]
    },

    "timeline": {
      "start_time": "2024-01-01T00:00:00Z",
      "end_time": "2025-12-31T23:59:59Z",
      "settlement_time": null
    },

    "status": 1,
    "result": null,

    "tags": ["hot", "trending"],

    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-04T10:00:00Z"
  }
}
```

### 3.3 创建市场
**接口**: `POST /market/create`

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "question": "Will Ethereum reach $10,000 by end of 2025?",
  "description": "This market will resolve to YES if...",
  "category": "CRYPTO",
  "end_time": "2025-12-31T23:59:59Z",
  "initial_liquidity": 10000,
  "tags": ["ethereum", "price-prediction"]
}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "market_id": 248,
    "contract_address": "0x...",
    "tx_hash": "0x...",
    "status": "pending"  // pending审核中, approved已通过
  }
}
```

### 3.4 获取市场统计
**接口**: `GET /market/:id/stats`

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "price_history": [
      {
        "timestamp": "2024-01-01T00:00:00Z",
        "yes_price": 50,
        "no_price": 50,
        "volume_24h": 0
      },
      {
        "timestamp": "2024-01-02T00:00:00Z",
        "yes_price": 55,
        "no_price": 45,
        "volume_24h": 50000
      }
    ],
    "volume_by_day": [
      {
        "date": "2024-01-01",
        "volume": 100000
      }
    ],
    "top_traders": [
      {
        "address": "0x...",
        "username": "Trader1",
        "position": "YES",
        "shares": 10000,
        "profit": 2500
      }
    ]
  }
}
```

### 3.5 获取热门市场
**接口**: `GET /market/hot`

**请求参数**:
```
limit=10  // 默认10
```

### 3.6 获取分类列表
**接口**: `GET /market/categories`

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "name": "CRYPTO",
      "display_name": "Cryptocurrency",
      "count": 85,
      "icon": "₿"
    },
    {
      "name": "TECH",
      "display_name": "Technology",
      "count": 62,
      "icon": "💻"
    }
  ]
}
```

---

## 💰 四、交易模块

### 4.1 创建订单
**接口**: `POST /trade/order`

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```json
{
  "market_id": 1,
  "order_type": 0,      // 0:买入 1:卖出
  "position": 1,        // 0:NO 1:YES
  "amount": 100,        // 购买数量
  "price": 67,          // 价格（cents）
  "slippage": 1         // 滑点容忍度（%）
}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "order_id": 12345,
    "market_id": 1,
    "order_type": 0,
    "position": 1,
    "amount": 100,
    "price": 67,
    "total_value": 6700,
    "fee": 67,
    "status": 0,
    "tx_hash": "0x...",
    "created_at": "2024-01-04T10:00:00Z"
  }
}
```

### 4.2 获取订单列表
**接口**: `GET /trade/orders`

**请求参数**:
```
page=1
page_size=20
market_id=1          // 可选
status=0             // 可选: 0:待成交 1:部分成交 2:完全成交 3:已取消
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": 50,
    "orders": [
      {
        "id": 12345,
        "market_id": 1,
        "market_question": "Will Bitcoin reach $100k?",
        "order_type": 0,
        "position": 1,
        "amount": 100,
        "price": 67,
        "filled_amount": 50,
        "total_value": 6700,
        "fee": 67,
        "status": 1,
        "tx_hash": "0x...",
        "created_at": "2024-01-04T10:00:00Z"
      }
    ]
  }
}
```

### 4.3 取消订单
**接口**: `DELETE /trade/order/:id`

**请求头**:
```
Authorization: Bearer {token}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "order_id": 12345,
    "status": 3,
    "tx_hash": "0x..."
  }
}
```

### 4.4 获取交易历史
**接口**: `GET /trade/history`

**请求参数**:
```
page=1
page_size=20
market_id=1          // 可选
start_time=...       // 可选
end_time=...         // 可选
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": 156,
    "trades": [
      {
        "id": 9876,
        "market_id": 1,
        "market_question": "Will Bitcoin reach $100k?",
        "position": 1,
        "amount": 50,
        "price": 67,
        "total_value": 3350,
        "fee": 33.5,
        "is_buyer": true,
        "counterparty": "0x...",
        "tx_hash": "0x...",
        "created_at": "2024-01-04T10:00:00Z"
      }
    ]
  }
}
```

### 4.5 获取持仓列表
**接口**: `GET /position/list`

**请求头**:
```
Authorization: Bearer {token}
```

**请求参数**:
```
status=active        // 可选: active, settled
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_value": 25000,
    "total_cost": 20000,
    "total_pnl": 5000,
    "positions": [
      {
        "market_id": 1,
        "market_question": "Will Bitcoin reach $100k?",
        "position": 1,
        "shares": 100,
        "avg_price": 65,
        "total_cost": 6500,
        "current_price": 67,
        "current_value": 6700,
        "unrealized_pnl": 200,
        "pnl_percentage": 3.08,
        "market_status": 1,
        "end_time": "2025-12-31T23:59:59Z"
      }
    ]
  }
}
```

---

## 🤖 五、AI预测模块

### 5.1 获取AI预测
**接口**: `GET /ai/prediction/:marketId`

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "market_id": 1,
    "prediction_value": 72,
    "confidence": 22,
    "suggests": "YES",
    "model_version": "v2.1.0",
    "analysis": {
      "sentiment_score": 0.68,
      "trend_score": 0.75,
      "volume_indicator": 0.82,
      "key_factors": [
        "Strong bullish sentiment on social media",
        "Increasing institutional adoption",
        "Technical indicators show upward momentum"
      ],
      "risk_factors": [
        "Regulatory uncertainty",
        "Market volatility"
      ]
    },
    "historical_accuracy": 87.3,
    "last_updated": "2024-01-04T10:00:00Z"
  }
}
```

### 5.2 获取AI准确率统计
**接口**: `GET /ai/accuracy`

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "overall_accuracy": 87.3,
    "total_predictions": 1250,
    "correct_predictions": 1091,
    "by_category": [
      {
        "category": "CRYPTO",
        "accuracy": 89.5,
        "total": 450
      }
    ],
    "by_confidence": [
      {
        "confidence_range": "80-100",
        "accuracy": 95.2,
        "total": 320
      }
    ],
    "recent_performance": [
      {
        "date": "2024-01",
        "accuracy": 88.5
      }
    ]
  }
}
```

---

## 💳 六、钱包模块

### 6.1 查询余额
**接口**: `GET /wallet/balance`

**请求头**:
```
Authorization: Bearer {token}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "wallet_address": "0x...",
    "usdc_balance": 10000.50,
    "token_balance": 5000.00,
    "frozen_balance": 500.00,
    "available_balance": 9500.50,
    "total_value_usd": 15000.50,
    "updated_at": "2024-01-04T10:00:00Z"
  }
}
```

### 6.2 获取交易流水
**接口**: `GET /wallet/transactions`

**请求参数**:
```
page=1
page_size=20
tx_type=2            // 可选: 0:充值 1:提现 2:交易 3:奖励 4:手续费
start_time=...       // 可选
end_time=...         // 可选
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": 500,
    "transactions": [
      {
        "id": 12345,
        "tx_type": 2,
        "tx_type_name": "交易",
        "amount": -6700,
        "currency": "USDC",
        "balance_before": 16700.50,
        "balance_after": 10000.50,
        "related_type": "order",
        "related_id": 12345,
        "tx_hash": "0x...",
        "status": 1,
        "remark": "Buy YES shares in market #1",
        "created_at": "2024-01-04T10:00:00Z"
      }
    ]
  }
}
```

### 6.3 支付AI服务费
**接口**: `POST /payment/ai-service`

**请求参数**:
```json
{
  "service_type": "advanced_analysis",
  "market_id": 1,
  "use_token": true,
  "max_token_amount": 100
}
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "payment_id": 789,
    "original_fee": 10,
    "discount_rate": 10,
    "token_paid": 90,
    "discount_saved": 10,
    "tx_hash": "0x...",
    "created_at": "2024-01-04T10:00:00Z"
  }
}
```

---

## 🏆 七、排行榜模块

### 7.1 收益排行榜
**接口**: `GET /leaderboard/profit`

**请求参数**:
```
period=all           // all, month, week
limit=100
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "period": "all",
    "updated_at": "2024-01-04T10:00:00Z",
    "leaderboard": [
      {
        "rank": 1,
        "address": "0x...",
        "username": "CryptoKing",
        "avatar_url": "https://...",
        "total_profit": 125000.50,
        "win_rate": 78.5,
        "total_trades": 450,
        "badge": "🏆"
      }
    ],
    "my_rank": {
      "rank": 125,
      "total_profit": 12500.50
    }
  }
}
```

### 7.2 平台统计
**接口**: `GET /stats/platform`

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total_volume": "12800000",
    "total_markets": 247,
    "active_markets": 156,
    "total_users": 15200,
    "active_users_24h": 3500,
    "total_trades": 125000,
    "ai_accuracy": 87.3,
    "total_liquidity": "5600000",
    "updated_at": "2024-01-04T10:00:00Z"
  }
}
```

---

## 🔔 八、通知模块

### 8.1 获取通知列表
**接口**: `GET /notification/list`

**请求参数**:
```
page=1
page_size=20
type=1               // 可选: 0:系统 1:交易 2:结算 3:个人
is_read=false        // 可选
```

**响应数据**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": 50,
    "unread_count": 12,
    "notifications": [
      {
        "id": 123,
        "type": 1,
        "type_name": "交易",
        "title": "订单成交",
        "content": "您的订单已完全成交",
        "related_type": "order",
        "related_id": 12345,
        "is_read": false,
        "created_at": "2024-01-04T10:00:00Z"
      }
    ]
  }
}
```

---

## 🔧 九、管理后台模块

### 9.1 市场审核
**接口**: `PUT /admin/market/:id/approve`

**请求头**:
```
Authorization: Bearer {admin_token}
```

**请求参数**:
```json
{
  "approved": true,
  "reason": "符合平台规则"
}
```

### 9.2 用户管理
**接口**: `GET /admin/users`

**请求参数**:
```
page=1
page_size=20
status=0             // 可选: 0:正常 1:禁用
search=...           // 可选: 搜索地址或用户名
```

---

## 📝 附录

### WebSocket接口

**连接地址**: `ws://localhost:8888/ws`

**订阅市场价格更新**:
```json
{
  "action": "subscribe",
  "channel": "market_price",
  "market_id": 1
}
```

**接收价格推送**:
```json
{
  "channel": "market_price",
  "market_id": 1,
  "data": {
    "yes_price": 68,
    "no_price": 32,
    "volume_24h": 150000,
    "timestamp": "2024-01-04T10:00:00Z"
  }
}
```


