# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoCard is an asynchronous PvP roguelike deck-building auto-battler game. Frontend uses Pixi.js (WebGL 2D) + TypeScript + Vite. Backend uses Node.js + Express + TypeScript + MongoDB/Mongoose. Documentation and comments are in Chinese.

## Build & Development Commands

```bash
npm install                 # Install all workspaces
npm run dev                 # Start server + client concurrently
npm run dev:server          # Server only (tsx watch, port 3000)
npm run dev:client          # Client only (Vite, port 5173, proxies /api to :3000)
npm run build:shared        # Compile shared types (must run after changing shared/)
npm run build               # Full production build: shared → server → client
```

MongoDB must be running locally (default: `mongodb://localhost:27017/autocard`). Server env configured in `server/.env`.

**No test framework or linter is currently configured.**

## Monorepo Structure

Three npm workspaces: `shared/`, `server/`, `client/`. All use ESM (`"type": "module"`) and TypeScript strict mode. TypeScript base config in `tsconfig.base.json` (ES2022, moduleResolution: bundler).

- **shared/** — Types (`types/game.ts`, `types/config.ts`, `types/api.ts`) and constants (`constants.ts`). Imported as `@autocard/shared`. Must run `npm run build:shared` after changes.
- **server/** — Express backend. Entry: `src/index.ts`.
  - `models/` — Mongoose schemas (User, Run, PvpMirror)
  - `api/` — Route handlers (`run.ts` for game endpoints, `config.ts` for static data)
  - `services/RunService.ts` — Core game logic orchestrator (state transitions, battles, purchases, leveling)
  - `game/battle/engine.ts` — Deterministic tick-based battle simulation
  - `game/battle/resolveTarget.ts` — Target rule resolution (adjacency, position)
  - `game/config/` — Static game data: heroes, items, bazaar_items, monsters, events
- **client/** — Pixi.js frontend. Entry: `src/main.ts`.
  - `core/GameState.ts` — Singleton game state store; all UI reads from here
  - `core/SceneManager.ts` — Scene lifecycle (register → goto → cleanup)
  - `scenes/` — LobbyScene, MainScene, ShopScene, BattleScene
  - `ui/` — Reusable components (CardView, BoardRow, SlotGrid, Button, Panel)
  - `api/client.ts` — Fetch wrapper with auth headers

## Architecture

**API Contract Pattern**: All request/response types defined in `shared/src/types/api.ts`. Both server and client import from `@autocard/shared`.

**Scene-Based UI**: Each scene extends Pixi `Container` with `onEnter(data?)` / `onExit()` lifecycle. SceneManager handles transitions: `sm.goto('battle', { opponent, battleId })`.

**Centralized Game State**: `gameState` singleton holds current run + config. Updated from API responses.

**Battle Engine**: Pure function — same input always produces same output. Tick-based simulation (100ms ticks, max 40s). Logs events array for client replay animation. Overtime damage after 20s.

**Port-Based Card System**: Cards defined by ports (output/operational/defense), each with category, type, value, and target rules (self, adjacent, leftmost, rightmost, all, position). Composite effects enable card chaining.

**Game Loop**: 6 hours per day. Hours 1,2,4,5 = choices (shop/event/gift). Hour 3 = PvE battle. Hour 6 = PvP mirror match. Win condition: 10 PvP wins before prestige (starts at 20) reaches 0.

## Code Conventions

- ESM imports require `.js` extension in relative paths (e.g., `import { ... } from '../models/User.js'`)
- Cross-workspace imports use `@autocard/shared`
- Naming: `*Scene.ts` for scenes, `*View.ts` for UI components, `*Service.ts` for services
- All game constants in `shared/src/constants.ts` (XP_PER_LEVEL, BOARD_SIZE, TIER_MULTIPLIER, etc.)
- API errors thrown as exceptions, caught by `wrap()` middleware → `{ error: message }`
- Mongoose timestamps (createdAt, updatedAt) auto-managed; composite index on `(userId, status)`

## Additional Documentation

- `Core.md` — Game design keywords and core mechanics (Chinese)
- `docs/战斗逻辑.md` — Battle system detailed design
- `docs/核心编码框架设计.md` — Architecture and design patterns
- `docs/开发文档.md` — Development guide
- `docs/Meta构筑.md` — Meta build strategies
