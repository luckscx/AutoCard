# AutoCard 前端 UI 文档索引

## 📚 已生成的文档

本次探索生成了 3 份详细的前端 UI 文档：

### 1. **FRONTEND_UI_STRUCTURE.md** ⭐ 主要文档
- **内容**：完整的系统设计说明
- **覆盖范围**：
  - 应用初始化流程 (Pixi.js 配置)
  - 四层布局系统 (Z1-Z4) 详细说明
  - 所有 UI 组件详解 (CardView, BattleCardView, BoardRow, 等)
  - 四个场景的完整布局 (Lobby, Main, Shop, Battle)
  - 数据流和状态管理 (GameState, SceneManager)
  - 坐标计算公式
  - 端口系统和颜色体系
- **适合阅读**：需要理解整个系统架构、了解布局逻辑、学习组件设计

### 2. **FRONTEND_CODE_REFERENCE.md** ⭐ 代码参考
- **内容**：18 个可直接使用的代码示例
- **覆盖范围**：
  - 布局常量导入模板
  - 卡牌尺寸计算
  - CardView/BattleCardView/BoardRow 使用
  - 场景切换模式
  - BottomBar/Button 配置
  - 区域检测和拖拽判断
  - ShopCardView 创建
  - Graphics 绘制模式
  - 浮动文字动画实现
  - Pixi 常用模式
  - 快速查找表
- **适合使用**：需要快速查询代码用法、复制粘贴示例、学习最佳实践

### 3. **FRONTEND_LAYOUT_DIAGRAM.md** ⭐ 可视化参考
- **内容**：9 个 ASCII 艺术图表
- **覆盖范围**：
  - 整体屏幕分区示意图
  - 棋盘行 (BoardRow) 结构图
  - CardView 内部结构图
  - ShopCardView 布局图
  - 场景切换状态机
  - MainScene Z2 内容切换流程
  - BattleScene 完整布局
  - 坐标计算速查表
  - 颜色标记对照表
- **适合查看**：需要快速理解布局关系、查找坐标数值、对比颜色代码

---

## 🎯 快速导航

### 场景我在哪个屏幕？
- 大厅选英雄 → 查看 **FRONTEND_UI_STRUCTURE.md §4.1 LobbyScene**
- 主游戏界面 → 查看 **FRONTEND_UI_STRUCTURE.md §4.2 MainScene** + **FRONTEND_LAYOUT_DIAGRAM.md §6**
- 商店购买卡牌 → 查看 **FRONTEND_UI_STRUCTURE.md §4.3 ShopScene**
- 战斗回放 → 查看 **FRONTEND_UI_STRUCTURE.md §4.4 BattleScene** + **FRONTEND_LAYOUT_DIAGRAM.md §7**

### 我要写一个卡牌显示组件
1. 查看 **FRONTEND_UI_STRUCTURE.md §3.1 CardView** 了解结构
2. 查看 **FRONTEND_LAYOUT_DIAGRAM.md §3** 看布局图
3. 查看 **FRONTEND_CODE_REFERENCE.md §3** 复制创建代码

### 我要实现棋盘拖拽
1. 查看 **FRONTEND_UI_STRUCTURE.md §3.5 BoardRow** 了解交互
2. 查看 **FRONTEND_CODE_REFERENCE.md §4** 看完整示例
3. 查看 **FRONTEND_CODE_REFERENCE.md §9** 学习区域检测

### 我要添加新场景
1. 查看 **FRONTEND_UI_STRUCTURE.md §5 数据流和状态管理** 了解 SceneManager
2. 查看 **FRONTEND_CODE_REFERENCE.md §5** 学习场景切换
3. 查看 **FRONTEND_CODE_REFERENCE.md §15** 了解场景生命周期

### 我要做浮动文字或动画
1. 查看 **FRONTEND_CODE_REFERENCE.md §13** 浮动文字实现
2. 查看 **FRONTEND_UI_STRUCTURE.md §4.4 BattleScene** 了解动画原理

