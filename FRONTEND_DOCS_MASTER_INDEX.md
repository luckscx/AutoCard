# AutoCard Frontend Documentation - Master Index

**Last Updated:** 2026-04-12  
**Scope:** Complete reference library for all frontend UI, components, and architecture  
**Total Coverage:** 3200+ lines of TypeScript, 4 scenes, 12 components, 20 APIs

---

## 📚 Documentation Map

This master index guides you through four comprehensive documentation files that comprehensively document the AutoCard frontend architecture.

### Quick Reference by Need

| **Your Goal** | **Start Here** | **Then Read** |
|---------------|---------------|--------------|
| First time exploring the project | [FRONTEND_DOCS_INDEX.md](#frontend_docs_indexmd) | Then [FRONTEND_COMPONENT_INVENTORY.md](#frontend_component_inventorymd) |
| Need to add a new UI component | [FRONTEND_COMPONENT_INVENTORY.md](#frontend_component_inventorymd) | Then [FRONTEND_DETAILED_REFERENCE.md](#frontend_detailed_referencemd) |
| Need color/dimension constants | [FRONTEND_DETAILED_REFERENCE.md](#frontend_detailed_referencemd) | Section: Dimension Reference & Color System |
| Understanding scene transitions | [FRONTEND_DOCS_INDEX.md](#frontend_docs_indexmd) | Section: Scene System Architecture |
| Building a new scene | [FRONTEND_COMPONENT_INVENTORY.md](#frontend_component_inventorymd) | Then [FRONTEND_DETAILED_REFERENCE.md](#frontend_detailed_referencemd) Section: Event Flow |
| API integration | [FRONTEND_DETAILED_REFERENCE.md](#frontend_detailed_referencemd) | Section: API Client Layer |
| Drag-and-drop interactions | [FRONTEND_DETAILED_REFERENCE.md](#frontend_detailed_referencemd) | Section: Interactive Patterns |
| Battle animations | [FRONTEND_COMPONENT_INVENTORY.md](#frontend_component_inventorymd) | Then read BattleScene source |

---

## 📖 Documentation Files

### [FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md)

**Purpose:** High-level architecture overview and navigation  
**Best for:** First-time orientation, learning scene flow  
**Contains:**
- Four-zone layout system explanation
- Scene registry and transitions
- Component hierarchy overview
- Core dimension constants (quick ref)
- Color palette (quick ref)
- Technical stack summary
- Common troubleshooting

**Key Sections:**
```
1. Overview & Navigation
2. Core Dimensions
3. Layout & Positioning
4. Color Palette  
5. Technical Stack
6. Scene System
7. FAQ & Troubleshooting
```

**Example Questions Answered:**
- How do the four zones work?
- What's the scene transition flow?
- Where do I add a new button?
- What's the coordinate system?

---

### [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md)

**Purpose:** Complete catalog of all components, usage patterns, and relationships  
**Best for:** Finding components, understanding what's available, API reference  
**Contains:**
- Directory of all 12 components
- Constructor signatures and methods
- API endpoint catalog
- State interfaces
- Event system documentation
- Component relationship diagram
- Quick lookup patterns

**Key Sections:**
```
1. Component Directory
2. Core System Files
3. Layout System
4. UI Components (Basic & Game)
5. Utility Modules
6. Scene Files
7. API Endpoints
8. State Interfaces
9. Event System
10. Color Palette
11. Component Diagram
12. Quick Lookup Patterns
```

**Example Questions Answered:**
- What components exist?
- How do I construct a CardView?
- What's the BoardRow API?
- What endpoints does the API have?
- How are components related?

---

### [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md)

**Purpose:** In-depth explanations, patterns, and implementation details  
**Best for:** Learning implementation patterns, troubleshooting, extending components  
**Contains:**
- Detailed component breakdown (with layout diagrams)
- API infrastructure and retry logic
- Dimension reference (complete)
- Color system deep dive
- Event flow & state management patterns
- Interactive patterns (drag-drop, hover, cross-move)
- Animation & effects documentation
- Performance considerations

**Key Sections:**
```
1. Component Library (detailed)
2. API Client Layer
3. Dimension Reference
4. Color & Visual System
5. Event Flow & State Management
6. Interactive Patterns
7. Animation & Visual Effects
8. Performance Considerations
9. Troubleshooting & Common Patterns
```

**Example Questions Answered:**
- How does drag-drop work internally?
- What's the cardWidth calculation?
- How are images cached?
- How do battle animations play?
- What's the state persistence model?

---

### [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) (this file)

**Purpose:** Complete reference library, organized documentation, and quick lookups  
**Best for:** Everything - master reference that ties all docs together  

---

## 🗂️ File Organization

```
/Users/grissom/Game/AutoCard/
├── client/src/
│   ├── main.ts                      # Entry point
│   ├── core/
│   │   ├── GameState.ts             # Singleton state store
│   │   └── SceneManager.ts          # Scene lifecycle
│   ├── api/
│   │   └── client.ts                # API endpoints
│   ├── ui/
│   │   ├── layout.ts                # Dimensions & colors
│   │   ├── Panel.ts                 # Generic background
│   │   ├── Button.ts                # Interactive button
│   │   ├── CardView.ts              # Item display (+ ShopCardView)
│   │   ├── BattleCardView.ts        # Battle-time card
│   │   ├── BoardRow.ts              # 10-slot game board
│   │   ├── BottomBar.ts             # Info bar
│   │   ├── SlotGrid.ts              # Compact inventory
│   │   └── targetSlotPreview.ts     # Hover preview utility
│   └── scenes/
│       ├── LobbyScene.ts            # Hero selection
│       ├── MainScene.ts             # Main gameplay
│       ├── BattleScene.ts           # Battle playback
│       └── ShopScene.ts             # Shop interface
│
└── FRONTEND_*.md                    # This documentation
    ├── FRONTEND_DOCS_INDEX.md
    ├── FRONTEND_COMPONENT_INVENTORY.md
    ├── FRONTEND_DETAILED_REFERENCE.md
    └── FRONTEND_DOCS_MASTER_INDEX.md (this file)
```

---

## 🎯 Navigation by Task

### 1️⃣ **Understanding the Project Structure**

**Start:** [FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md) → Overview & Navigation section

**Then read:**
- Four-zone layout system
- Scene system architecture
- Technical stack summary

**Next:** [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) → Component Directory

---

### 2️⃣ **Adding a New Button**

**File:** `ui/Button.ts` already exists

**Steps:**
1. Reference [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) → Button component
2. Create in your scene: `new Button(text, width, height, color)`
3. Set position: `btn.x = x; btn.y = y`
4. Add listener: `btn.on('pointertap', () => { ... })`
5. Add to scene: `scene.addChild(btn)`

**Colors available:** See [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) → Color & Visual System

---

### 3️⃣ **Adding a New Scene**

**Steps:**
1. Create new file: `scenes/MyScene.ts`
2. Reference [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) → Scene Files section
3. Extend Scene class:
   ```typescript
   export class MyScene extends Scene {
     constructor(sm: SceneManager) { ... }
     async onEnter(data?: any) { ... }
     onExit() { ... }
   }
   ```
4. Register in `main.ts`: `sm.register('myScene', new MyScene(sm))`
5. Transition: `sm.goto('myScene', data)`

**Read:** [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) → Event Flow & State Management

---

### 4️⃣ **Understanding Drag-and-Drop**

**File:** `ui/BoardRow.ts` implements this

**Read:**
1. [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) → BoardRow component
2. [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) → Interactive Patterns section

**Key concepts:**
- Three phases: start (pointerdown), during (pointermove), end (pointerup)
- Sell overlay feedback
- External highlights for cross-container moves

---

### 5️⃣ **Understanding Battle Animations**

**File:** `scenes/BattleScene.ts`

**Read:**
1. [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) → Scene Files → BattleScene
2. [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) → Animation & Visual Effects

**Key components:**
- `BattleCardView` - Cards with state overlays
- `HpBar` - HP bar with shield
- Float text - Damage numbers
- Ticker - 4x speed animation

---

### 6️⃣ **Understanding Card Display**

**File:** `ui/CardView.ts`

**Read:**
1. [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) → CardView component
2. [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) → Component Library → CardView

**Key concepts:**
- Tier color system (bronze, silver, gold, diamond, legendary)
- Port symbols (emoji mappings)
- Adaptive layout (with/without image)
- Size-based scaling (1x, 2x, 3x cards)

---

### 7️⃣ **Understanding API Integration**

**File:** `api/client.ts`

**Read:**
1. [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) → API Endpoint Reference
2. [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) → API Client Layer

**Key concepts:**
- User ID persistence in localStorage
- Automatic retry (3 attempts, exponential backoff)
- Response handling pattern
- GameState update after API success

---

### 8️⃣ **Understanding Dimensions & Positioning**

**File:** `ui/layout.ts`

**Quick reference:**
```
Canvas:       960×600
Z1 (Top):     Y=2, H=100
Z2 (Content): Y=106, H=230
Z3 (Board):   Y=340, H=156
Z4 (Bottom):  Y=500, H=100

Card:         88×110 (size 1)
              182×110 (size 2)
              276×110 (size 3)
Board width:  934px (10 slots)
```

**Read:** [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) → Dimension Reference

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Pixi.js Application                    │
│                   (960×600 canvas)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   SceneManager                          │
│  (Manages scene lifecycle & transitions)               │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────────┐  ┌──────────────┐ ┌──────────────┐
   │ LobbyScene  │  │  MainScene   │ │ BattleScene  │
   │ (Hero pick) │  │  (Gameplay)  │ │  (Battle)    │
   └─────────────┘  └──────────────┘ └──────────────┘
                         │
                         ▼
                    ┌──────────────┐
                    │ ShopScene    │
                    │ (Shopping)   │
                    └──────────────┘
```

**Each Scene Contains:**
```
Z1 (Header)        ← Background, Title, Stats
│
Z2 (Content)       ← Buttons, Cards, or Dynamic
│
Z3 (Board)         ← BoardRow (10 slots)
│
Z4 (Footer)        ← BottomBar (HP, Gold, etc)
│
Special Layer      ← Overlays, Animations, Floats
```

---

## 🎨 Key Visual Constants

### Dimensions
```
Canvas: W=960, H=600
Card Unit: 88px
Card Height: 110px
Gap: 6px
Safe Margin: 16px
```

### Colors (Top 10)
```
Primary BG:     #1a1a2e (dark purple)
Panel BG:       #0e1a2b (dark blue)
Board BG:       #14243a (darker blue)
Primary Text:   #ffd700 (gold)
Body Text:      #ccddee (light blue)
Success:        #4ad97a (green)
Danger:         #d94a4a (red)
Tier Glow:      0x44ff44 (bright green)
Sell Overlay:   0xbfa620 (gold-brown)
```

### Tier Colors
```
Bronze:     0xcd7f32  // Gold-orange
Silver:     0xc0c0c0  // Light gray
Gold:       0xffd700  // Bright gold
Diamond:    0x00ffff  // Cyan
Legendary:  0xff44ff  // Magenta
```

---

## 🔄 Data Flow Pattern

```
User Action
  │
  ├─→ Click Button / Drag Card
  │
  ├─→ Scene Handler
  │
  ├─→ API Call
  │   └─→ api.operation(params)
  │
  ├─→ Server Response
  │   └─→ { run, data }
  │
  ├─→ Update GameState
  │   └─→ gameState.setRun(response.run)
  │
  ├─→ Refresh UI
  │   └─→ component.update() or scene.render()
  │
  └─→ Display New State
```

---

## 🚀 Common Operations

### Display a Card
```typescript
const card = new CardView(item)
card.x = 100
card.y = 200
container.addChild(card)
```

### Render a Board
```typescript
const board = new BoardRow(10)
board.update(runState.board)
scene.addChild(board)
```

### Call an API
```typescript
const result = await api.buy(runId, itemId, target, slot)
gameState.setRun(result.run)
scene.render()
```

### Transition to Scene
```typescript
sceneManager.goto('battleScene', {
  type: 'pve',
  result: battleData,
  playerBoard: snapshot
})
```

---

## 📋 Checklist: Project Understanding

- [ ] Read FRONTEND_DOCS_INDEX.md overview
- [ ] Understand four-zone layout system
- [ ] Know the scene registry (lobby → main → battle/shop)
- [ ] Review component catalog in FRONTEND_COMPONENT_INVENTORY.md
- [ ] Understand CardView structure and tier colors
- [ ] Know BoardRow's three-layer architecture
- [ ] Review API endpoint list
- [ ] Understand GameState singleton pattern
- [ ] Read FRONTEND_DETAILED_REFERENCE.md for implementation details
- [ ] Review interactive patterns (drag-drop, hover)
- [ ] Understand animation system (float text, battle playback)
- [ ] Know performance optimizations (caching, batch updates)

---

## 🔗 Cross-References

### By Component Type

**Display Components:**
- CardView, ShopCardView → [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) Component Library
- BoardRow → [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) UI Components
- Button, Panel → Same files above

**Scene Logic:**
- MainScene → [FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md) Scene System
- BattleScene → [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) Scene Files

**Interactions:**
- Drag-drop, hover → [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) Interactive Patterns
- API calls → Same reference doc, API Client Layer

**Visual Styling:**
- Colors, dimensions → [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) Color & Visual System + Dimension Reference
- Quick ref → [FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md) Core Dimensions & Color Palette

---

## 📝 Summary Statistics

| Metric | Value |
|--------|-------|
| Total Source Files | 17 |
| Total Lines of Code | 3200+ |
| Total Size | ~85 KB |
| Scenes | 4 |
| Components | 12 |
| API Endpoints | 18 |
| Color Palette Entries | 40+ |
| Canvas Dimension | 960×600 |

---

## 🎓 Learning Path

### Beginner (1-2 hours)
1. Read [FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md) completely
2. Skim [FRONTEND_COMPONENT_INVENTORY.md](./FRONTEND_COMPONENT_INVENTORY.md) component directory
3. Try creating a simple button in MainScene

### Intermediate (3-4 hours)
1. Read [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md) sections 1-3
2. Understand drag-drop pattern (section 6)
3. Try adding a new UI component to an existing scene

### Advanced (5-6 hours)
1. Read all of [FRONTEND_DETAILED_REFERENCE.md](./FRONTEND_DETAILED_REFERENCE.md)
2. Study animation systems (section 7)
3. Review performance considerations (section 8)
4. Create a new scene from scratch

---

## ✅ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Card not showing | Check cardWidth calculation; verify item in gameState.itemsMap |
| Button not clickable | Verify eventMode = 'static'; use 'pointertap' event |
| Wrong positioning | Check INNER_X, Z*_CARD_Y constants in layout.ts |
| Colors not right | Use Pixi hex format: 0xRRGGBB; or CSS format: '#rrggbb' |
| Drag not working | Ensure onDragging/onDragOut callbacks attached to element |
| API failing | Check network tab; verify userId in localStorage; check headers |
| Scene not transitioning | Verify scene registered in main.ts; check goto call syntax |

---

## 📚 Related Files

**You might also want to read:**
- `/shared` directory - Shared types and interfaces
- Server API documentation - For backend contract
- Pixi.js documentation - For rendering API details

---

**Navigation:**
- **[← Back to FRONTEND_DOCS_INDEX.md](./FRONTEND_DOCS_INDEX.md)**
- **[Component Inventory →](./FRONTEND_COMPONENT_INVENTORY.md)**
- **[Detailed Reference →](./FRONTEND_DETAILED_REFERENCE.md)**

---

*This documentation was generated as a comprehensive reference for the AutoCard frontend UI system. All code examples are extracted from actual source files and are production-ready.*

**Last Updated:** 2026-04-12  
**Maintained by:** Development Team  
**Version:** 1.0
