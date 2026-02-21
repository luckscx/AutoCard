# AutoCard - Card Information Extraction Tool

这个项目包含一个Python脚本，可以从markdown格式的accessibility tree中提取卡牌信息并转换为JSON格式。

## 目录结构

```
AutoCard/
├── tool/
│   └── extract_card_info.py    # 卡牌信息提取脚本
├── docs/                        # 存放markdown文件和输出的JSON文件
│   ├── 盐钳海盗_card_page.md     # 示例markdown文件
│   ├── 盐钳海盗_card_data.json   # 示例输出JSON文件
│   └── 盐钳海盗_card_screenshot.png  # 卡牌截图
└── README.md                    # 本文档
```

## 使用方法

### 基本用法

```bash
# 提取卡牌信息（自动生成输出文件名）
python3 tool/extract_card_info.py <markdown_file>

# 指定输出文件名
python3 tool/extract_card_info.py <markdown_file> <output_json_file>
```

### 示例

```bash
# 自动生成输出文件名为 docs/盐钳海盗_card_page_data.json
python3 tool/extract_card_info.py docs/盐钳海盗_card_page.md

# 指定输出文件名
python3 tool/extract_card_info.py docs/盐钳海盗_card_page.md docs/card_output.json
```

## 提取的信息

脚本会从markdown文件中提取以下卡牌详细信息：

### 基础信息 (basic_info)
- **name** - 卡牌中文名称
- **name_en** - 卡牌英文名称
- **types** - 卡牌类型（如：Aquatic, Friend, Weapon）
- **cooldown** - 冷却时间（秒）
- **damage** - 伤害值
- **effect** - 效果描述
- **tags** - 标签列表（如：Silver+, Item, Small, Vanessa, Damage, HasteReference, SlowReference）
- **cost** - 购买成本（Silver, Gold, Diamond三个等级）
- **value** - 出售价值（Silver, Gold, Diamond三个等级）

### 深度机制 (deep_mechanics)
- **base** - 基础属性数据
- **enchantments** - 附魔相关机制

### 附魔信息 (enchantments) - 12种附魔
每个附魔包含：
- **name** - 中文名称
- **name_en** - 英文名称
- **tooltip** - 提示信息
- **tags** - 相关标签
- **attributes** - 属性值（Silver, Gold, Diamond三个等级）

支持的附魔类型：
1. 沉重 (Heavy) - 减速物品
2. 黄金 (Golden) - 价值翻倍
3. 寒冰 (Icy) - 冻结物品
4. 疾速 (Turbo) - 加速物品
5. 护盾 (Shield) - 获得护盾
6. 回复 (Regenerative) - 获得治疗
7. 毒素 (Toxic) - 施加剧毒
8. 炽焰 (Fiery) - 施加灼烧
9. 闪亮 (Shiny) - +1多重触发
10. 致命 (Deadly) - +50%暴击率
11. 辉耀 (Radiant) - 免疫冻结、减速和摧毁
12. 黑曜石 (Obsidian) - 伤害翻倍

### 商人信息 (merchants)
可以购买该卡牌的商人列表

### 版本历史 (history)
包含版本号和更新日期的补丁历史记录

## 输出格式

提取的数据以JSON格式保存，使用UTF-8编码，支持中文字符：

```json
{
  "basic_info": {
    "name": "盐钳海盗",
    "name_en": "Old Saltclaw",
    "types": ["Aquatic", "Friend", "Weapon"],
    "cooldown": 6.0,
    "damage": 30,
    "effect": "触发加速或减速时，此物品伤害提高 +5 +10 +15 （限本场战斗）。",
    "tags": ["Silver+", "Item", "Small", "Vanessa", "Damage", "HasteReference", "SlowReference"],
    "cost": {"silver": 4, "gold": 8, "diamond": 16},
    "value": {"silver": 2, "gold": 4, "diamond": 8}
  },
  "deep_mechanics": {...},
  "enchantments": [...],
  "merchants": [...],
  "history": [...]
}
```

## 示例：盐钳海盗 (Old Saltclaw)

- **类型**: Aquatic Friend Weapon
- **冷却**: 6.0秒
- **伤害**: 30
- **效果**: 触发加速或减速时，此物品伤害提高 +5 » +10 » +15（限本场战斗）
- **成本**: 4 » 8 » 16 金币
- **价值**: 2 » 4 » 8 金币

## 技术细节

- 脚本使用正则表达式和逐行解析来提取结构化数据
- 支持accessibility tree格式的markdown文件
- JSON输出使用`ensure_ascii=False`以正确显示中文字符
- 数值类型自动识别（整数/浮点数）
- 提取逻辑不依赖硬编码的行号，具有较好的通用性

## 依赖

- Python 3.6+
- 标准库：json, re, sys, os, pathlib

无需安装第三方依赖包。

## 注意事项

1. 输入文件必须是accessibility tree格式的markdown文件
2. 如果未指定输出文件名，会自动在输入文件同目录下生成`<输入文件名>_data.json`
3. 脚本会尝试智能识别卡牌信息，但某些特殊格式可能需要手动调整
