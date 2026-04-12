# AutoCard Frontend - Complete Component Inventory

**Last Updated:** 2026-04-12  
**Scope:** Comprehensive list of all UI components, their locations, and usage patterns

---

## Component Directory

### Core System Files

| File | Purpose | Key Exports | Location |
|------|---------|-------------|----------|
| `main.ts` | Application bootstrap | `boot()` | `client/src/` |
| `core/GameState.ts` | Global state store | `gameState` (singleton) | `client/src/core/` |
| `core/SceneManager.ts` | Scene lifecycle management | `SceneManager`, `Scene` | `client/src/core/` |
| `api/client.ts` | Server communication | `api` (endpoint bundle) | `client/src/api/` |

---

### Layout System

| File | Purpose | Key Constants | Location |
|------|---------|-----------------|----------|
| `ui/layout.ts` | Dimension definitions | `W`, `H`, `Z1_Y` through `Z4_Y`, `CARD_UNIT`, `CARD_GAP`, `CARD_H`, colors | `client/src/ui/` |

**Key Functions:**
- `cardWidth(size: 1|2|3): number` - Calculates card width for multi-slot cards
- `tierHex(tier: string): string` - Converts tier name to CSS color

---

### UI Components - Basic Elements

| Component | File | Purpose | Extends | Location |
|-----------|------|---------|---------|----------|
| `Panel` | `ui/Panel.ts` | Rounded rectangle background | `Container` | `client/src/ui/` |
| `Button` | `ui/Button.ts` | Interactive button with hover | `Graphics` | `client/src/ui/` |

**Panel Usage:**
```typescript
new Panel(width, height, bgColor?, alpha?, radius?)
```

**Button Usage:**
```typescript
new Button(text, width?, height?, color?)
// Event: on('pointertap', callback)
```

---

### UI Components - Game Elements

| Component | File | Purpose | Extends | Size | Location |
|-----------|------|---------|---------|------|----------|
| `CardView` | `ui/CardView.ts` | Single item card | `Container` | Dynamic (88-276px) | `client/src/ui/` |
| `ShopCardView` | `ui/CardView.ts` | Shop item card | `Container` | Dynamic (180-212px) | `client/src/ui/` |
| `BattleCardView` | `ui/BattleCardView.ts` | Battle-time card with state | `CardView` | Same as CardView | `client/src/ui/` |
| `BoardRow` | `ui/BoardRow.ts` | 10-slot game board | `Container` | 934×110 | `client/src/ui/` |
| `BottomBar` | `ui/BottomBar.ts` | Info bar (HP, gold, buttons) | `Container` | 928×100 | `client/src/ui/` |
| `SlotGrid` | `ui/SlotGrid.ts` | Compact inventory grid | `Container` | 64×64 per slot | `client/src/ui/` |

**CardView Constructor:**
```typescript
new CardView(item: SlotItem)
// Properties: cardWidth, cardHeight
```

**BattleCardView Constructor:**
```typescript
new BattleCardView(item: SlotItem)
// Methods: flash(), updateState(CardRuntimeState)
```

**BoardRow Constructor:**
```typescript
new BoardRow(slotCount: number)
// Properties: containerType ('board' | 'stash')
// Methods: update(), getSlotIndexAtGlobal(), showExternalHighlight(), clearExternalHighlight()
// Callbacks: onSwap, onMerge, onDragOut, onDragging, onDragStop
```

**BottomBar Constructor:**
```typescript
new BottomBar()
// Methods: update(run: RunState), update methods for specific stats
// Callbacks: onStashToggle
```

**SlotGrid Constructor:**
```typescript
new SlotGrid(slotCount: number, onSlotClick?: (index: number) => void)
// Methods: update(items: SlotItem[])
// Property: totalWidth
```

---

### Utility Modules

| Module | File | Purpose | Key Functions | Location |
|--------|------|---------|----------------|----------|
| Target Preview | `ui/targetSlotPreview.ts` | Calculate highlighted slots on hover | `getTargetRuleHighlightSlots()` | `client/src/ui/` |

**Target Rule Types:**
```typescript
'self'       // Only the card itself
'adjacent'   // Cards left/right adjacent
'leftmost'   // Leftmost card (excluding self)
'rightmost'  // Rightmost card (excluding self)
'all'        // All other cards
'position'   // Specific slot index
```

---

### Scene Files

| Scene | File | Purpose | Data Props | Location |
|-------|------|---------|-----------|----------|
| `LobbyScene` | `scenes/LobbyScene.ts` | Hero selection | None | `client/src/scenes/` |
| `MainScene` | `scenes/MainScene.ts` | Main gameplay | None (existing run) | `client/src/scenes/` |
| `BattleScene` | `scenes/BattleScene.ts` | Battle playback | `BattleData` | `client/src/scenes/` |
| `ShopScene` | `scenes/ShopScene.ts` | Shop interface | `ShopData` | `client/src/scenes/` |

**LobbyScene:** 
- Loads heroes, items, bazaar items
- Displays hero selection cards
- Shows tutorial hint if needed