### 我要定制颜色
1. 查看 **FRONTEND_UI_STRUCTURE.md §2 颜色体系** 了解现有颜色
2. 查看 **FRONTEND_LAYOUT_DIAGRAM.md §9 颜色标记表** 对照具体数值

### 我要计算卡牌位置
1. 查看 **FRONTEND_LAYOUT_DIAGRAM.md §8 坐标计算速查表**
2. 查看 **FRONTEND_CODE_REFERENCE.md §2 卡牌尺寸计算**

---

## 📁 关键源文件位置

### 布局和配置
- `client/src/ui/layout.ts` - 所有尺寸常量和颜色定义

### 核心组件
- `client/src/ui/CardView.ts` - 卡牌显示 (普通卡牌 + 商店卡牌)
- `client/src/ui/BattleCardView.ts` - 战斗卡牌 + 动画效果
- `client/src/ui/BoardRow.ts` - 棋盘行 + 拖拽交互
- `client/src/ui/BottomBar.ts` - 底部信息栏
- `client/src/ui/Button.ts` - 通用按钮
- `client/src/ui/Panel.ts` - 通用面板

### 工具函数
- `client/src/ui/targetSlotPreview.ts` - 目标高亮计算

### 场景
- `client/src/scenes/LobbyScene.ts` - 大厅/英雄选择
- `client/src/scenes/MainScene.ts` - 主游戏界面
- `client/src/scenes/ShopScene.ts` - 商店
- `client/src/scenes/BattleScene.ts` - 战斗回放

### 系统
- `client/src/core/SceneManager.ts` - 场景管理系统
- `client/src/core/GameState.ts` - 全局游戏状态
- `client/src/main.ts` - 应用入口

### API 接口
- `client/src/api/client.ts` - 后端 API 调用

---

## 🔑 核心尺寸速查

```
屏幕: 960 × 600

四层布局:
┌─────────┬────────────┬─────────┐
│  Z1     │   Z1_H=100 │ Y=2     │ 顶部操作栏
├─────────┼────────────┼─────────┤
│  Z2     │   Z2_H=230 │ Y=106   │ 内容区
├─────────┼────────────┼─────────┤
│  Z3     │   Z3_H=156 │ Y=340   │ 玩家棋盘
├─────────┼────────────┼─────────┤
│  Z4     │   Z4_H=100 │ Y=500   │ 底部栏
└─────────┴────────────┴─────────┘

卡牌尺寸:
size=1: 88×110 (CARD_UNIT=88, CARD_H=110)
size=2: 182×110 (88*2 + 6*1)
size=3: 276×110 (88*3 + 6*2)

棋盘格子间距: CARD_GAP = 6px
板内容 X 起点: INNER_X = 24
屏幕边距: SIDE_PAD = 16
```

---

## 🎨 常用颜色速查

| 用途 | 值 | 十六进制 | RGB |
|-----|-----|---------|------|
| 主背景 | 0x1a1a2e | #1a1a2e | 26,26,46 |
| 内容背景 | 0x0e1a2b | #0e1a2b | 14,26,43 |
| 棋盘背景 | 0x14243a | #14243a | 20,36,58 |
| **稀有度-金** | 0xffd700 | #ffd700 | 255,215,0 |
| **稀有度-钻** | 0x00ffff | #00ffff | 0,255,255 |
| **稀有度-传** | 0xff44ff | #ff44ff | 255,68,255 |
| **主按钮** | 0x4a90d9 | #4a90d9 | 74,144,217 |
| **成功** | 0x4ad97a | #4ad97a | 74,217,122 |
| **失败** | 0xd94a4a | #d94a4a | 217,74,74 |
| **销售遮罩** | 0xbfa620 | #bfa620 | 191,166,32 |

---

## 📊 技术栈

