---
description: NF 模式与 NF 结算计分 - 基于 PRD、技术提案与 API 契约的任务分解、阶段计划与验收映射
type: Plan
---

# NF 模式与 NF 结算计分 - 实现方案

**版本**: v1.0
**创建日期**: 2026-08-22
**需求总分支**: `feat/nf-mode-scoring`

## 1. 概述

### 1.1 依据文档

| 文档 | 路径 |
|------|------|
| 产品需求文档（PRD v1.0） | [docs/product/draft/05-NF模式与NF结算计分.md](../../product/draft/05-NF模式与NF结算计分.md) |
| 技术提案 | [docs/engineering/proposals/20260822-nf-mode-scoring-proposal.md](../proposals/20260822-nf-mode-scoring-proposal.md) |
| API 契约 | [contracts/nf-mode.md](../../../contracts/nf-mode.md) |

### 1.2 目标

实现 **NF 模式（No Flag）** 与 NF 结算计分：

- 后端新增 `NFSettler` 结算算法（8 连通连续雷簇 + 8 面全翻开判定）与计分、NF 模式会话状态、排行榜 NF 标识、`setNfMode`/`nfSettled` 事件
- 前端新增 NF 模式开关、NF 模式下禁用 flag、已结算雷的 NF 标记渲染、排行榜 NF 徽标
- 经典模式（flag）计分与行为保持不变，全程向后兼容

### 1.3 范围

- **做**: NF 模式开关、NFSettler 结算算法、NF 计分、排行榜 NF 标识、NF 结算棋盘渲染标记
- **不做**: 经典模式 flag 逻辑变更、共享棋盘生成规则变更、新增 REST 端点、新重型依赖、后端其他玩法改造

### 1.4 工程约束

- TDD 优先：先写测试再实现
- 分支命名 `feature/<feature-name>`，提交规范 `type(scope): message`
- 覆盖率：后端 >= 80%（common-rules），NFSettler 纯函数 >= 90%（提案），前端组件 >= 70%
- 后端：Node + Express + Socket.IO + TypeScript（tsx 运行）；前端：React 18 + Vite + TypeScript + react-konva
- NF 为**会话级状态**，不新增 REST 端点；仅扩展/新增 WebSocket 字段与事件，保持向后兼容

## 2. 实施总览

```mermaid
graph LR
    S1[阶段1: 后端 NFSettler 结算算法 TDD] --> S2[阶段2: 后端 minefield/session/index 事件与计分]
    S2 --> S3[阶段3: 前端 socket 类型与 NF 交互/渲染]
    S3 --> S4[阶段4: 测试与验证]
```

- 阶段 1 为纯函数，可独立 TDD，先行完成
- 阶段 2 依赖阶段 1 的 NFSettler
- 阶段 3 依赖阶段 2 的事件与契约
- 阶段 4 为集成测试与验收

## 3. 阶段任务分解

### 阶段 1: 后端 NFSettler 结算算法（TDD）

| # | 任务 | 产出 | 涉及模块 |
|---|------|------|----------|
| 1.1 | 新增 `servers/game-api/src/nfSettler.ts`：常量 `NF_PER_MINE_SCORE = 10`；`collectMineCluster`（8 连通 BFS 收集连续雷簇）、`neighbors8`、`findSettleableCluster(board, revealed, settled, seedCol, seedRow)` 纯函数 | `nfSettler.ts` | backend |
| 1.2 | 判定规则实现：簇中每一个雷的 8 邻域内所有**非雷格子**都必须「已翻开」，存在任一未翻开非雷邻格 → 返回 `null`；越界视为无格子（不阻塞） | `nfSettler.ts` | backend |
| 1.3 | 新增 `servers/game-api/src/__tests__/nfSettler.test.ts`：单雷 8 面全翻开可结算、双雷簇全翻开可结算、存在未翻开非雷邻格不可结算、簇触及棋盘边缘可结算、已结算不重复 | `__tests__/nfSettler.test.ts` | tests |

**验收**: NFSettler 单测全绿，覆盖率 >= 90%。

### 阶段 2: 后端 minefield / session / index 事件与计分

