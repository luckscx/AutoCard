# AutoCard

异步 PvP Roguelike 卡牌自走棋游戏。

## 游戏简介

玩家每天经历 6 个小时：前几小时在集市购买/升级物品，第 3 小时挑战 PvE 野怪，第 6 小时触发 PvP 镜像对战。目标是在声望（起始 20）归零前累计 10 场 PvP 胜利。

**核心玩法**：卡牌以「端口」为单位组合联动 —— 找到核心输出牌，用高频触发的运转牌为它服务，打出 1+1>2 的爆发效果。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | PixiJS v8 + TypeScript + Vite |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | MongoDB / Mongoose |
| 共享类型 | `@autocard/shared`（monorepo workspace） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 :5173 + 后端 :3000）
npm run dev
```

> MongoDB 需在本地运行（默认 `mongodb://localhost:27017/autocard`）

## 项目结构

```
AutoCard/
├── shared/    # 共享类型与常量（@autocard/shared）
├── server/    # Express 后端
├── client/    # PixiJS 前端
└── docs/      # 设计文档
```

## 文档

- [游戏机制](docs/game-design/Meta构筑.md)
- [战斗逻辑](docs/game-design/战斗逻辑.md)
- [UI 结构](docs/frontend/UI结构.md)
- [开发路线图](docs/architecture/开发路线图.md)
