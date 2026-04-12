# CLAUDE.md

AutoCard 项目的 Claude Code 主指引。

## 项目概述

AutoCard 是一款异步 PvP Roguelike 卡牌自走棋游戏。玩家每天经历 6 个小时：前几小时选择购物/事件/礼物，第 3 小时 PvE 野怪，第 6 小时 PvP 镜像对战。目标：在声望（起始 20）归零前累计 10 场 PvP 胜利。

**技术栈**：前端 Pixi.js + TypeScript + Vite；后端 Node.js + Express + TypeScript + MongoDB/Mongoose。文档和注释使用中文。

## 开发命令

```bash
npm install                 # 安装所有 workspace 依赖
npm run dev                 # 同时启动 server + client
npm run dev:server          # 仅服务端 (tsx watch, port 3000)
npm run dev:client          # 仅客户端 (Vite, port 5173, 代理 /api → :3000)
npm run build:shared        # 编译共享类型（修改 shared/ 后必须执行）
npm run build               # 完整生产构建: shared → server → client
```

MongoDB 须在本地运行（默认 `mongodb://localhost:27017/autocard`）。服务端环境变量配置在 `server/.env`。

## Monorepo 结构

三个 npm workspace：`shared/`、`server/`、`client/`。全部使用 ESM（`"type": "module"`）+ TypeScript strict 模式。

- **shared/** — 类型定义与常量，以 `@autocard/shared` 导入。修改后需 `npm run build:shared`
- **server/** — Express 后端
- **client/** — Pixi.js 前端

## 核心架构

- **API Contract**：所有请求/响应类型定义在 `shared/src/types/api.ts`，前后端共用
- **战斗引擎**：纯函数，确定性 tick 模拟（100ms/tick，最长 40s），输出事件流 + 快照供前端回放
- **端口卡牌系统**：卡牌由端口（伤害/毒/灼烧/治疗/护盾/加速/充能…）定义，支持组合连锁效果

## Subagent 工作划分

**遇到以下任务，直接路由给对应 subagent，不要自己动手：**

| 任务类型 | Subagent |
|---------|---------|
| 前端场景、UI 组件、布局、动画、交互 | `pixi-ui` |
| Express 路由、RunService 业务逻辑、Mongoose 模型、API 契约 | `api-service` |
| 卡牌/英雄/怪物/事件/集市物品等游戏配置数据 | `game-config` |
| 战斗引擎逻辑、tick 模拟、效果处理、目标解析 | `battle-engine` |

## 代码约定

- 相对路径 ESM 导入须带 `.js` 后缀（如 `from '../models/User.js'`）
- 跨 workspace 用 `@autocard/shared`
- 命名：`*Scene.ts` / `*View.ts` / `*Service.ts`
- 所有游戏常量集中在 `shared/src/constants.ts`
- API 错误统一抛异常，由 `wrap()` 中间件捕获 → `{ error: message }`

## 补充文档

所有文档统一在 `docs/` 目录：

- `docs/Meta构筑.md` — 游戏核心机制、端口体系、Meta 构筑策略
- `docs/战斗逻辑.md` — 战斗系统详细设计
- `docs/核心编码框架设计.md` — 架构与设计模式
- `docs/开发文档.md` — 开发指南
- `docs/开发路线图.md` — 当前进度与待办项
- `docs/前端UI结构.md` — 前端组件库、场景布局、状态管理
- `docs/前端布局图示.md` — 前端 ASCII 布局图、坐标速查
- `docs/前端代码示例.md` — 前端常用代码片段（18个示例）
- `docs/autocard_bazaar_report.md` — 大巴扎 991 张卡牌统计分析
- `docs/autocard_code_reference.md` — 关键文件完整源码快照