| # | 任务 | 产出 | 涉及模块 |
|---|------|------|----------|
| 2.1 | `minefield.ts` 新增 `settled: Set<number>`（键 `col * ROWS + row`，与 revealed/flagged 一致），提供 `isSettled`/`markSettled`/`getAllSettled`，`reset()` 一并清空 | `minefield.ts` 修改 | backend |
| 2.2 | `session.ts`：`Session` 增加 `nfMode`/`nfSettled`，`createSession` 初始化 `nfMode:false`、`nfSettled:0`；`Ranking` 增加 `nfMode`/`nfSettled`；`getLeaderboard` 透出两字段 | `session.ts` 修改 | backend |
| 2.3 | `index.ts`：`init` 载荷 `user` 增加 `nfMode`/`nfSettled`，顶层增加 `settled: minefield.getAllSettled()` | `index.ts` 修改 | backend |
| 2.4 | `index.ts` 新增 `setNfMode`（C→S）：更新 `session.nfMode`，`socket.emit('nfModeUpdated', { nfMode })`，广播 leaderboard | `index.ts` 修改 | backend |
| 2.5 | `index.ts` `reveal` 增加 NF 分支：NF 模式下翻开**数字**格子后调用 NFSettler 结算 8 邻域；可结算则 `markSettled` 簇、`session.nfSettled += cluster.length`、`updateScore(socket.id, delta)`、`socket.emit('nfSettled', { col, row, mines, delta })`、广播 leaderboard + scoreUpdate | `index.ts` 修改 | backend |
| 2.6 | `index.ts` `flag` 增加 NF 分支：`session.nfMode === true` 时直接忽略（返回空 `cellFlagged: { isFlagged:false }`，不插旗、不计分） | `index.ts` 修改 | backend |
| 2.7 | `index.ts` `chord` 增加 NF 分支：NF 模式下禁用，返回空 `cellRevealed: { cells: [] }` | `index.ts` 修改 | backend |
| 2.8 | 新增/扩展后端事件测试：setNfMode 状态、NF 下 reveal 结算与计分、NF 下 flag 忽略、NF 下 chord 禁用、经典模式行为不变 | `src/__tests__/` 扩展 + `tests/api/` | tests |

**验收**: NF 结算正确计分（+10/雷）、flag/chord 在 NF 下禁用、经典模式无回归、事件向后兼容。

### 阶段 3: 前端 socket 类型与 NF 交互/渲染

| # | 任务 | 产出 | 涉及模块 |
|---|------|------|----------|
| 3.1 | `services/socket.ts`：扩展 `User`/`Ranking`/`InitEvent` 增加 `nfMode`/`nfSettled`/`settled`；新增 `NfModeUpdatedEvent`、`NfSettledEvent`/`SettledMine` 类型；新增 `setNfMode(enabled)`、`onNfModeUpdated`、`onNfSettled` 监听 | `socket.ts` 修改 | frontend |
| 3.2 | 新增 `components/NfModeToggle.tsx`（含 `.module.css`）：NF 开关控件，调用 `setNfMode`，同步开关状态 | `NfModeToggle.tsx` 新增 | frontend |
| 3.3 | `App.tsx`：新增 `nfMode`/`settledCells` state；`onNfModeUpdated` 更新开关；`onNfSettled` 将结算雷写入 `settledCells` 渲染 NF 标记；NF 下隐藏/禁用 flag 入口与 flag 调用 | `App.tsx` 修改 | frontend |
| 3.4 | `Cell.tsx`：新增 `nf` 类型（或 `nfSettled` 属性）渲染已结算雷的特殊样式（区别于 flag） | `Cell.tsx` 修改 | frontend |
| 3.5 | `LeaderboardPanel.tsx`：透传 `nfMode` 到 `RankingCard` | `LeaderboardPanel.tsx` 修改 | frontend |
| 3.6 | `RankingCard.tsx`：`ranking.nfMode === true` 时展示「NF」徽标（含样式） | `RankingCard.tsx` 修改 | frontend |
| 3.7 | 编写前端组件测试：NfModeToggle 开关、NF 下 flag 禁用、RankingCard NF 徽标、Cell NF 标记 | `*.test.tsx` 新增/扩展 | tests |

**验收**: NF 开关可切换；NF 下 flag 入口禁用；结算雷带 NF 标记；排行榜显示 NF 徽标；组件覆盖率 >= 70%。

### 阶段 4: 测试与验证

| # | 任务 | 产出 | 涉及模块 |
|---|------|------|----------|
| 4.1 | 后端 `nfSettler` 覆盖率 >= 90%、`minefield`/`session`/`index` 事件覆盖验证（Vitest） | `servers/game-api` 单测 | tests |
| 4.2 | API 集成测试：开启 NF → reveal 数字 → 结算计分 → leaderboard 含 nfMode/nfSettled；经典模式回归 | `tests/api/` | tests |
| 4.3 | 前端组件测试覆盖率 >= 70%（Vitest + Testing Library） | `apps/game-web` 单测 | tests |
| 4.4 | E2E（Playwright）：开启 NF → 翻开数字 → 结算 → 看排行榜 NF 标识；经典流程不回归 | `tests/e2e/` | tests |
| 4.5 | 按各 AGENTS.md 验证：`npm run build` 通过、`npm run dev` 冒烟、无 ESLint 错误、覆盖率达标 | - | - |

