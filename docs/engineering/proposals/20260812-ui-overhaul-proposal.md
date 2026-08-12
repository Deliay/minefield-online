---
description: 界面优化（扫雷主题重设计）技术提案 - 定义基于 React/Konva 的全站视觉重设计方案、设计令牌与组件改造路径
type: Permanent
---

# 界面优化：扫雷主题网站整体重设计 - 技术提案

本文档定义「扫雷」主题界面重设计的技术方案：设计系统令牌、Konva 格子/图标渲染方案、HUD/排行榜/登录页改造路径与测试策略，作为开发实现的依据。本次为纯前端改造，后端与 WebSocket 契约零改动。

## 1. 概述

### 1.1 背景

现有网站功能完整（联机计分、用户登录、排行榜、小地图导航）但视觉为通用暗色风格，与「扫雷」主题割裂：格子扁平、游戏元素使用 emoji、控件为浏览器默认样式、无品牌图标。需以「扫雷」为主题进行整体视觉重设计，建立统一设计系统。

### 1.2 目标

- 建立扫雷主题设计系统（色板/字体/间距/阴影/动效），全站统一引用
- 重绘游戏格子为经典 3D 凸起/凹陷立体效果，地雷/旗帜改为矢量图标
- 重设计 HUD（LED 计分）、排行榜、登录页、站点品牌信息
- 纯前端改造，不改变交互行为与数据协议

### 1.3 范围

**做**: 设计系统令牌、游戏格子/图标重绘、HUD/排行榜/登录页重设计、favicon 与站点标题、组件测试更新
**不做**: 后端改动、契约改动、引入新依赖/UI 库、改变游戏交互逻辑与数据结构

## 2. 技术架构

### 2.1 系统架构图

```mermaid
graph LR
    A[theme.ts<br/>设计令牌] --> B[App.tsx 布局整合]
    A --> C[Cell.tsx<br/>3D 格子/图标]
    A --> D[ScoreHud.tsx<br/>LED 计分器]
    A --> E[Leaderboard.tsx<br/>街机风面板]
    A --> F[Login.tsx<br/>主题登录页]
    A --> G[index.css<br/>全局变量]
    C --> H[Konva Stage 渲染]
    B --> H
```

本次改造全部位于 `apps/game-web`，前后端边界不变：`socketService`、`authApi` 的接口与数据结构不变。

### 2.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | React 19 + Vite + TypeScript | 现有技术栈 |
| 画布 | react-konva 19 / Konva 10 | 现有棋盘渲染 |
| 样式 | CSS 变量 + 内联样式（设计令牌双通道） | 现有内联样式为主，新增全局 CSS 变量层 |
| 图标 | Konva Path（SVG path data） | 替代 emoji，跨平台一致 |
| 字体 | 系统等宽字体栈 + LED 文字效果（text-shadow 实现） | 不引入外部字体资源，避免加载开销 |

### 2.3 设计令牌双通道

Konva（Canvas）无法读取 CSS 变量，因此设计令牌同时以 **TypeScript 常量**（供 Konva fill/stroke 与内联样式）与 **CSS 变量**（供 DOM 元素/全局基调）两种形态暴露，二者来源单一（`src/theme.ts`），避免色值漂移。

## 3. 设计方案

### 3.1 设计令牌（theme.ts）

**风格基调**: 「复古扫雷 × 现代暗色」

| 令牌 | 值 | 用途 |
|------|-----|------|
| `bg.deep` | `#0b0f14` | 全站主背景（深蓝黑） |
| `bg.panel` | `#161d27` | 面板/卡片底色 |
| `bg.panelAlt` | `#1d2633` | 次级面板/表头 |
| `cell.raised` | `#8a94a0` | 未揭开格子主面色（经典银灰） |
| `cell.raisedHi` | `#c6cdd6` | 凸起高光 |
| `cell.raisedLo` | `#5b6470` | 凸起投影 |
| `cell.sunken` | `#232c39` | 已揭开格子底色 |
| `cell.sunkenLo` | `#12161d` | 凹陷投影 |
| `accent.danger` | `#e23b3b` | 雷区红（地雷/危险） |
| `accent.ok` | `#4ade80` | 科技绿（分数/当前玩家） |
| `accent.info` | `#4a9eff` | 信息蓝（链接/提示） |
| `number.1..8` | 经典色板 | 数字 1-8（蓝/绿/红/深蓝/深红/青/黑/灰） |
| `text.primary` | `#e6ecf2` | 主文字 |
| `text.muted` | `#8b97a5` | 次级文字 |
| `font.mono` | `'Courier New', ui-monospace, monospace` | 等宽数字/正文 |
| `radius` | 4/8/10px | 圆角阶梯 |
| `shadow.panel` | 0 4px 16px rgba(0,0,0,.45) | 面板阴影 |
| `motion.fast` | 120ms | 悬停/按压反馈 |
| `motion.normal` | 300ms | 面板显隐 |

