# NF 模式与 NF 结算计分 - API 契约

关联 PRD：[05-NF模式与NF结算计分](../docs/product/draft/05-NF模式与NF结算计分.md)
关联技术方案：[20260822-nf-mode-scoring-proposal](../docs/engineering/proposals/20260822-nf-mode-scoring-proposal.md)

本文档定义 NF 模式与 NF 结算计分功能的 API 契约。NF 模式为**会话级（session-scoped）**状态，仅影响开启者自身的 flag 能力与计分，不改变共享棋盘。因此**不新增任何 REST 端点**，所有变更均通过对既有 WebSocket 事件的字段扩展与新增事件完成，并保持向后兼容。

## 1. 契约总览

| 变更类型 | 位置 | 说明 |
|---------|------|------|
| 字段扩展 | `InitEvent` | `user` 增加 `nfMode`/`nfSettled`，顶层增加 `settled` 已结算雷列表 |
| 字段扩展 | `Ranking`（排行榜） | 增加 `nfMode`/`nfSettled` |
| 新增事件 | `setNfMode`（C→S） | 切换 NF 模式开关 |
| 新增事件 | `nfModeUpdated`（S→C） | 服务端确认 NF 模式状态变更 |
| 新增事件 | `nfSettled`（S→C） | NF 结算结果，供前端渲染标记 |
| 行为变更 | `reveal` | NF 模式下翻开数字后触发 8 邻域结算 |
| 行为变更 | `flag` | NF 模式下忽略（不再插旗/计分） |
| 行为变更 | `chord` | NF 模式下禁用（依赖 flag 计数，无 flag 语义） |

## 2. REST API

NF 模式为会话级状态，切换通过 WebSocket 事件完成，**本期不新增 REST 端点**。认证契约保持与 `auth-api.md` 一致。

- `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout`：不变。
- `User` 对象（REST 侧）保持 `{ username, displayName, score }`，**不**新增 NF 字段（NF 状态不持久化到账号，仅存在于会话生命周期）。

## 3. WebSocket 事件

连接与鉴权方式同 `websocket.md`（`ws://localhost:3001`，握手 `auth.token`）。

### 3.1 Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `setNfMode` | `{ enabled: boolean }` | 切换 NF 模式。成功后服务端更新 `session.nfMode` 并广播排行榜 |
| `reveal` | `{ col: number, row: number }` | 已存在。NF 模式下翻开**数字**格子后，额外对其 8 邻域执行 NF 结算（见 4 结算规则） |
| `flag` | `{ col: number, row: number }` | 已存在。**NF 模式下忽略**：不插旗、不计分、不广播 `cellFlagged` |
| `chord` | `{ col: number, row: number }` | 已存在。**NF 模式下禁用**：服务端返回空结果（等效 `cells: []`），前端隐藏入口 |

### 3.2 Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `init` | `InitEvent`（扩展） | 连接初始化，含当前用户 `nfMode`、累计 NF 结算雷数、已结算雷坐标列表 |
| `nfModeUpdated` | `NfModeUpdatedEvent` | NF 模式状态确认，前端据此同步开关 UI |
| `nfSettled` | `NfSettledEvent` | 一次 NF 结算的结果，前端据此渲染已结算雷的 NF 标记 |
| `leaderboard` | `LeaderboardEvent`（扩展） | 排行榜数据，`Ranking` 增加 NF 标识字段 |
| `scoreUpdate` | `ScoreUpdateEvent` | 已存在。NF 结算加分后照常广播 |

## 4. 数据对象

```typescript
interface NfModeUpdatedEvent {
  nfMode: boolean;
}

interface SettledMine {
  col: number;
  row: number;
}

interface NfSettledEvent {
  col: number;             // 本次翻开的数字格 col（结算触发点）
  row: number;             // 本次翻开的数字格 row
  mines: SettledMine[];    // 本次被结算的雷坐标列表（连续雷簇）
  delta: number;           // 本次加分数（= mines.length × NF_PER_MINE_SCORE）
}
```

**扩展后的既有对象**

```typescript
interface InitEvent {
  sessionId: string;
  user: {
    username: string;
    displayName: string;
    score: number;
    nfMode: boolean;        // 新增：当前用户是否处于 NF 模式
    nfSettled: number;      // 新增：累计 NF 结算的雷数量
  };
  revealed: RevealedCell[];
  flagged: Array<{ col: number; row: number }>;
  settled: SettledMine[];   // 新增：已结算雷坐标列表，供首屏还原 NF 标记
}

interface Ranking {
  username: string;
  displayName: string;
  score: number;
  isCurrentPlayer: boolean;
  nfMode: boolean;          // 新增：该玩家是否处于 NF 模式（前端显示 NF 徽标）
  nfSettled: number;        // 新增：该玩家累计 NF 结算雷数
}
```

## 5. 结算计分规则（服务端权威）

NF 模式下，每次 `reveal` 翻开**数字**格子后，服务端对其 8 邻域执行结算：

1. 收集 8 邻域中「未结算的雷」（`isMine && !settled`）作为种子。
2. 对每个种子雷，用 **8 连通** BFS 收集连续雷簇 `cluster`。
3. 可结算判定：簇中**每一个雷**的 8 邻域内所有**非雷格子**都必须「已翻开」（`revealed`）。存在任一未翻开的非雷邻格 → 不可结算，跳过。
4. 可结算则：将该簇全部雷标记 `settled`，计分 `cluster.length × 10`（`NF_PER_MINE_SCORE = 10`），累计 `nfSettled += cluster.length`，广播 `nfSettled` + `scoreUpdate` + `leaderboard`。

**边界处理**：
- 棋盘越界视为无格子（等价已翻开），不阻塞结算。
- 已结算雷（`settled`）不重复计分。
- 踩到雷仍按现有 `-100` 规则扣分，与 NF 结算互不影响。
- NF 结算仅影响开启者自身计分，不改变共享棋盘状态。

## 6. 计分规则汇总

| Action | Score Change | 适用 |
|--------|-------------|------|
| 翻开数字触发 NF 结算（每结算一雷） | +10 | 仅 NF 模式 |
| reveal 踩雷 | -100 | 经典 + NF |
| flag 正确标记雷 | +10 | 仅经典（NF 下禁用） |
| flag 错误标记非雷 | -20 | 仅经典（NF 下禁用） |
| chord 触发踩雷 | -100 | 仅经典（NF 下禁用） |

## 7. 兼容性与演进

- 所有新增均为**新增字段或新增事件**，旧客户端可忽略未知字段/事件，不破坏现有行为。
- `nfMode`/`nfSettled`/`settled` 字段在旧 `init`/`leaderboard` 中可缺省（`undefined` 视作 `nfMode=false`、`nfSettled=0`、无已结算雷）。
- 经典模式下 `reveal` 不触发 NF 结算，行为与现状一致。