**验收**: 全量测试通过、覆盖率达标、经典模式无回归。

## 4. 项目结构变更

```
servers/game-api/src/
├── nfSettler.ts                    # 新增：NF 结算算法（纯函数）
├── minefield.ts                    # 修改：settled 状态
├── session.ts                      # 修改：nfMode / nfSettled
├── index.ts                        # 修改：setNfMode / nfSettled / reveal/flag/chord NF 分支
└── __tests__/
    └── nfSettler.test.ts           # 新增

apps/game-web/src/
├── services/socket.ts              # 修改：类型与事件
├── App.tsx                         # 修改：NF 开关 + 结算标记 + 禁用 flag
├── components/
│   ├── NfModeToggle.tsx            # 新增
│   ├── NfModeToggle.module.css     # 新增
│   ├── Cell.tsx                    # 修改：NF 标记渲染
│   ├── LeaderboardPanel.tsx        # 修改：透传 nfMode
│   └── RankingCard.tsx             # 修改：NF 徽标
```

## 5. TDD 测试计划

### 5.1 测试类型与覆盖

| 类型 | 工具 | 覆盖范围 |
|------|------|---------|
| 后端纯函数单测 | Vitest | NFSettler 结算判定、边缘、防重复（>= 90%） |
| 后端事件测试 | Vitest + Socket.IO | setNfMode、NF 下 reveal 结算计分、flag/chord 禁用、经典回归 |
| 前端组件测试 | Vitest + Testing Library | NfModeToggle、flag 禁用、Cell NF 标记、RankingCard 徽标（>= 70%） |
| API 集成测试 | Vitest + socket.io-client | NF 结算计分链路、排行榜字段、经典回归 |
| E2E | Playwright | 开启 NF → 翻开 → 结算 → 排行榜标识 |

### 5.2 关键用例

- 单雷 8 面全翻开 → 可结算（size=1，+10）
- 两个相邻雷、簇周围全翻开 → 可结算（size=2，+20）
- 某雷 8 面存在未翻开非雷格 → 不可结算，不重复计分
- 簇边缘触及棋盘边界 → 视为已翻开，可结算
- 已结算雷再次触发 → 不重复计分，NF 标记保持
- NF 模式下 flag 事件被忽略、chord 禁用返回空
- 经典模式 reveal/flag/chord 与计分行为不变

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 8 连通 BFS 边界判断出错 | 结算误判/漏判 | 纯函数先行 + 单元测试覆盖边界 |
| NF 下 reveal 结算影响共享棋盘 | 多人在线状态错乱 | 结算仅写 `settled` 与开启者计分，不改棋盘生成/翻开 |
| 事件向后兼容破坏 | 旧客户端异常 | 全新增字段/事件，旧客户端可忽略 |
| 前端 state 增多导致重渲染 | 性能退化 | NF 标记/开关与现有结算 state 合并维护，聚焦差分更新 |
| 覆盖率不达标 | 质量风险 | TDD 先写测试，NFSettler 单独测到 >= 90% |

## 7. 验收清单

- [ ] 技术方案评审通过
- [ ] NF 开关可开启/关闭，开启后 flag 入口禁用、chord 禁用
- [ ] 翻开数字时，连续且 8 面无未翻开格子的雷被结算，按雷数 +10/雷计分
- [ ] 某雷 8 面仍有未翻开格子时不计分
- [ ] 已结算雷不重复计分，并带 NF 标记
- [ ] 积分榜对 NF 用户显示「NF」徽标
- [ ] NF 模式下踩到雷仍按现有 -100 规则扣分
- [ ] 经典模式 flag 玩法与计分保持不变
- [ ] 后端 NFSettler 覆盖率 >= 90%，前端组件覆盖率 >= 70%
- [ ] 事件向后兼容（新增字段/事件不破坏旧客户端）

## 相关文档

- [API 契约: NF 模式与 NF 结算计分](../../../contracts/nf-mode.md)
- [技术提案: NF 模式与 NF 结算计分](../proposals/20260822-nf-mode-scoring-proposal.md)
- [产品需求文档: NF模式与NF结算计分](../../product/draft/05-NF模式与NF结算计分.md)
- [后端工程规范](../backend-rules.md)
- [前端工程规范](../frontend-rules.md)