- **渲染引擎**：Pixi.js (WebGL 2D)
- **脚本语言**：TypeScript
- **编译/打包**：(通过项目配置)
- **UI 系统**：全自定义 (Graphics + Text + Container)
- **交互系统**：Pixi 原生事件系统
- **状态管理**：自定义 GameState 类

---

## 📝 文档更新日期

- 📅 **生成日期**：2026-04-12
- 📅 **代码版本基于**：最新的 client/src 目录
- 📅 **Pixi.js 版本**：8.x (从 Application 初始化推断)

---

## 💡 使用建议

1. **首次阅读**：先读 FRONTEND_UI_STRUCTURE.md 的 §1-4 章节，建立整体认知
2. **快速查询**：使用本索引的导航部分快速定位
3. **实现功能**：查看 FRONTEND_CODE_REFERENCE.md 中的相关代码示例
4. **调试布局**：对照 FRONTEND_LAYOUT_DIAGRAM.md 的图表和坐标表
5. **修改配置**：所有修改都集中在 layout.ts，修改后其他组件自动适配

---

## ⚠️ 已知限制/注意事项

1. **响应式设计**：当前方案是固定 960×600 布局，虽然有 `resizeTo: window` 但元素不会随窗口缩放
2. **性能优化**：大量卡牌渲染时可能需要优化（如使用 Spine/Spine-Runtime）
3. **图片加载**：CardView 中的图片使用异步加载，首次加载可能有延迟
4. **拖拽边界**：棋盘拖拽的边界检测有 ±15px 容差，设计中预留了这个值

---

## 🎓 学习路径

### 路径 1：了解整个系统（推荐新人）
1. 阅读 FRONTEND_LAYOUT_DIAGRAM.md §1 整体分区
2. 阅读 FRONTEND_UI_STRUCTURE.md §1-2 入口和布局系统
3. 阅读 FRONTEND_UI_STRUCTURE.md §4 四个场景
4. 需要代码时参考 FRONTEND_CODE_REFERENCE.md

### 路径 2：快速上手编码（推荐有经验的）
1. 浏览 FRONTEND_CODE_REFERENCE.md 快速查找表
2. 参考相关代码示例直接开始编码
3. 遇到不清楚的细节再查看 FRONTEND_UI_STRUCTURE.md

### 路径 3：深入研究某个组件
1. 在本索引中找到组件所在的文档位置
2. 查看对应的 FRONTEND_UI_STRUCTURE.md 章节
3. 查看 FRONTEND_LAYOUT_DIAGRAM.md 中的结构图
4. 查看源代码了解实现细节
5. 查看 FRONTEND_CODE_REFERENCE.md 学习用法

---

## 📞 快速问题解答

**Q: 卡牌为什么是 88×110？**
A: 这是设计师在 960×600 屏幕上为 10 格棋盘选定的尺寸。934px 宽的 10 格棋盘（含间距）在 928px 内容区内有 94px 的余量。

**Q: 为什么有 4 层布局？**
A: 设计模式：Z1 操作栏（固定）→ Z2 动态内容（变化频繁）→ Z3 棋盘（核心交互）→ Z4 信息栏（固定）。这样的分层便于管理和交互。

**Q: 拖拽时的卖出判断是什么原理？**
A: 在 MainScene/ShopScene 中监听 BoardRow 的 `onDragging` 回调，根据全局 Y 坐标判断是否超过各区域的上边界，动态显示卖出遮罩。超过 Z3_Y 时卖出。

**Q: 战斗中浮动文字如何实现？**
A: BattleScene 有一个 floatLayer (Container)，每个事件生成一个 Text 节点，用 requestAnimationFrame 做 800ms 的动画（上移+淡出）然后销毁。

**Q: 为什么商店卡牌比棋盘卡牌高？**
A: ShopCardView 需要显示完整的商品信息（名称、图片、价格、按钮），所以设计成 212px 高。而棋盘卡牌只需要显示快速信息（名称、端口），所以是 110px。

---

## 📄 文档许可

这些文档是对 AutoCard 前端代码的分析和总结，仅供开发参考。