### 3.2 游戏格子视觉方案（Cell.tsx）

经典扫雷 3D 立体效果通过**多层 Konva 形状叠加**模拟 bevel（不引入图片资源）：

- **未揭开格子**: 主 `Rect`（`cell.raised`）+ 左上两条高光 `Line`（`cell.raisedHi`，宽 2-3px）+ 右下两条投影 `Line`（`cell.raisedLo`），形成凸起立体感
- **已揭开格子**: 主 `Rect`（`cell.sunken`）+ 内缩高光/投影反转，形成凹陷效果
- **指针高亮** `PointerRect`: 改用主题强调色描边 + 半透明填充，保持醒目但不干扰格子内容
- **网格线** `GridLine`: 颜色收敛到主题令牌，弱化可见性（低于格子 bevel 对比度）

### 3.3 游戏元素图标（Konva Path）

emoji（🚩）在跨平台渲染不一致，改用 `Konva.Path` 绘制矢量图标：

| 元素 | 方案 | 样式 |
|------|------|------|
| 地雷 | SVG path（圆形雷体 + 顶部引信 + 四向触角） | `accent.danger` 红系 + 深色描边 |
| 旗帜 | SVG path（三角旗面 + 旗杆） | 红/深红旗面 + 银灰旗杆 |
| 数字 1-8 | `Text` + 经典色板 | 粗体、与 bevel 高对比 |

图标以 `Konva.Path` 配合 `cache()` 绘制，保持现有渲染性能特征（仅渲染已操作格子）。

### 3.4 HUD 与 LED 计分器（ScoreHud.tsx 新增）

- 顶部信息栏抽取为 `ScoreHud` 组件，整合：玩家显示名/用户名、LED 分数、改名表单、登出按钮
- **LED 计数效果**: 分数文本使用等宽字体 + 深色衬底 + `text-shadow` 绿色辉光，模拟经典扫雷 LED 数码管；分数变化时叠加一次短促缩放/辉光脉冲动效（`Konva`/CSS transition）
- 布局收敛到统一面板（`bg.panel` + `shadow.panel`），替换当前 `rgba(0,0,0,0.8)` 内联面板

### 3.5 排行榜重设计（Leaderboard.tsx）

- 面板改为街机风：深色面板 + 顶部主题标题条 + 排名徽章（`#1/#2/#3` 角标）
- 当前玩家行使用 `accent.ok` 高亮与徽章，显示名/分数高对比排版
- 数据结构（Ranking[]）与事件订阅逻辑不变

### 3.6 登录/注册页重设计（Login.tsx）

- 背景改为棋盘格纹理（CSS 线性渐变叠加生成，无需图片资源）+ 品牌标题与地雷/旗帜装饰
- 输入框/按钮/错误提示样式全部收敛到设计令牌，替换当前内联硬编码色值
- 互踢提示浮层（App.tsx 内 `kickNotice`）样式同步主题化
- 校验逻辑（密码一致性、长度限制、错误提示文案）零改动

### 3.7 品牌与站点信息

- 新增 `public/mine.svg`（地雷主题图标），替换 `index.html` 中 favicon 引用
- `index.html`: `<title>` 改为「MINE FIELD - 联机扫雷」，增加 `<meta name="description">`
- 删除/替换 `public/favicon.svg`（当前为默认占位图标）与 `public/icons.svg`（如无用）

## 4. 文件变更清单

| 文件 | 变更 | 说明 |
|------|------|------|
| `src/theme.ts` | 新增 | 设计令牌单一来源 |
| `src/components/Cell.tsx` | 改造 | bevel 格子 + Konva Path 地雷/旗帜图标 + 主题色板 |
| `src/components/ScoreHud.tsx` | 新增 | LED 计分 + 玩家信息 + 改名/登出入口 |
| `src/components/Leaderboard.tsx` | 改造 | 街机风面板样式（结构不变） |
| `src/pages/Login.tsx` | 改造 | 主题品牌页样式（逻辑不变） |
| `src/App.tsx` | 改造 | 接入 ScoreHud、互踢浮层主题化、布局整合 |
| `src/index.css` | 改造 | 全局 CSS 变量、字体、背景基调 |
| `index.html` | 改造 | 标题/meta/favicon 引用 |
| `public/mine.svg` | 新增 | 地雷主题 favicon |
| `src/components/Leaderboard.test.tsx`、`src/pages/Login.test.tsx` | 同步更新 | 适配样式结构调整（如有断言变化） |

