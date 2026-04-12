# AutoCard Frontend - Detailed Reference

**Last Updated:** 2026-04-12  
**Scope:** Complete UI component library, API integration, and architectural patterns

---

## Table of Contents

1. [Component Library](#component-library)
2. [API Client Layer](#api-client-layer)
3. [Dimension Reference](#dimension-reference)
4. [Color & Visual System](#color--visual-system)
5. [Event Flow & State Management](#event-flow--state-management)
6. [Interactive Patterns](#interactive-patterns)
7. [Animation & Visual Effects](#animation--visual-effects)
8. [Performance Considerations](#performance-considerations)

---

## Component Library

### 1. **Panel** (`ui/Panel.ts`)

Reusable container for rounded rectangle backgrounds with configurable styling.

```typescript
class Panel extends Container {
  constructor(
    width: number,
    height: number,
    bgColor = 0x16213e,    // Dark blue default
    alpha = 0.9,           // Opacity
    radius = 12            // Border radius
  )
}
```

**Usage:**
- Generic background container for sections
- Base for modal dialogs
- Battle result panels (e.g., BattleScene line 382)

**Default Colors:**
- `0x16213e` - Dark navy blue (primary panel)
- Battle panels: `0x0e1a2b` (darker)

---

### 2. **Button** (`ui/Button.ts`)

Interactive button component with hover effects and tap handlers.

```typescript
class Button extends Graphics {
  constructor(
    text: string,
    width = 200,
    height = 50,
    color = 0x4a90d9    // Steel blue
  )
}
```

**Features:**
- Rounded rectangle background
- Centered text (13px Arial Bold)
- Hover tint: `0xcccccc` (light gray)
- Event mode: static (clickable)

**Color Palette:**
- Primary: `0x4a90d9` (steel blue) - default
- Success: `0x4ad97a` (mint green)
- Danger: `0xd94a4a` (red)
- Warning: `0xd9944a` (orange)
- Neutral: `0x444444` (dark gray, disabled state)

**Examples in Code:**
```
- MainScene: Choice buttons (shop, event, gift)
- BattleScene: Continue button
- ShopScene: Leave, Refresh buttons
- LobbyScene: Hero selection buttons
```

---

### 3. **CardView** (`ui/CardView.ts`)

Main card display component for game items.

#### CardView Structure

**Dimensions (for size=1):**
```
Total: 88×110
├─ Border: -2 to 90 px (with 4px padding)
├─ Body: 0-88 × 0-110
├─ Name: centered at (44, 4)
├─ Ports: centered at (44, 28 or h-40)
├─ Image area: (6, 20) to (82, 75) - 76×55
├─ Cooldown: (6, h-18)
└─ Tier label: (w-6, h-18)
```

**Card Configuration Calculation:**
```typescript
// From layout.ts
CARD_UNIT = 88            // Base unit width
CARD_GAP = 6              // Gap between cards
CARD_H = 110              // Standard height

cardWidth(size: 1|2|3): number {
  return CARD_UNIT * size + CARD_GAP * (size - 1)
}

// Example outputs:
cardWidth(1) = 88
cardWidth(2) = 88*2 + 6*1 = 182
cardWidth(3) = 88*3 + 6*2 = 276
```

**Visual Hierarchy (CardView):**
```
1. Border (tier color, alpha 0.9)
2. Body background (tier-specific dark color)
3. Name (white, 11-13px depending on size)
4. Image (if exists, with dark background)
5. Ports/Effects (tier color, 10-12px)
6. Cooldown text (light blue, 11px, bottom-left)
7. Tier label (tier color, 11px, bottom-right)
8. Description (if size >= 2 and no image)
```

**Tier Color System:**
```typescript
TIER_COLORS = {
  bronze:    0xcd7f32,    // Orange-gold
  silver:    0xc0c0c0,    // Light gray
  gold:      0xffd700,    // Gold
  diamond:   0x00ffff,    // Cyan
  legendary: 0xff44ff,    // Magenta
}

TIER_BG = {
  bronze:    0x3d2b1f,    // Dark brown
  silver:    0x3a3a4a,    // Dark gray-blue
  gold:      0x4a3a10,    // Dark olive
  diamond:   0x0a3a4a,    // Dark cyan
  legendary: 0x3a0a3a,    // Dark purple
}

tierHex(tier: string): string  // Returns CSS hex string
```

**Port Symbols:**
```typescript
damage:  ⚔️  (\u2694\uFE0F)
poison:  ☠️  (\u2620\uFE0F)
burn:    🔥  (\uD83D\uDD25)
heal:    ❤️  (\u2764\uFE0F)
shield:  🛡️  (\uD83D\uDEE1\uFE0F)
haste:   ⚡  (\u26A1)
charge:  🔋  (\uD83D\uDD0B)
slow:    ❄️  (\u2744\uFE0F)
freeze:  ❄️  (\u2744\uFE0F)
default: ⭐  (\u2B50)
```

#### ShopCardView Variant

Extended CardView for shop display with dynamic height:

```typescript
class ShopCardView extends Container {
  // With image:
  NAME_H = 24
  SHOP_IMG_H = 96      // Larger image area
  SHOP_INFO_H = 48     // Ports + price info
  BTN_AREA_H = 44      // Purchase button area
  Total: 24 + 96 + 48 + 44 = 212px

  // Without image:
  Total: 110 + 80 = 190px
}
```

**Shop State Indicators:**
```
purchased → Gray border (0x333333), shows "已购" (green)
canAfford == false → Red text "金币不足" (insufficient gold)
canPlace == false → Red text "无法放置" (can't place)
canBuy → Blue button (0x4a90d9) with "购买" (buy)
```

---

### 4. **BattleCardView** (`ui/BattleCardView.ts`)

Extends CardView with runtime battle state display.

**Runtime State Overlays:**
```
destroyed:     Red tint/overlay
freeze:        Cyan overlay (\u2744\uFE0F)
slow:          Blue overlay (\u2744\uFE0F)
haste:         Yellow glow (\u26A1)
```

**Cooldown Progress:**
- Position: bottom-right of card
- Height: 6px
- Color: Blue (#4499ff)
- Updates: `cooldownProgress` / card.cooldown

**Methods:**
```typescript
flash()                           // 120ms white flash animation
updateState(state: CardRuntimeState) // Updates overlays based on state
```

---

### 5. **BoardRow** (`ui/BoardRow.ts`)

Interactive game board with 10 slots, drag-and-drop support, and visual feedback.

**Layout:**
```
10 slots × 88px + 9 gaps × 6px = 934px total
Each slot: 88×110
Slot positions: slot_index * (88 + 6)
```

**Three-Layer Architecture:**
```typescript
this.bgSlots        // Background rectangles for visual feedback
this.slotGlowLayer  // Highlight effects for drag targets
this.cardsLayer     // Actual card views
```

**Slot Background:**
```
Color: 0x1a2a4a (dark blue)
Stroke: 0x2a4a6a (lighter blue), 1px
Border radius: 6px
```

**Glow Effects (targetSlotPreview):**
```
highlight (drag target)  → Green glow (0x44ff44)
external slot            → Yellow glow (0xffdd00)
```

**Event Callbacks:**
```typescript
onSwap(item: SlotItem, targetSlot: number)
onMerge(a: SlotItem, b: SlotItem)
onDragOut(item: SlotItem, globalX: number, globalY: number)
onDragging(item: SlotItem, globalX: number, globalY: number)
onDragStop()
```

**Methods:**
```typescript
update(items: SlotItem[])                    // Refresh board display
getSlotIndexAtGlobal(globalX: number)        // Convert screen coords to slot
showExternalHighlight(gx: number, size)      // Show target from other row
clearExternalHighlight()                     // Clear highlight
```

---

### 6. **BottomBar** (`ui/BottomBar.ts`)

Fixed information bar displaying player stats and stash button.

**Position & Dimensions:**
```
x: SIDE_PAD (16)
y: Z4_Y (500)
width: 928px (W - SIDE_PAD * 2)
height: 100px
```

**Content Layout:**
```
├─ HP display (green text, large)
├─ Gold display (yellow text, large)
├─ Prestige display (orange text)
├─ Stash button (72×34, gold border)
├─ HP/Level info (small text)
└─ Run info (Day X, Hour X)
```

---

### 7. **SlotGrid** (`ui/SlotGrid.ts`)

Compact grid for small item displays (appears in inventory/stash contexts).

**Dimensions:**
```
Each slot: 64×64
Gap between: 4px
Total width: slots * (64 + 4) - 4
```

**Slot Appearance:**
```
Background: 0x2a2a4a (dark purple)
Border: 0x444466 (light purple), 1px
Radius: 6px
```

**Item Display on Slot:**
```
Background color: tier color
Text: item name (12px, dark)
Tier label: UPPERCASE (10px, dark, bottom-left)
```

**Methods:**
```typescript
constructor(slotCount: number, onSlotClick?: (index: number) => void)
update(items: SlotItem[])       // Update grid with items
get totalWidth: number          // Calculate rendered width
```

---

## API Client Layer

### Request Infrastructure

**File:** `api/client.ts`

**Persistence:**
```typescript
let userId = localStorage.getItem('autocard_uid') || crypto.randomUUID()
localStorage.setItem('autocard_uid', userId)
// Unique per browser session
```

**Request Function:**
```typescript
request<T>(
  method: string,
  path: string,
  body?: any,
  retries = 3
): Promise<T>

// Headers always include:
'Content-Type': 'application/json'
'x-user-id': userId
```

**Retry Logic:**
- Automatic retry up to 3 times on failure
- Exponential backoff: 1s, 2s, 3s delays

### API Endpoints

#### Run Management
```
POST   /run/start                    // StartRunResponse
GET    /run/current                  // GetRunResponse
POST   /run/hour-choice              // HourChoiceResponse
POST   /run/pve                      // PveResponse
POST   /run/pvp                      // PvpResponse
POST   /run/event                    // EventChoiceResponse
```

#### Item Operations
```
POST   /run/buy                      // BuyItemResponse
POST   /run/board/place              // PlaceItemResponse
POST   /run/board/merge              // MergeItemResponse
POST   /run/board/sell               // SellItemResponse
POST   /run/board/swap               // SwapItemsResponse
```

#### Shop Operations
```
POST   /run/shop/refresh             // RefreshShopResponse
POST   /run/shop/leave               // LeaveShopResponse
```

#### Configuration
```
GET    /config/heroes                // HeroConfig[]
GET    /config/items                 // ItemConfig[]
GET    /config/bazaar-items          // ItemConfig[]
GET    /config/monsters              // MonsterConfig[]
GET    /config/events                // EventConfig[]
```

#### User Profile
```
GET    /user/me                      // UserMeResponse
PATCH  /user/nickname                // UserMeResponse
```

---

## Dimension Reference

### Canvas & Viewport

```typescript
W = 960                  // Canvas width
H = 600                  // Canvas height
```

### Four-Zone Layout System

```
Z1 (Top Bar) ────────────────────────────────
y: 2
height: 100
Content: Day/Hour title, possibly buttons

Z2 (Content Area) ────────────────────────────
y: 106
height: 230
Content: Shop items, Events, Choice buttons, Stash

Z3 (Player Board) ────────────────────────────
y: 340
height: 156
Content: 10-slot player game board

Z4 (Bottom Bar) ──────────────────────────────
y: 500
height: 100
Content: HP, Gold, Prestige, Stash button
```

### Card Grid System

```
CARD_UNIT = 88                    // Base card width
CARD_GAP = 6                      // Space between cards
CARD_H = 110                      // Card height

cardWidth(1) = 88
cardWidth(2) = 182
cardWidth(3) = 276
```

### Safe Area

```
SIDE_PAD = 16                     // Padding from screen edges
INNER_X = SIDE_PAD + 8 = 24       // Content inset
```

### Label Positioning

```
Z1_LABEL_Y = Z1_Y + 6 = 8         // Title in top bar
Z2_LABEL_Y = Z2_Y + 6 = 112       // Section header
Z2_CARD_Y = Z2_Y + 26 = 132       // Cards start here

Z3_LABEL_Y = Z3_Y + 4 = 344       // Board label
Z3_CARD_Y = Z3_Y + 22 = 362       // Board cards start
```

---

## Color & Visual System

### Background Colors

```typescript
const App Background = #1a1a2e           // Near-black, slight purple tint

const Z1_BG = 0x0e1a2b (alpha 0.85)     // Dark blue (top bar)
const Z2_BG = 0x0e1a2b (alpha 0.85)     // Dark blue (content)
const Z3_BG = 0x14243a (alpha 0.9)      // Slightly lighter (board)
const Z4_BG = No explicit background    // Uses default

Battle Scene:
  Z1_BG = 0x2a0e0e (alpha 0.85)        // Dark red (battle top)
  Z2_BG = 0x2a0e0e (alpha 0.85)        // Dark red (enemy board)
  Z3_BG = 0x14243a (alpha 0.9)         // Standard (player board)
```

### Text Colors

```
Primary title:      #ffd700            // Gold
Secondary title:    #ffcc00            // Yellow-gold
Label text:         #8899aa            // Muted blue
Body text:          #ccddee            // Light blue
Description:        #99aabb            // Medium blue
Disabled/Muted:     #888888            // Gray

Status Text:
  Success/Positive: #4ad97a            // Green
  Warning:          #ffcc00            // Yellow
  Error/Danger:     #ff6666            // Red
  Enemy:            #ff8866            // Orange-red

Battle HP:
  Player HP:        #4ad97a            // Green
  Enemy HP:         #d94a4a            // Red
  Shield:           #88ccff            // Cyan
```

### Interactive Element Colors

```
Default Button:     0x4a90d9           // Steel blue
Hover Button:       0xcccccc (tint)    // Light gray
Disabled Button:    0x444444           // Dark gray

Success Button:     0x4ad97a           // Mint green
Danger Button:      0xd94a4a           // Red
Warning Button:     0xd9944a           // Orange

Sell Overlay:       0xbfa620 (alpha 0.92) // Gold-brown
```

### Border/Stroke Colors

```
Card Border:        Tier color with alpha 0.9
Slot Border:        0x444466 (light purple), 1px
Panel Border:       0x2a4a6a (blue), 1px
Button Border:      None (filled rectangle)
```

---

## Event Flow & State Management

### GameState Singleton

```typescript
class GameStateStore {
  run: RunState | null          // Current game run
  heroes: HeroConfig[]          // Available heroes
  items: ItemConfig[]           // Base item catalog
  bazaarItems: ItemConfig[]     // Special shop items
  itemsMap: Map<string, ItemConfig>  // O(1) lookup
}

export const gameState = new GameStateStore()
```

**Update Methods:**
```typescript
setRun(run: RunState | null)    // Update game state after API call
setConfigs(heroes, items, bazaar)  // Load configuration at startup
```

### Scene Lifecycle

```typescript
abstract class Scene extends Container {
  abstract onEnter(data?: any): void | Promise<void>
  onExit(): void
}
```

**Transition Flow:**
```
1. User action (button click, etc.)
2. API call to server
3. gameState.setRun(response.run)
4. sm.goto('sceneName', data)
5. Current scene.onExit()
6. Remove from stage
7. New scene.onEnter(data) called
8. Render new scene
```

### Common Data Flow Pattern

**Example: Buy Item in Shop**

```
1. ShopCardView buy button click
2. Call api.buy(runId, itemId, target, slotIndex)
3. Server validates, updates inventory
4. Response includes new RunState
5. gameState.setRun(result.run)
6. ShopScene.render() refreshes all displays
7. purchasedSet.add(idx) prevents re-purchase

Key: Always re-render after API success
```

### State Persistence

- **Volatile:** In-memory UI state (purchasedSet, stashOpen)
- **Server:** Run state (board, inventory, gold, level)
- **Local Storage:** User ID, tutorial seen flag

---

## Interactive Patterns

### Drag & Drop Pattern

**Used In:** MainScene, ShopScene, BoardRow

```typescript
// Phase 1: Start
element.on('pointerdown', () => {
  dragItem = item
  startGlobal = getGlobalPosition()
})

// Phase 2: During
element.on('pointermove', (evt) => {
  const { global } = evt.getModifieds
  sceneManager.handleDragging(dragItem, global.x, global.y)
  // Updates visual feedback (sell overlay, highlights)
})

// Phase 3: End
element.on('pointerup', () => {
  sceneManager.handleDragOut(dragItem, currentGlobal.x, currentGlobal.y)
  // Processes the interaction (sell, swap, move)
})
```

**Sell Overlay Logic:**

```
When dragging over Z1:
  buildSellOverlay(coverZ2: false)  // Only Z1 height

When dragging over Z1+Z2 (stash closed):
  buildSellOverlay(coverZ2: true)   // Z1+Z2 height

Visual: Gold background (0xbfa620) with "松手售出卡牌"
```

### Hover Preview Pattern

**Used In:** BoardRow (card hover)

```typescript
// When card hovered:
getTargetRuleHighlightSlots(hoveredItem, board, card.targetRule)
  // Returns: number[] of slot indices to highlight

// Visual: Show glow on affected slots based on target type
// Types: self, adjacent, leftmost, rightmost, all, position
```

### Cross-Container Move Pattern

**Used In:** MainScene (board ↔ stash)

```
1. Drag from board over stash area
2. stashRow.showExternalHighlight(gx, size)
3. Visual feedback on stash
4. Drop triggers: handleCrossMove('board', 'stash', slot)
5. API: placeItem(runId, 'board', fromSlot, 'stash', toSlot)
```

---

## Animation & Visual Effects

### Card Flash Animation (Battle)

```typescript
flash() {
  // 120ms white tint animation on card
  // Called when card triggers during battle
}
```

### Floating Damage Text (Battle)

```typescript
spawnFloat(x: number, y: number, text: string, color: string) {
  // Creates text at (x + random±20, y)
  // Animates upward: y -= 1 per frame
  // Fades out over 800ms
  // Removed after animation completes
}

Offset: x ± 0-40px random (visual variety)
Color examples:
  Damage: #ff4444 (red)
  Heal:   #44ff44 (green)
  Shield: #88ccff (cyan)
  Poison: #88ff44 (yellow-green)
  Burn:   #ff8844 (orange)
  DoT:    #cc66ff (purple)
```

### HP Bar Animation

```typescript
class HpBar {
  private barW = 400
  private barH = 16
  
  setHp(hp: number, shield: number) {
    // Redraw fills based on ratio
    // HP fill: color (green for player, red for enemy)
    // Shield fill: cyan (0x88ccff)
    // Text: "hp+shield/maxHp" format
  }
}
```

### Battle Playback Ticker

```typescript
const PLAYBACK_SPEED = 4          // 4x speed
const BATTLE_TICK_MS = from shared

// Each frame:
elapsed += dt * PLAYBACK_SPEED
targetTick = floor(elapsed * 1000 / BATTLE_TICK_MS)

// Process all events for targetTick
while (eventIdx < events.length && events[eventIdx].tick <= targetTick)
  processEvent(events[eventIdx++])
```

---

## Performance Considerations

### Image Caching

```typescript
const imageCache = new Map<string, Texture>()

// First load:
Assets.load<Texture>(imageUrl).then(texture => {
  imageCache.set(imageUrl, texture)
  apply(texture)
})

// Subsequent loads:
if (imageCache.has(imageUrl)) {
  apply(imageCache.get(imageUrl)!)  // Immediate
}
```

**Benefit:** Avoids re-loading duplicate card images

### Batch Re-rendering

```typescript
// Instead of updating individual elements:
refresh() {
  boardRow.update(run.board)
  stashRow.update(run.stash)
  bottomBar.update(run)
  renderZ1()                    // Re-render top bar
}

// Called once after any server state change
```

### Ticker Management

```typescript
// Battle scene only:
startPlayback() {
  this.ticker = new Ticker()
  this.ticker.add(this.onTick, this)
  this.ticker.start()
}

stopPlayback() {
  this.ticker?.stop()
  this.ticker?.destroy()
  this.ticker = null              // Cleanup
}

onExit() {
  this.stopPlayback()             // Always cleanup on scene exit
}
```

### Layer Composition

```typescript
// Three-layer approach in BoardRow:
this.bgSlots         // Base (doesn't change during drag)
this.slotGlowLayer   // Interaction feedback (updates on drag)
this.cardsLayer      // Card views (updates on data change)

// Benefits: Selective re-rendering of affected layers
```

---

## Troubleshooting & Common Patterns

### When Adding New Scene

1. Create class extending `Scene`
2. Implement `onEnter(data?)` and optionally `onExit()`
3. Register in `main.ts`: `sm.register('name', new SceneName(sm))`
4. Transition via: `sm.goto('name', data)`

### When Adding New Component

1. Extend `Container` (or specific base)
2. Call `super()` in constructor
3. Create graphics/text via Pixi APIs
4. `this.addChild(element)` to add to display tree
5. Set `eventMode = 'static'` for interactivity

### When Styling Text

Default pattern:
```typescript
new Text({
  text: 'content',
  style: {
    fill: '#color',           // Hex string
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 'bold',       // Optional
    wordWrap: true,           // Optional
    wordWrapWidth: maxWidth,  // Required if wrap
  }
})
```

### When Handling API Errors

```typescript
try {
  const result = await api.operation(...)
  gameState.setRun(result.run)
  refresh()                   // Always refresh UI
} catch (e: any) {
  console.error('Operation failed:', e.message)
  alert(e.message || 'Operation failed')
}
```

---

**End of Detailed Reference**

For quick navigation, see [FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md)