**MainScene:**
- Z1: Day/Hour display
- Z2: Adaptive content (choice buttons, events, pending dialogs, stash)
- Z3: Player board (10-slot)
- Z4: Bottom bar
- Handles: drag-and-drop, board/stash swaps, sells, merges, cross-container moves

**BattleScene:**
- Z1: HP bars, status effects, tick counter
- Z2: Enemy board (10-slot)
- Z3: Player board (10-slot)
- Z4: Bottom bar
- Float layer: damage/heal numbers
- Playback: 4x speed animation of battle events

**ShopScene:**
- Z1: Shop title, gold, refresh button, leave button
- Z2: Shop items (horizontal scroll)
- Z3: Player board (placement)
- Z4: Bottom bar
- Handles: item purchase, board management, shop state

---

## API Endpoint Reference

### Run Lifecycle

```
POST   /run/start              → StartRunResponse
GET    /run/current            → GetRunResponse
POST   /run/hour-choice        → HourChoiceResponse
POST   /run/pve                → PveResponse
POST   /run/pvp                → PvpResponse
POST   /run/event              → EventChoiceResponse
```

### Item Management

```
POST   /run/buy                → BuyItemResponse
POST   /run/board/place        → PlaceItemResponse
POST   /run/board/merge        → MergeItemResponse
POST   /run/board/sell         → SellItemResponse
POST   /run/board/swap         → SwapItemsResponse
```

### Shop

```
POST   /run/shop/refresh       → RefreshShopResponse
POST   /run/shop/leave         → LeaveShopResponse
```

### Configuration (Lazy-loaded at startup)

```
GET    /config/heroes          → HeroConfig[]
GET    /config/items           → ItemConfig[]
GET    /config/bazaar-items    → ItemConfig[]
GET    /config/monsters        → MonsterConfig[]
GET    /config/events          → EventConfig[]
```

### User Profile

```
GET    /user/me                → UserMeResponse
PATCH  /user/nickname          → UserMeResponse
```

---

## State Interfaces (from @autocard/shared)

### Data Types Used Throughout Frontend

```typescript
// Game State
RunState                    // Current game run data
HeroConfig                  // Hero definitions
ItemConfig                  // Item definitions
SlotItem                    // Item in inventory/board
ItemSize                    // 1 | 2 | 3

// Battle
BattleResult                // Final battle outcome
BattleEvent                 // Individual battle action
BattleSnapshot              // Board state at tick
CardRuntimeState            // Card runtime overlay state
BattleSide                  // 'player' | 'enemy'

// Events
TargetRule                  // How card targets other cards
EventConfig                 // Event definitions
EventChoice                 // Player's event option

// UI State (local, not from server)
ShopData = { run, shopItems }
BattleData = { type, result, ... }
```

---

## Event System

### UserInteraction → API → Render Cycle

```
1. User clicks button / drags card
2. Scene handler calls api.operation(params)
3. Handler receives response with new RunState
4. gameState.setRun(response.run)
5. Component.update() or scene.render() refreshes display
6. UI reflects server state
```

### Event Names (Pixi.js)

```
'pointertap'        // Mouse click / touch
'pointerdown'       // Mouse down / touch start
'pointermove'       // Mouse move / touch drag
'pointerup'         // Mouse up / touch end
```

### Custom Callbacks (Card/Board interactions)

```typescript
// BoardRow callbacks
onSwap(item, targetSlot)
onMerge(itemA, itemB)
onDragOut(item, globalX, globalY)
onDragging(item, globalX, globalY)
onDragStop()

// BottomBar callbacks
onStashToggle()

// SlotGrid callbacks
onSlotClick(index)
```

---

## Color Palette - Complete Reference

### Background Colors (Hex)

```
Primary:      0x1a1a2e (#1a1a2e) - App canvas
Z1:           0x0e1a2b (#0e1a2b) - Bars & headers
Z2:           0x0e1a2b (#0e1a2b) - Content areas
Z3:           0x14243a (#14243a) - Board areas
Battle Z1:    0x2a0e0e (#2a0e0e) - Battle header
```

### Text Colors (Hex)

```
Gold/Title:   #ffd700 - Primary headings
Yellow:       #ffcc00 - Emphasis
Blue:         #ccddee - Body text
Muted:        #8899aa - Labels
Green:        #4ad97a - Success/Player
Red:          #ff6666 - Danger/Error
Cyan:         #00ffff - Tier color
Orange:       #ff8866 - Enemy/Battle
Purple:       #cc66ff - Special effects
```

### Button Colors (Hex)

```
Primary:      0x4a90d9 (#4a90d9) - Steel blue
Success:      0x4ad97a (#4ad97a) - Mint green
Danger:       0xd94a4a (#d94a4a) - Red
Warning:      0xd9944a (#d9944a) - Orange
Disabled:     0x444444 (#444444) - Dark gray
Hover:        0xcccccc (#cccccc) - Light gray
```

### Tier Colors (Hex)

```
Bronze:       0xcd7f32 (#cd7f32) - Gold-orange
Silver:       0xc0c0c0 (#c0c0c0) - Light gray
Gold:         0xffd700 (#ffd700) - Bright gold
Diamond:      0x00ffff (#00ffff) - Cyan
Legendary:    0xff44ff (#ff44ff) - Magenta
```