## 5. 关键实现点

### 5.1 bevel 格子渲染性能

- 立体效果全部由 Konva 基础形状（Rect/Line）叠加，配合现有 `cache()` 与 `perfectDrawEnabled=false`
- 维持「仅渲染已操作格子」策略，不因视觉重设计全量渲染 1200×640 网格
- 图标 `Konva.Path` 静态化后缓存，避免每帧重绘

### 5.2 地雷/旗帜 SVG path

- 在 `theme.ts`（或独立 `assets.ts`）集中维护 path data 常量，组件引用，保证一致性
- 图标尺寸随 `cellSize` 缩放，保持垂直水平居中

### 5.3 LED 计数

- 采用等宽字体 + text-shadow 辉光实现，避免引入字体资源与自定义组件库
- 分数变更动效在交互热路径之外（分数浮层/计分器微动效），不阻塞渲染

### 5.4 主题一致性

- 所有新增/改造样式一律从 `theme.ts` 取令牌，禁止散落硬编码色值
- 建立快速自查：全站 grep 无游离 `#` 色值（theme.ts 与 index.css 除外）

## 6. 技术决策

### 6.1 决策列表

| 决策 | 选项 A | 选项 B | 最终选择 | 原因 |
|------|--------|--------|---------|------|
| 图标实现 | Konva.Path 矢量绘制 | 保留 emoji | Konva.Path | 跨平台渲染一致、风格统一、可主题化 |
| 3D 格子实现 | 多层形状叠加 bevel | 外部图片/雪碧 | 形状叠加 | 零资源加载、随 cellSize 自适应、沿用现有渲染模型 |
| 样式体系 | TS 令牌双通道（CSS 变量 + 常量） | 仅 CSS 变量 | 双通道 | Konva 不读 CSS 变量，需 TS 常量；CSS 变量服务 DOM，来源单一 |
| 字体方案 | 外部 Web 字体 | 系统等宽栈 + 辉光 | 系统栈 + 辉光 | 零加载开销，LED 效果由 text-shadow 模拟 |
| 改造范围 | 全站重设计 | 仅棋盘 | 全站 | 需求要求网站整体重设计，且一致性要求全站收敛 |

### 6.2 依赖与约束

| 类型 | 内容 | 说明 |
|------|------|------|
| 依赖 | 无新增 npm 依赖 | 图标/主题/动效全部自研 |
| 约束 | 后端与契约零改动 | 不触碰 servers/game-api 与 contracts/ |
| 约束 | 交互逻辑零改动 | reveal/flag/chord、改名、登出、互踢、小地图行为不变 |
| 约束 | 测试必须保持通过 | 组件测试 >= 70%，E2E 游戏流程回归通过 |

## 7. 测试策略

### 7.1 测试覆盖要求

- 前端组件测试覆盖率保持 >= 70%（现有要求）
- 现有 `Leaderboard.test.tsx`、`Login.test.tsx`、`socket.test.ts` 需继续通过

### 7.2 测试类型

| 类型 | 工具 | 覆盖范围 |
|------|------|---------|
| 组件测试 | Vitest + Testing Library | 改造后 Login（渲染/校验文案）、Leaderboard（标题/玩家展示）渲染正确；ScoreHud 展示玩家信息与分数 |
| 单元测试 | Vitest | 主题令牌存在性与 key 完整性（可选） |
| E2E 回归 | Playwright | reveal/flag/drag、登录、改名、互踢全流程不受视觉改造影响 |

### 7.3 手工验收重点

- 各主流浏览器下地雷/旗帜图标渲染一致（无 emoji 差异）
- 大棋盘拖动/快速标雷帧率不劣化
- 小屏窗口下 HUD/排行榜/小地图无遮挡

## 8. 验收标准

- [ ] 技术方案评审通过
- [ ] 设计系统令牌建立，全站样式统一收敛（无游离硬编码色值）
- [ ] 游戏格子 3D 立体效果、地雷/旗帜矢量图标、数字经典色板落地
- [ ] HUD（LED 计分）、排行榜、登录页、互踢浮层重设计完成
- [ ] favicon 与站点标题/描述更新
- [ ] 组件测试通过且覆盖率 >= 70%
- [ ] E2E 回归通过，交互行为与改造前一致

## 相关文档

- [[../../product/draft/02-界面优化]] - 产品需求文档
- [[20260421-online-scoring-board-proposal]] - 联机计分Board技术提案
- [[20260810-user-login-proposal]] - 用户登录技术提案
- [[../../product/draft/01-用户登录]] - 用户登录与账号体系 PRD
