#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
游戏卡牌YML文件解析脚本
从YML目录读取卡牌信息文件并导出为JSON格式
参考 extract_card_info.py 的逻辑进行深度解析
"""

import os
import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional


class CardYMLParser:
    """卡牌YML解析器"""

    def __init__(self, yml_dir: str = "yml"):
        self.yml_dir = Path(yml_dir)
        self.cards = []

    def parse_yml_file(self, file_path: Path) -> Dict[str, Any]:
        """
        解析单个YML文件，提取卡牌完整信息

        Args:
            file_path: YML文件路径

        Returns:
            包含卡牌信息的字典
        """
        print(f"  正在解析: {file_path.name}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                self.lines = f.readlines()
                self.content = ''.join(self.lines)
        except Exception as e:
            print(f"  ✗ 读取文件失败: {e}")
            return {}

        card_data = {
            'basic_info': {},
            'deep_mechanics': {'base': {}, 'enchantments': []},
            'enchantments': [],
            'merchants': [],
            'history': []
        }

        try:
            # 提取基本信息
            card_data['basic_info'] = self.extract_basic_info(file_path)

            # 提取深度机制
            card_data['deep_mechanics'] = self.extract_deep_mechanics()

            # 提取附魔信息
            card_data['enchantments'] = self.extract_enchantments()

            # 提取商人信息
            card_data['merchants'] = self.extract_merchants()

            # 提取历史记录
            card_data['history'] = self.extract_history()

            print(f"  ✓ 成功解析")

        except Exception as e:
            print(f"  ✗ 解析错误: {e}")
            import traceback
            traceback.print_exc()

        return card_data

    def extract_basic_info(self, file_path: Path) -> Dict[str, Any]:
        """提取基本卡牌信息"""
        card_info = {
            'name': file_path.stem,
            'name_en': None,
            'types': [],
            'cooldown': None,
            'damage': None,
            'effect': None,
            'tags': [],
            'cost': {},
            'value': {},
        }

        # 提取卡牌中文名 - 查找 heading level=1
        for i, line in enumerate(self.lines):
            if '[level=1]' in line and 'heading' in line:
                match = re.search(r'heading "([^"]+)" \[level=1\]', line)
                if match:
                    card_info['name'] = match.group(1)
                    break
            # 备用方案：面包屑导航
            if 100 < i < 150 and 'generic [ref=' in line and ']: ' in line:
                match = re.search(r'\]: (.+)', line)
                if match:
                    text = match.group(1).strip()
                    if text not in ['All', 'Items', 'Skills', 'Merchants', '›', 'Home'] and len(text) > 1:
                        if not card_info['name'] or card_info['name'] == file_path.stem:
                            card_info['name'] = text

        # 提取英文名 - 查找卡牌URL
        if card_info['name']:
            for i, line in enumerate(self.lines):
                if f'link "See details for {card_info["name"]}"' in line or \
                   f'link "{card_info["name"]}"' in line:
                    for j in range(i, min(i + 5, len(self.lines))):
                        if '/url: /card/' in self.lines[j]:
                            match = re.search(r'/card/[a-z0-9]+/([A-Za-z0-9\-]+)', self.lines[j])
                            if match:
                                card_info['name_en'] = match.group(1).replace('-', ' ')
                                break
                    if card_info['name_en']:
                        break

        # 提取类型 - 从描述中解析
        info_pattern = rf'{re.escape(card_info["name"])} is a (small|medium|large) ([\w\s]+) (item|skill)'
        match = re.search(info_pattern, self.content)
        if match:
            size = match.group(1)
            category = match.group(2).strip()
            card_type = match.group(3)

            card_info['types'].append(size.capitalize())
            if category and category != 'neutral':
                card_info['types'].append(category.capitalize())
            card_info['types'].append(card_type.capitalize())

        # 提取稀有度
        tier_match = re.search(r'starting tier is (\w+)', self.content)
        if tier_match:
            card_info['tier'] = tier_match.group(1)

        # 提取冷却时间 - 查找"秒"
        for i, line in enumerate(self.lines):
            if '秒' in line and i < 300:
                for j in range(max(0, i - 3), i + 1):
                    match = re.search(r'"(\d+\.?\d*)"', self.lines[j])
                    if match:
                        card_info['cooldown'] = float(match.group(1))
                        break
                if card_info['cooldown']:
                    break

        # 提取伤害值
        for i, line in enumerate(self.lines):
            if '伤害' in line and i < 300:
                match = re.search(r'造成(\d+)伤害', line)
                if not match:
                    match = re.search(r'(\d+)\s*伤害', line)
                if not match:
                    match = re.search(r'Damage.*?(\d+)', line)
                if match:
                    card_info['damage'] = int(match.group(1))
                    break

        # 提取效果描述
        effect_parts = []
        in_effect_section = False
        for i, line in enumerate(self.lines):
            if 100 < i < 250:
                if 'text:' in line and 'heading' not in line and 'link' not in line:
                    match = re.search(r'text: (.+)', line)
                    if match:
                        text = match.group(1).strip()
                        # 检查是否为效果文本
                        if any(c > '\u4e00' and c < '\u9fff' for c in text) or \
                           any(kw in text.lower() for kw in ['damage', 'when', 'trigger', 'gain', 'add']):
                            if text not in ['Info', 'Types', 'Tags', 'Cost', 'Value']:
                                effect_parts.append(text)
                                in_effect_section = True
                elif 'generic [ref=' in line and in_effect_section:
                    match = re.search(r'"([+\-]?\d+)"', line)
                    if match:
                        effect_parts.append(match.group(1))
            if 'Tags' in line and in_effect_section:
                break

        if effect_parts:
            card_info['effect'] = ' '.join(effect_parts)

        # 提取标签
        tags_section = False
        for i, line in enumerate(self.lines):
            if 'Tags' in line and 'generic [ref=' in line:
                tags_section = True
            if tags_section and 'link' in line:
                tag_match = re.search(r'link "([^"]+)"', line)
                if tag_match:
                    tag = tag_match.group(1)
                    if tag not in card_info['tags'] and tag not in ['Tags', 'Cost', 'Value']:
                        card_info['tags'].append(tag)
                if i + 1 < len(self.lines):
                    generic_match = re.search(r'generic.*: (.+)', self.lines[i + 1])
                    if generic_match:
                        tag = generic_match.group(1).strip()
                        if tag and tag not in card_info['tags'] and len(tag) > 1:
                            card_info['tags'].append(tag)
            if tags_section and 'Cost' in line:
                break

        # 提取购买价格
        for i, line in enumerate(self.lines):
            if 'Cost' in line and 'generic [ref=' in line:
                for j in range(i, min(i + 10, len(self.lines))):
                    gold_match = re.search(r'text: (\d+) » (\d+) » (\d+) gold', self.lines[j])
                    if gold_match:
                        card_info['cost'] = {
                            'silver': int(gold_match.group(1)),
                            'gold': int(gold_match.group(2)),
                            'diamond': int(gold_match.group(3))
                        }
                        break
                if card_info['cost']:
                    break

        # 提取出售价格
        for i, line in enumerate(self.lines):
            if 'Value' in line and 'generic [ref=' in line:
                for j in range(i, min(i + 10, len(self.lines))):
                    gold_match = re.search(r'text: (\d+) » (\d+) » (\d+) gold', self.lines[j])
                    if gold_match:
                        card_info['value'] = {
                            'silver': int(gold_match.group(1)),
                            'gold': int(gold_match.group(2)),
                            'diamond': int(gold_match.group(3))
                        }
                        break
                if card_info['value']:
                    break

        return card_info

    def extract_deep_mechanics(self) -> Dict[str, Any]:
        """提取深度机制属性"""
        mechanics = {
            'base': {},
            'enchantments': []
        }

        # 查找 Deep Mechanics 部分
        in_mechanics_section = False
        for i, line in enumerate(self.lines):
            if 'Deep Mechanics' in line and 'heading' in line:
                in_mechanics_section = True
                continue

            if in_mechanics_section:
                # 查找属性表格
                if 'table [ref=' in line:
                    # 解析表头，找出列名（Silver, Gold, Diamond 或 Diamond, Legendary等）
                    tier_columns = []
                    for j in range(i + 1, min(i + 20, len(self.lines))):
                        if 'columnheader' in self.lines[j]:
                            match = re.search(r'columnheader "([^"]+)"', self.lines[j])
                            if match:
                                header = match.group(1)
                                if header != 'Attribute':
                                    tier_columns.append(header)
                        elif 'row' in self.lines[j] and tier_columns:
                            break

                    # 解析数据行
                    for j in range(i + 1, min(i + 200, len(self.lines))):
                        if 'row "' in self.lines[j]:
                            # 提取row内的所有cell数据
                            cells = []
                            row_match = re.search(r'row "([^"]+)"', self.lines[j])
                            if row_match:
                                row_data = row_match.group(1).split()
                                if len(row_data) >= 2:
                                    attr_name = row_data[0]
                                    values = row_data[1:]

                                    if len(values) == len(tier_columns):
                                        mechanics['base'][attr_name] = {}
                                        for k, tier in enumerate(tier_columns):
                                            mechanics['base'][attr_name][tier] = self.parse_number(values[k])

                        # 到达附魔部分就停止
                        if 'heading' in self.lines[j] and '[level=3]' in self.lines[j]:
                            break
                    break

        return mechanics

    def extract_enchantments(self) -> List[Dict[str, Any]]:
        """提取附魔信息"""
        enchantments = []

        # 常见附魔名称
        enchantment_patterns = [
            '沉重', '黄金', '寒冰', '疾速', '护盾', '回复', '毒素', '炽焰',
            '闪亮', '致命', '辉耀', '黑曜石',
            'Heavy', 'Golden', 'Icy', 'Turbo', 'Shield', 'Regenerative',
            'Toxic', 'Fiery', 'Shiny', 'Deadly', 'Radiant', 'Obsidian'
        ]

        for enchant_name in enchantment_patterns:
            # 查找附魔章节标题
            for i, line in enumerate(self.lines):
                if f'{enchant_name}' in line and 'heading' in line and '[level=3]' in line:
                    enchant_data = {
                        'name': enchant_name,
                        'tooltip': None,
                        'tags': [],
                        'attributes': {}
                    }

                    # 提取tooltip
                    for j in range(i, min(i + 50, len(self.lines))):
                        if 'Tooltip' in self.lines[j]:
                            for k in range(j + 1, min(j + 10, len(self.lines))):
                                if 'generic [ref=' in self.lines[k]:
                                    match = re.search(r'generic.*: (.+)', self.lines[k])
                                    if match:
                                        text = match.group(1).strip()
                                        if text and text not in ['Tooltip', 'Tags']:
                                            enchant_data['tooltip'] = text
                                            break
                            break

                    # 提取标签
                    for j in range(i, min(i + 50, len(self.lines))):
                        if 'Tags' in self.lines[j]:
                            for k in range(j, min(j + 15, len(self.lines))):
                                tag_match = re.search(r'link "([^"]+)"', self.lines[k])
                                if tag_match:
                                    tag = tag_match.group(1)
                                    if tag not in ['Tags', 'Tooltip'] and tag not in enchant_data['tags']:
                                        enchant_data['tags'].append(tag)
                            break

                    # 提取属性表格
                    for j in range(i, min(i + 100, len(self.lines))):
                        if 'table [ref=' in self.lines[j]:
                            # 解析属性行
                            for k in range(j, min(j + 100, len(self.lines))):
                                if 'row "' in self.lines[k]:
                                    row_match = re.search(r'row "([^"]+)"', self.lines[k])
                                    if row_match:
                                        row_data = row_match.group(1).split()
                                        if len(row_data) >= 4 and row_data[0] != 'Attribute':
                                            attr_name = row_data[0]
                                            enchant_data['attributes'][attr_name] = {
                                                'silver': self.parse_number(row_data[1]),
                                                'gold': self.parse_number(row_data[2]),
                                                'diamond': self.parse_number(row_data[3])
                                            }

                                # 下一个heading表示结束
                                if k > j + 5 and 'heading' in self.lines[k] and '[level=3]' in self.lines[k]:
                                    break
                            break

                    if enchant_data['tooltip'] or enchant_data['attributes']:
                        enchantments.append(enchant_data)
                    break

        return enchantments

    def extract_merchants(self) -> List[str]:
        """提取商人池信息"""
        merchants = []

        for i, line in enumerate(self.lines):
            if 'Merchant Pools' in line:
                for j in range(i, min(i + 200, len(self.lines))):
                    if 'link' in self.lines[j] and 'cursor=pointer' in self.lines[j]:
                        for k in range(j, min(j + 3, len(self.lines))):
                            match = re.search(r'generic.*: (.+)', self.lines[k])
                            if match:
                                merchant = match.group(1).strip()
                                if merchant and len(merchant) > 1 and merchant not in merchants:
                                    # 排除非商人名称
                                    if merchant not in ['Runs', 'History', 'All', 'Items']:
                                        merchants.append(merchant)

                    if 'heading' in self.lines[j] and ('Runs' in self.lines[j] or 'History' in self.lines[j]):
                        break
                break

        return merchants

    def extract_history(self) -> List[Dict[str, Any]]:
        """提取补丁历史"""
        history = []

        for i, line in enumerate(self.lines):
            if 'heading' in line and 'History' in line:
                for j in range(i, min(i + 500, len(self.lines))):
                    version_match = re.search(r'heading "([\d.]+(?:\s+Hotfix#\d+)?)"', self.lines[j])
                    if version_match:
                        version = version_match.group(1)

                        # 提取日期
                        date = None
                        for k in range(j, min(j + 5, len(self.lines))):
                            date_match = re.search(r'generic.*: ((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+,?\s+\d+)', self.lines[k])
                            if date_match:
                                date = date_match.group(1).strip()
                                break

                        history.append({
                            'version': version,
                            'date': date
                        })
                break

        return history

    def parse_number(self, value: str) -> Any:
        """解析数字字符串为int或float"""
        try:
            if '.' in value:
                return float(value)
            return int(value)
        except (ValueError, AttributeError):
            return value

    def parse_all_files(self) -> List[Dict[str, Any]]:
        """解析YML目录下的所有文件"""
        if not self.yml_dir.exists():
            print(f"错误: 目录 {self.yml_dir} 不存在")
            return []

        yml_files = list(self.yml_dir.glob("*.yml"))

        if not yml_files:
            print(f"警告: 在 {self.yml_dir} 中没有找到YML文件")
            return []

        print(f"\n找到 {len(yml_files)} 个YML文件")
        print("-" * 60)

        for yml_file in yml_files:
            card_info = self.parse_yml_file(yml_file)
            if card_info:
                self.cards.append(card_info)

        return self.cards

    def export_to_json(self, output_file: str = "cards_data.json", indent: int = 2):
        """导出卡牌信息到JSON文件"""
        if not self.cards:
            print("警告: 没有卡牌数据可导出")
            return

        output_path = Path(output_file)

        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(
                    self.cards,
                    f,
                    ensure_ascii=False,
                    indent=indent
                )

            print(f"\n成功导出 {len(self.cards)} 张卡牌信息到: {output_path.absolute()}")
            print(f"文件大小: {output_path.stat().st_size / 1024:.2f} KB")

        except Exception as e:
            print(f"导出JSON文件时出错: {e}")

    def print_summary(self):
        """打印解析结果摘要"""
        if not self.cards:
            print("没有卡牌数据")
            return

        print("\n" + "=" * 60)
        print("卡牌解析摘要")
        print("=" * 60)
        print(f"总卡牌数: {len(self.cards)}\n")

        for card in self.cards:
            basic = card.get('basic_info', {})
            print(f"【{basic.get('name', 'Unknown')}】")
            if basic.get('name_en'):
                print(f"  英文名: {basic['name_en']}")
            if basic.get('types'):
                print(f"  类型: {', '.join(basic['types'])}")
            if basic.get('tier'):
                print(f"  稀有度: {basic['tier']}")
            if basic.get('cooldown'):
                print(f"  冷却: {basic['cooldown']}秒")
            if basic.get('damage'):
                print(f"  伤害: {basic['damage']}")
            if basic.get('effect'):
                effect = basic['effect'][:80] + '...' if len(basic.get('effect', '')) > 80 else basic.get('effect', '')
                print(f"  效果: {effect}")
            if basic.get('tags'):
                print(f"  标签: {', '.join(basic['tags'])}")

            deep_mech = card.get('deep_mechanics', {})
            if deep_mech.get('base'):
                print(f"  基础属性: {len(deep_mech['base'])} 个")

            enchants = card.get('enchantments', [])
            if enchants:
                print(f"  附魔: {len(enchants)} 个")

            merchants = card.get('merchants', [])
            if merchants:
                print(f"  商人: {', '.join(merchants)}")

            history = card.get('history', [])
            if history:
                print(f"  历史版本: {len(history)} 个")

            print()

        print("=" * 60)


def main():
    """主函数"""
    print("=" * 60)
    print("游戏卡牌YML深度解析工具")
    print("=" * 60)

    # 创建解析器实例
    parser = CardYMLParser(yml_dir="yml")

    # 解析所有YML文件
    cards = parser.parse_all_files()

    if cards:
        # 打印摘要
        parser.print_summary()

        # 导出为JSON
        parser.export_to_json(output_file="cards_data.json", indent=2)

        print("\n✓ 解析完成!")
    else:
        print("\n✗ 没有解析到任何卡牌数据")


if __name__ == "__main__":
    main()