### Special Colors

```
Sell Overlay: 0xbfa620 (#bfa620, alpha 0.92) - Gold-brown
Slot Glow:    0x44ff44 (#44ff44) - Bright green
External:     0xffdd00 (#ffdd00) - Bright yellow
```

---

## Component Relationship Diagram

```
Application (Pixi.js)
├── SceneManager
│   ├── LobbyScene
│   │   └── [Hero Cards]
│   │       └── Button
│   │
│   ├── MainScene
│   │   ├── Z1: Title + Z1_BG
│   │   ├── Z2: Dynamic Content
│   │   │   ├── Button (choice/event)
│   │   │   └── BoardRow (stash, optional)
│   │   ├── Z3: BoardRow (main board)
│   │   ├── Z4: BottomBar
│   │   └── sellHint (overlay)
│   │
│   ├── BattleScene
│   │   ├── Z1: HpBar + Status Text
│   │   ├── Z2: BoardRow (enemy)
│   │   ├── Z3: BoardRow (player)
│   │   │   ├── BattleCardView
│   │   │   └── BattleCardView
│   │   ├── Z4: BottomBar
│   │   └── floatLayer (damage numbers)
│   │
│   └── ShopScene
│       ├── Z1: Title + Buttons
│       ├── Z2: ShopCardView (horizontal)
│       │   ├── ShopCardView
│       │   ├── ShopCardView
│       │   └── ShopCardView
│       ├── Z3: BoardRow
│       │   └── CardView
│       ├── Z4: BottomBar
│       └── sellHint (overlay)
│
└── GameState (Singleton)
    ├── run: RunState
    ├── heroes: HeroConfig[]
    ├── items: ItemConfig[]
    ├── bazaarItems: ItemConfig[]
    └── itemsMap: Map<string, ItemConfig>
```

---

## Quick Lookup: Component Usage Patterns

### How to Display a Card
```typescript
const card = new CardView(item)
card.x = posX
card.y = posY
container.addChild(card)
```

### How to Render a Board
```typescript
const board = new BoardRow(10)
board.update(runState.board)
board.x = INNER_X
board.y = Z3_CARD_Y
scene.addChild(board)
```

### How to Handle Item Interaction
```typescript
board.onSwap = (item, targetSlot) => {
  api.swapItems(...).then(result => {
    gameState.setRun(result.run)
    board.update(result.run.board)
  })
}
```

### How to Show Battle
```typescript
sm.goto('battle', {
  type: 'pve',
  result: battleData,
  playerBoard: snapshot,
})
```

### How to Change Scene
```typescript
sm.goto('sceneName', optionalData)
// Current scene.onExit() called
// New scene.onEnter(data) called
```

---

## File Size Overview

| File | Lines | Bytes | Category |
|------|-------|-------|----------|
| `main.ts` | 27 | 0.8k | Entry |
| `ui/layout.ts` | 74 | 1.5k | Config |
| `ui/Panel.ts` | 12 | 0.3k | Component |
| `ui/Button.ts` | 35 | 1.2k | Component |
| `ui/CardView.ts` | 320 | 9.5k | Component |
| `ui/BattleCardView.ts` | 110 | 3.2k | Component |
| `ui/BoardRow.ts` | ~250 | ~7.5k | Component |
| `ui/BottomBar.ts` | ~150 | ~4.5k | Component |
| `ui/SlotGrid.ts` | 92 | 2.8k | Component |
| `ui/targetSlotPreview.ts` | 65 | 1.8k | Utility |
| `core/GameState.ts` | 34 | 0.9k | Core |
| `core/SceneManager.ts` | 35 | 0.9k | Core |
| `scenes/LobbyScene.ts` | 171 | 5.0k | Scene |
| `scenes/MainScene.ts` | 497 | 14.8k | Scene |
| `scenes/BattleScene.ts` | 519 | 15.5k | Scene |
| `scenes/ShopScene.ts` | 278 | 8.3k | Scene |
| `api/client.ts` | 91 | 2.7k | API |

**Total:** ~3200 lines, ~85 KB

---

## Development Notes

### When Extending Components

1. **Component Hierarchy:** All components extend `Container` (from Pixi.js)
2. **Constructor Pattern:** Call `super()` first, then build children
3. **Event Binding:** Use Pixi's `on('pointertap', callback)` pattern
4. **Cleanup:** Implement proper destruction (especially Ticker in BattleScene)

### When Adding Features

1. **New Item Type:** Update CardView port symbols, add to TIER_COLORS
2. **New Scene:** Extend Scene, implement onEnter/onExit, register in main.ts
3. **New Button:** Use Button component with appropriate color
4. **New API:** Add to api/client.ts, handle response, update GameState

### Performance Optimization Areas

1. **Image Loading:** Already cached in CardView
2. **Layout:** Uses efficient slot-based system (O(n) per update)
3. **Rendering:** Three-layer BoardRow approach (selective updates)
4. **Ticker:** Only used in BattleScene, properly cleaned up

---

**End of Component Inventory**

For detailed explanations, see [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md)  
For navigation, see [FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md)
