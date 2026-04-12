# AutoCard 大巴扎系统 文档

这个目录包含了关于 AutoCard 项目大巴扎（商店）系统的完整分析文档。

## 📚 文档列表

### 1. [autocard_bazaar_report.md](./autocard_bazaar_report.md) - 📖 主要分析报告
最全面的项目文档，包含：
- 项目概览和统计数据
- 完整的文件结构
- 卡牌配置数据结构
- CardView 卡牌渲染系统详解
- 布局常量和颜色系统
- 配置示例
- 数据加载流程

**适合**: 第一次了解项目时阅读

---

### 2. [autocard_code_reference.md](./autocard_code_reference.md) - 💻 代码参考手册
包含完整的源代码和实现细节：
- CardView.ts 完整源码 (注释详细)
- ShopCardView 商店卡牌类
- layout.ts 布局系统完整代码
- bazaar_items.ts 配置示例
- BattleCardView.ts 战斗卡牌代码
- 数据流示意图

**适合**: 需要修改代码时查看

---

### 3. [autocard_file_list.txt](./autocard_file_list.txt) - 📋 文件清单
快速参考和导航：
- 核心文件列表
- UI 组件文件
- 场景和 API 文件
- 图片资源统计
- 数据结构速查
- 快速导航

**适合**: 快速查找文件位置

---

## 🎯 快速开始

### 我想...

#### 🖼️ 添加一张新卡牌
1. 打开 `/server/src/game/config/bazaar_items.ts`
2. 添加新的 ItemConfig 对象到 BAZAAR_ITEMS 数组
3. (可选) 在 `/client/public/assets/cards/` 添加 WebP 图片
4. 在 ItemConfig 中设置 `image` 字段

参考: [autocard_bazaar_report.md](./autocard_bazaar_report.md#%E9%85%8D%E7%BD%AE%E7%A4%BA%E4%BE%8B) 中的配置示例

#### 🎨 修改卡牌样式
1. 编辑 `/client/src/ui/CardView.ts` 的 `draw()` 方法
2. 或编辑 `/client/src/ui/layout.ts` 的颜色/尺寸常量

参考: [autocard_code_reference.md](./autocard_code_reference.md) 中的完整源码

#### 📐 调整布局
1. 编辑 `/client/src/ui/layout.ts`
2. 修改 Zone1-Zone4 的 Y 和 H 值
3. 或修改 CARD_UNIT, CARD_GAP, CARD_H

参考: [autocard_code_reference.md](./autocard_code_reference.md#layoutts--完整布局系统)

#### 🔍 查看文件位置
查看 [autocard_file_list.txt](./autocard_file_list.txt)

---

## 📊 关键数据

| 项目 | 数值 |
|------|------|
| 卡牌总数 | 991 张 |
| 配置了图片的卡牌 | 856 张 (86.4%) |
| 卡牌图片文件 | 852 张 WebP |
| 配置文件大小 | 498 KB (24,629 行) |
| 英雄数量 | 6 个 |
| 稀有度等级 | 5 种 |
| 卡牌尺寸 | 3 种 (1/2/3 格) |

---

## 🔧 核心技术

- **渲染库**: Pixi.js (WebGL 2D)
- **图片格式**: WebP (高效压缩)
- **图片加载**: 异步加载 + 内存缓存
- **布局**: 屏幕 4 区分 + 响应式设计
- **缩放**: 自适应缩放保持宽高比

---

## 📝 英雄分布

| 英雄 | 卡牌数 |
|------|--------|
| dooley | 135 |
| pygmalien | 133 |
| mak | 128 |
| vanessa | 126 |
| jules | 116 |
| stelle | 110 |
| **总计** | **991** |

---

## 🚀 优化建议

### 立即可用
✓ CardView 类已优化，性能良好
✓ 图片缓存机制完整
✓ 异步加载不阻塞 UI

### 进一步优化
1. 商店打开时预加载卡牌图片
2. 使用对象池减少 GC 压力
3. 添加卡牌动画效果
4. 支持多分辨率图片

---

## 🎯 文件导航速查

| 功能 | 文件位置 |
|------|---------|
| 修改卡牌配置 | `/server/src/game/config/bazaar_items.ts` |
| 修改卡牌外观 | `/client/src/ui/CardView.ts` |
| 修改布局 | `/client/src/ui/layout.ts` |
| 添加图片 | `/client/public/assets/cards/` |
| 商店场景 | `/client/src/scenes/ShopScene.ts` |
| 游戏状态 | `/client/src/core/GameState.ts` |

---

## 💡 常见问题

**Q: 如何添加新图片？**
A: 将 WebP 图片放在 `/client/public/assets/cards/`，然后在 ItemConfig 中设置 `image: '/assets/cards/xxx.webp'`

**Q: 卡牌会重复加载图片吗？**
A: 不会，CardView 使用 `imageCache` Map 缓存已加载的纹理

**Q: 卡牌尺寸如何计算？**
A: `cardWidth = 88 * size + 6 * (size - 1)`，即：
- size 1: 88px
- size 2: 182px
- size 3: 276px

**Q: 如何修改卡牌颜色？**
A: 编辑 `/client/src/ui/layout.ts` 中的 `TIER_COLORS` 和 `TIER_BG` 对象

---

生成时间: 2026-04-12
