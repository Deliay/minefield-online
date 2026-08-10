# Auth REST API Contract - Minefield Online

REST 认证契约。所有响应均为 JSON。本文将 `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout` 三条端点，作为前端与后端联调依据。

## 通用约定

- Base URL: `http://localhost:3001`（由 Aspire 编排，game-api 的 HTTP 端点）
- Content-Type: `application/json`
- 除 `logout` 外的端点均为公开接口
- `logout` 需携带 `Authorization: Bearer <token>`

## 数据对象

```typescript
interface User {
  username: string;      // 唯一（大小写不敏感）
  displayName: string;   // 排行榜展示名，默认 = username
  score: number;         // 持久化分数
}
```

**校验规则**
- username: 3-20 字符，仅字母数字下划线（`/^[A-Za-z0-9_]{3,20}$/`），唯一（大小写不敏感存储，展示保留原样）
- password: 最少 6 字符，bcrypt(10) 哈希存储
- 登录失败统一返回 `401`，不区分用户不存在 / 密码错误

## 注册

`POST /api/auth/register`

**Body**

```json
{ "username": "alice", "password": "secret1" }
```

**成功 (200)**

```json
{
  "token": "crypto-random-token-64-hex",
  "user": { "username": "alice", "displayName": "alice", "score": 0 }
}
```

注册成功后自动登录。

**失败**
- `409` 用户名已被占用：`{ "error": "用户名已被占用" }`
- `400` 参数不合法（格式/长度校验失败）：`{ "error": "<具体错误信息>" }`

## 登录

`POST /api/auth/login`

**Body**

```json
{ "username": "alice", "password": "secret1" }
```

**成功 (200)**

```json
{
  "token": "crypto-random-token-64-hex",
  "user": { "username": "alice", "displayName": "Alice", "score": 123 }
}
```

登录成功后：吊销旧 token，向旧会话发送 `forceLogout { reason: 'kicked' }` 并断开旧 socket。

**失败**
- `401` 用户名或密码错误：`{ "error": "用户名或密码错误" }`
- `400` 参数不合法：`{ "error": "<具体错误信息>" }`

## 登出

`POST /api/auth/logout`

**Header**: `Authorization: Bearer <token>`

**成功 (204)**: 无 Body，吊销该 token。

**失败**
- `401` token 缺失或无效：`{ "error": "无效的凭证" }`

## 错误码汇总

| 状态码 | 场景 |
|--------|------|
| 400 | 校验失败（格式/长度） |
| 401 | 凭证错误 / 未认证 |
| 409 | 用户名已被占用 |
| 204 | 登出成功 |