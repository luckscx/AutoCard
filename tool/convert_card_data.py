#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
卡牌数据转换脚本
从 tool/down_card_db/ 读取数据并整合到游戏项目中
"""

import json
import os
import shutil
import re
from pathlib import Path


def sanitize_filename(name):
    """清理文件名中的特殊字符"""
    return re.sub(r'[<>:"/\\|?*]', '_', name)


def convert_tier(tier_str):
    """转换稀有度字符串"""
    if not tier_str:
        return 'bronze'
    tier_map = {
        'Bronze': 'bronze',
        'Silver': 'silver',
        'Gold': 'gold',
        'Diamond': 'diamond',
        'Legendary': 'legendary'
    }
    return tier_map.get(tier_str, 'bronze')


def convert_size(type_list):
    """从types中转换size"""
    if 'Small' in type_list:
        return 1
    elif 'Medium' in type_list:
        return 2
    elif 'Large' in type_list:
        return 3
    return 1


def get_source_hero(tags):
    """从tags中获取英雄来源"""
    hero_map = {
        'Vanessa': 'vanessa',
        'Mak': 'mak',
        'Jules': 'jules',
        'Pygmalien': 'pygmalien',
        'Dooley': 'dooley',
        'Stelle': 'stelle',
    }
    for tag in tags:
        if tag in hero_map:
            return hero_map[tag]
    return None


def convert_port_type(effect, tags, damage):
    """根据效果和标签推断端口类型"""
    ports = []

    # 先检查标签
    tag_port_map = {
        'Damage': ('output', 'damage', damage if damage else 10),
        'Poison': ('output', 'poison', 5),
        'Burn': ('output', 'burn', 5),
        'Heal': ('defense', 'heal', 10),
        'Regen': ('defense', 'heal', 5),
        'Shield': ('defense', 'shield', 10),
        'Haste': ('operational', 'haste', 1),
        'Slow': ('operational', 'slow', 1),
        'Freeze': ('operational', 'freeze', 1),
        'Charge': ('operational', 'charge', 1),
    }

    for tag, (cat, ptype, val) in tag_port_map.items():
        if tag in tags:
            # 如果有damage值且是damage类型，使用damage值
            if tag == 'Damage' and damage:
                val = damage
            ports.append({'category': cat, 'type': ptype, 'value': val})

    # 如果没有从标签找到，尝试从效果推断
    if not ports:
        if damage:
            ports.append({'category': 'output', 'type': 'damage', 'value': damage})
        else:
            # 默认给一个基础端口
            ports.append({'category': 'output', 'type': 'damage', 'value': 5})

    return ports


def main():
    """主函数"""
    print("=" * 60)
    print("卡牌数据转换工具")
    print("=" * 60)

    # 路径设置
    project_root = Path(__file__).parent.parent
    tool_dir = project_root / "tool"
    down_card_db_dir = tool_dir / "down_card_db"
    cards_data_path = down_card_db_dir / "cards_data.json"
    images_src_dir = down_card_db_dir / "images"
    images_dest_dir = project_root / "client" / "public" / "assets" / "cards"

    # 确保目标目录存在
    images_dest_dir.mkdir(parents=True, exist_ok=True)

    # 读取卡牌数据
    if not cards_data_path.exists():
        print(f"错误: 文件不存在 {cards_data_path}")
        return

    with open(cards_data_path, 'r', encoding='utf-8') as f:
        card_data_list = json.load(f)

    print(f"\n读取到 {len(card_data_list)} 张卡牌数据\n")

    # 复制图片文件并生成配置
    items_config = []
    image_count = 0

    for card_data in card_data_list:
        name = card_data.get('name', 'Unknown')
        name_en = card_data.get('name_en')
        types = card_data.get('types', [])
        tags = card_data.get('tags', [])
        tier = card_data.get('tier')
        cooldown = card_data.get('cooldown', 3)
        damage = card_data.get('damage')
        effect = card_data.get('effect', '')
        cost = card_data.get('cost', {})

        # 生成itemId
        item_id = re.sub(r'\s+', '_', name.lower())
        item_id = re.sub(r'[^\w]', '', item_id)

        # 查找图片文件
        image_filename = None
        # 尝试可能的图片文件名
        possible_names = [name]
        if name_en:
            possible_names.append(name_en)
            possible_names.append(name_en.replace(' ', '-'))

        for img_name in possible_names:
            for ext in ['.webp', '.jpg', '.jpeg', '.png']:
                src_path = images_src_dir / (sanitize_filename(img_name) + ext)
                if src_path.exists():
                    image_filename = sanitize_filename(img_name) + ext
                    break
            if image_filename:
                break

        # 复制图片
        if image_filename:
            src_path = images_src_dir / image_filename
            dest_path = images_dest_dir / image_filename
            if not dest_path.exists():
                shutil.copy2(src_path, dest_path)
            image_count += 1

        # 生成配置
        size = convert_size(types)
        base_tier = convert_tier(tier)
        price = cost.get('silver', 3)  # 默认价格
        source_hero = get_source_hero(tags)

        # 处理描述
        description = effect or f"{name} 卡牌"
        # 清理描述中的英文前缀
        if ' is a ' in description:
            description = description.split(' is a ')[0]
        if '. Its starting tier is' in description:
            description = description.split('. Its starting tier is')[0]

        # 生成端口
        ports = convert_port_type(effect, tags, damage)

        # 生成分类标签
        categories = []
        for t in types:
            if t not in ['Small', 'Medium', 'Large', 'Item']:
                categories.append(t)

        item_config = {
            'itemId': item_id,
            'name': name,
            'nameEn': name_en,
            'description': description,
            'size': size,
            'baseTier': base_tier,
            'price': price,
            'cooldown': cooldown if cooldown else 3,
            'ports': ports,
            'targetRule': {'kind': 'self'},
            'tags': tags,
            'categories': categories,
        }

        if source_hero:
            item_config['sourceHero'] = source_hero

        if image_filename:
            item_config['image'] = f"/assets/cards/{image_filename}"

        items_config.append(item_config)
        print(f"  ✓ {name} {'(+image)' if image_filename else ''}")

    # 生成 TypeScript 文件
    output_ts_path = project_root / "server" / "src" / "game" / "config" / "bazaar_items.ts"

    ts_content = '''import type { ItemConfig } from '@autocard/shared';

// 从 BazaarDB 导入的卡牌数据
export const BAZAAR_ITEMS: ItemConfig[] = [
'''

    for item in items_config:
        ts_content += f"  {{\n"
        ts_content += f"    itemId: '{item['itemId']}',\n"
        ts_content += f"    name: '{item['name']}',\n"
        if item.get('nameEn'):
            ts_content += f"    nameEn: '{item['nameEn']}',\n"

        # 转义描述中的单引号
        desc = item['description'].replace("'", "\\'")
        ts_content += f"    description: '{desc}',\n"
        ts_content += f"    size: {item['size']},\n"
        ts_content += f"    baseTier: '{item['baseTier']}',\n"
        ts_content += f"    price: {item['price']},\n"
        ts_content += f"    cooldown: {item['cooldown']},\n"

        # ports
        ts_content += f"    ports: [\n"
        for port in item['ports']:
            ts_content += f"      {{ category: '{port['category']}', type: '{port['type']}', value: {port['value']} }},\n"
        ts_content += f"    ],\n"

        # targetRule
        ts_content += f"    targetRule: {{ kind: '{item['targetRule']['kind']}' }},\n"

        # tags
        ts_content += f"    tags: [\n"
        for tag in item['tags']:
            ts_content += f"      '{tag}',\n"
        ts_content += f"    ],\n"

        # categories
        if item.get('categories'):
            ts_content += f"    categories: [\n"
            for cat in item['categories']:
                ts_content += f"      '{cat}',\n"
            ts_content += f"    ],\n"

        if item.get('sourceHero'):
            ts_content += f"    sourceHero: '{item['sourceHero']}',\n"

        if item.get('image'):
            ts_content += f"    image: '{item['image']}',\n"

        ts_content += f"  }},\n"

    ts_content += '''
];

export const BAZAAR_ITEMS_MAP = new Map(BAZAAR_ITEMS.map(i => [i.itemId, i]));
'''

    with open(output_ts_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

    print("\n" + "=" * 60)
    print("转换完成!")
    print(f"  处理卡牌数: {len(items_config)}")
    print(f"  复制图片数: {image_count}")
    print(f"  输出文件: {output_ts_path}")
    print(f"  图片目录: {images_dest_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
