#!/usr/bin/env python3
"""
Script to extract card information from markdown accessibility tree format
and convert it to JSON.

Usage:
    python3 extract_card_info.py <markdown_file> [output_json_file]

Examples:
    python3 extract_card_info.py docs/盐钳海盗_card_page.md
    python3 extract_card_info.py docs/card_page.md docs/card_data.json
"""

import json
import re
import sys
import os
from typing import Dict, List, Any, Optional
from pathlib import Path


class CardExtractor:
    def __init__(self, md_file_path: str):
        self.md_file_path = md_file_path
        self.lines = []
        self.card_data = {}

    def load_file(self):
        """Load the markdown file."""
        with open(self.md_file_path, 'r', encoding='utf-8') as f:
            self.lines = f.readlines()

    def extract_text_value(self, start_line: int, search_pattern: str) -> Optional[str]:
        """Extract text value after a pattern in subsequent lines."""
        for i in range(start_line, min(start_line + 20, len(self.lines))):
            line = self.lines[i].strip()
            if 'text:' in line:
                match = re.search(r'text:\s*(.+)', line)
                if match:
                    return match.group(1).strip()
        return None

    def extract_basic_info(self):
        """Extract basic card information like name, types, cooldown, damage."""
        card_info = {
            'name': None,
            'name_en': None,
            'types': [],
            'cooldown': None,
            'damage': None,
            'effect': None,
            'tags': [],
            'cost': {},
            'value': {},
        }

        # Extract card name (Chinese) - look for heading level=1
        for i, line in enumerate(self.lines):
            if '[level=1]' in line and 'heading' in line:
                # Extract the card name from the heading
                match = re.search(r'heading\s+"([^"]+)"\s+\[level=1\]', line)
                if match:
                    card_info['name'] = match.group(1)
                    break
            # Fallback: look for breadcrumb navigation (around line 110)
            if i > 100 and i < 120 and 'generic [ref=' in line and ']:' in line:
                match = re.search(r'\]:\s*(.+)', line)
                if match:
                    text = match.group(1).strip()
                    # Skip common navigation words
                    if text not in ['All', 'Items', 'Skills', 'Merchants', '›'] and len(text) > 1:
                        if not card_info['name']:
                            card_info['name'] = text

        # Extract English name - look for the card's URL with English name
        # Look for pattern like: link "See details for 盐钳海盗" followed by /url: /card/.../English-Name
        if card_info['name']:
            for i, line in enumerate(self.lines):
                if f'link "See details for {card_info["name"]}"' in line or f'link "{card_info["name"]}"' in line:
                    # Check next few lines for the URL
                    for j in range(i, min(i + 5, len(self.lines))):
                        if '/url: /card/' in self.lines[j]:
                            match = re.search(r'/card/[a-z0-9]+/([A-Za-z\-]+)', self.lines[j])
                            if match:
                                card_info['name_en'] = match.group(1).replace('-', ' ')
                                break
                    if card_info['name_en']:
                        break

        # Fallback: look for info section description
        if not card_info['name_en'] and card_info['name']:
            for i, line in enumerate(self.lines):
                # Pattern like: "盐钳海盗 is a small Vanessa item"
                if card_info['name'] in line and 'is a' in line:
                    # Look nearby for card URLs
                    for j in range(max(0, i - 10), min(i + 10, len(self.lines))):
                        if '/url: /card/' in self.lines[j]:
                            match = re.search(r'/card/[a-z0-9]+/([A-Za-z\-]+)', self.lines[j])
                            if match:
                                name_candidate = match.group(1).replace('-', ' ')
                                # Verify it's not a merchant name
                                if name_candidate not in ['Midsworth', 'Aila', 'Nautica', 'Cobweb', 'Chronos']:
                                    card_info['name_en'] = name_candidate
                                    break
                    if card_info['name_en']:
                        break

        # Extract types - look for "Types" section and nearby links
        types_list = ['Aquatic', 'Friend', 'Weapon', 'Tool', 'Shield', 'Monster',
                      'Boss', 'Event', 'Skill', 'Passive', 'Active', 'Core', 'Non-Core',
                      'Small', 'Medium', 'Large']
        types_section = False
        for i, line in enumerate(self.lines):
            if 'generic [ref=' in line and ']:' in line and 'Types' in line:
                types_section = True
            if types_section and 'link' in line:
                for card_type in types_list:
                    if f'link "{card_type}"' in line:
                        if card_type not in card_info['types']:
                            card_info['types'].append(card_type)
                    # Also check next line for type name
                    elif i + 1 < len(self.lines):
                        if f': {card_type}' in self.lines[i + 1]:
                            if card_type not in card_info['types']:
                                card_info['types'].append(card_type)
            # Stop when we reach cooldown or cost section
            if types_section and ('秒' in line or 'Cost' in line or 'gold' in line):
                break

        # Extract cooldown - look for "秒" (second) pattern
        for i, line in enumerate(self.lines):
            if '秒' in line and i < 300:
                # Look backward for the number
                for j in range(max(0, i - 3), i + 1):
                    match = re.search(r'"(\d+\.?\d*)"', self.lines[j])
                    if match:
                        card_info['cooldown'] = float(match.group(1))
                        break
                if card_info['cooldown']:
                    break

        # Extract damage - look for "造成...伤害" pattern
        for i, line in enumerate(self.lines):
            if '伤害' in line and i < 300:
                # Try different damage patterns
                match = re.search(r'造成(\d+)伤害', line)
                if not match:
                    match = re.search(r'(\d+)\s*伤害', line)
                if not match:
                    match = re.search(r'Damage.*?(\d+)', line)
                if match:
                    card_info['damage'] = int(match.group(1))
                    break

        # Extract effect - look for effect description section
        effect_parts = []
        in_effect_section = False
        for i, line in enumerate(self.lines):
            # Detect effect section start (after damage, before tags)
            if i > 100 and i < 200 and ('text:' in line or 'generic [ref=' in line):
                # Skip navigation and headers
                if 'heading' not in line and 'link' not in line:
                    if 'text:' in line:
                        match = re.search(r'text:\s*(.+)', line)
                        if match:
                            text = match.group(1).strip()
                            # Check if it's effect text (contains Chinese or effect keywords)
                            if any(c > '\u4e00' and c < '\u9fff' for c in text) or any(kw in text for kw in ['Damage', 'when', 'trigger']):
                                effect_parts.append(text)
                                in_effect_section = True
                    elif 'generic [ref=' in line and in_effect_section:
                        match = re.search(r'"([+\-]?\d+)"', line)
                        if match:
                            effect_parts.append(match.group(1))
            # Stop at Tags section
            if 'Tags' in line and in_effect_section:
                break

        if effect_parts:
            card_info['effect'] = ' '.join(effect_parts)

        # Extract tags - look for Tags section
        tags_section = False
        for i, line in enumerate(self.lines):
            if 'Tags' in line and 'generic [ref=' in line:
                tags_section = True
            if tags_section and 'link' in line:
                # Extract tag name from link or next line
                tag_match = re.search(r'link\s+"([^"]+)"', line)
                if tag_match:
                    tag = tag_match.group(1)
                    if tag not in card_info['tags'] and tag != 'Tags':
                        card_info['tags'].append(tag)
                # Also check next line for tag name
                if i + 1 < len(self.lines):
                    generic_match = re.search(r'generic.*:\s*(.+)', self.lines[i + 1])
                    if generic_match:
                        tag = generic_match.group(1).strip()
                        if tag and tag not in card_info['tags'] and len(tag) > 1:
                            card_info['tags'].append(tag)
            # Stop at Cost section
            if tags_section and 'Cost' in line:
                break

        # Extract cost - look for Cost section with gold values
        for i, line in enumerate(self.lines):
            if 'Cost' in line and 'generic [ref=' in line:
                # Look in next few lines for the gold values
                for j in range(i, min(i + 10, len(self.lines))):
                    gold_match = re.search(r'text:\s*(\d+)\s*»\s*(\d+)\s*»\s*(\d+)\s*gold', self.lines[j])
                    if gold_match:
                        card_info['cost'] = {
                            'silver': int(gold_match.group(1)),
                            'gold': int(gold_match.group(2)),
                            'diamond': int(gold_match.group(3))
                        }
                        break
                if card_info['cost']:
                    break

        # Extract value - look for Value section with gold values
        for i, line in enumerate(self.lines):
            if 'Value' in line and 'generic [ref=' in line:
                # Look in next few lines for the gold values
                for j in range(i, min(i + 10, len(self.lines))):
                    gold_match = re.search(r'text:\s*(\d+)\s*»\s*(\d+)\s*»\s*(\d+)\s*gold', self.lines[j])
                    if gold_match:
                        card_info['value'] = {
                            'silver': int(gold_match.group(1)),
                            'gold': int(gold_match.group(2)),
                            'diamond': int(gold_match.group(3))
                        }
                        break
                if card_info['value']:
                    break

        self.card_data['basic_info'] = card_info

    def extract_deep_mechanics(self):
        """Extract deep mechanics attributes for Silver, Gold, Diamond tiers."""
        mechanics = {
            'base': {},
            'enchantments': []
        }

        # Extract base mechanics (without enchantments)
        in_base_section = False
        for i, line in enumerate(self.lines):
            if 'heading' in line and '盐钳海盗' in line and 'Deep' in self.lines[i - 1] if i > 0 else False:
                in_base_section = True

            if in_base_section and 'row' in line and 'ref=' in line:
                # Extract attribute rows from tables
                row_text = line
                for j in range(i + 1, min(i + 6, len(self.lines))):
                    if 'cell' in self.lines[j]:
                        row_text += ' ' + self.lines[j]

                # Parse attribute name and values
                attr_match = re.search(r'cell\s+"([^"]+)"', row_text)
                if attr_match:
                    attr_name = attr_match.group(1)
                    values = re.findall(r'cell\s+"(\d+\.?\d*)"', row_text)
                    if len(values) >= 3:
                        mechanics['base'][attr_name] = {
                            'silver': float(values[0]) if '.' in values[0] else int(values[0]),
                            'gold': float(values[1]) if '.' in values[1] else int(values[1]),
                            'diamond': float(values[2]) if '.' in values[2] else int(values[2])
                        }

            if in_base_section and '沉重' in line:  # First enchantment name
                break

        self.card_data['deep_mechanics'] = mechanics

    def extract_enchantments(self):
        """Extract enchantment information."""
        enchantments = []
        enchantment_names = ['沉重', '黄金', '寒冰', '疾速', '护盾', '回复', '毒素', '炽焰', '闪亮', '致命', '辉耀', '黑曜石']

        for enchant_name in enchantment_names:
            enchant_data = {
                'name': enchant_name,
                'name_en': self.get_enchant_english_name(enchant_name),
                'tooltip': None,
                'tags': [],
                'attributes': {}
            }

            # Find enchantment section
            for i, line in enumerate(self.lines):
                if f'{enchant_name} 盐钳海盗' in line:
                    # Extract tooltip
                    for j in range(i, min(i + 50, len(self.lines))):
                        if 'Tooltip' in self.lines[j]:
                            for k in range(j + 1, min(j + 10, len(self.lines))):
                                if 'generic [ref=' in self.lines[k] and 'text:' not in self.lines[k]:
                                    match = re.search(r'generic.*:\s*(.+)', self.lines[k])
                                    if match:
                                        enchant_data['tooltip'] = match.group(1).strip()
                                        break
                            break

                    # Extract tags
                    for j in range(i, min(i + 50, len(self.lines))):
                        if 'Tags' in self.lines[j]:
                            for k in range(j, min(j + 10, len(self.lines))):
                                if 'generic [ref=' in self.lines[k]:
                                    match = re.search(r'generic.*:\s*(.+)', self.lines[k])
                                    if match:
                                        tag = match.group(1).strip()
                                        if tag and tag not in ['Tags', 'Tooltip'] and len(tag) > 1:
                                            enchant_data['tags'].append(tag)
                            break

                    # Extract attribute table
                    for j in range(i, min(i + 100, len(self.lines))):
                        if 'table [ref=' in self.lines[j]:
                            # Parse table rows
                            for k in range(j, min(j + 50, len(self.lines))):
                                if 'row' in self.lines[k] and 'Attribute' not in self.lines[k]:
                                    row_text = self.lines[k]
                                    for m in range(k + 1, min(k + 6, len(self.lines))):
                                        if 'cell' in self.lines[m]:
                                            row_text += ' ' + self.lines[m]

                                    # Parse attribute
                                    cells = re.findall(r'cell\s+"([^"]+)"', row_text)
                                    if len(cells) >= 4:
                                        attr_name = cells[0]
                                        enchant_data['attributes'][attr_name] = {
                                            'silver': self.parse_number(cells[1]),
                                            'gold': self.parse_number(cells[2]),
                                            'diamond': self.parse_number(cells[3])
                                        }

                                if 'heading' in self.lines[k] and 'level=3' in self.lines[k]:
                                    # Reached next enchantment
                                    break
                            break

                    break

            enchantments.append(enchant_data)

        self.card_data['enchantments'] = enchantments

    def extract_merchants(self):
        """Extract merchant pool information."""
        merchants = []

        for i, line in enumerate(self.lines):
            if 'Merchant Pools' in line:
                # Extract merchant names
                for j in range(i, min(i + 200, len(self.lines))):
                    if 'link' in self.lines[j] and 'cursor=pointer' in self.lines[j]:
                        for k in range(j, min(j + 3, len(self.lines))):
                            if 'generic [ref=' in self.lines[k]:
                                match = re.search(r'generic.*:\s*(.+)', self.lines[k])
                                if match:
                                    merchant = match.group(1).strip()
                                    if merchant and len(merchant) > 1 and merchant not in merchants:
                                        merchants.append(merchant)

                    if 'heading' in self.lines[j] and 'Runs' in self.lines[j]:
                        break
                break

        self.card_data['merchants'] = merchants

    def extract_history(self):
        """Extract patch history."""
        history = []

        for i, line in enumerate(self.lines):
            if 'heading' in line and 'History' in self.lines[i] if i < len(self.lines) else False:
                # Look for version headings
                for j in range(i, min(i + 500, len(self.lines))):
                    version_match = re.search(r'heading\s+"([\d.]+(?:\s+Hotfix#\d+)?)"', self.lines[j])
                    if version_match:
                        version = version_match.group(1)

                        # Extract date
                        date = None
                        for k in range(j, min(j + 5, len(self.lines))):
                            date_match = re.search(r'generic.*:\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+,?\s+\d+)', self.lines[k])
                            if date_match:
                                date = date_match.group(1).strip()
                                break

                        history.append({
                            'version': version,
                            'date': date
                        })

        self.card_data['history'] = history

    def get_enchant_english_name(self, chinese_name: str) -> str:
        """Map Chinese enchantment names to English."""
        mapping = {
            '沉重': 'Heavy',
            '黄金': 'Golden',
            '寒冰': 'Icy',
            '疾速': 'Turbo',
            '护盾': 'Shield',
            '回复': 'Regenerative',
            '毒素': 'Toxic',
            '炽焰': 'Fiery',
            '闪亮': 'Shiny',
            '致命': 'Deadly',
            '辉耀': 'Radiant',
            '黑曜石': 'Obsidian'
        }
        return mapping.get(chinese_name, chinese_name)

    def parse_number(self, value: str) -> Any:
        """Parse a number string to int or float."""
        try:
            if '.' in value:
                return float(value)
            return int(value)
        except ValueError:
            return value

    def extract_all(self):
        """Extract all card information."""
        print("Loading file...")
        self.load_file()

        print("Extracting basic information...")
        self.extract_basic_info()

        print("Extracting deep mechanics...")
        self.extract_deep_mechanics()

        print("Extracting enchantments...")
        self.extract_enchantments()

        print("Extracting merchants...")
        self.extract_merchants()

        print("Extracting history...")
        self.extract_history()

        return self.card_data

    def save_to_json(self, output_path: str):
        """Save extracted data to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.card_data, f, ensure_ascii=False, indent=2)
        print(f"Saved to {output_path}")


def main():
    """Main function with command line argument support."""
    # Parse command line arguments
    if len(sys.argv) < 2:
        print("Usage: python3 extract_card_info.py <markdown_file> [output_json_file]")
        print("\nExamples:")
        print("  python3 extract_card_info.py docs/盐钳海盗_card_page.md")
        print("  python3 extract_card_info.py docs/card_page.md docs/card_data.json")
        sys.exit(1)

    # Get input file from command line
    input_file = sys.argv[1]

    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: File '{input_file}' does not exist.")
        sys.exit(1)

    # Determine output file
    if len(sys.argv) >= 3:
        # User provided output file
        output_file = sys.argv[2]
    else:
        # Auto-generate output file name based on input file
        input_path = Path(input_file)
        output_file = str(input_path.parent / f"{input_path.stem}_data.json")

    print(f"Input file: {input_file}")
    print(f"Output file: {output_file}")
    print()

    # Extract card information
    try:
        extractor = CardExtractor(input_file)
        card_data = extractor.extract_all()

        # Save to JSON
        extractor.save_to_json(output_file)

        # Print summary
        print("\n=== Extraction Summary ===")
        basic_info = card_data.get('basic_info', {})
        print(f"Card Name: {basic_info.get('name', 'N/A')} ({basic_info.get('name_en', 'N/A')})")
        print(f"Types: {', '.join(basic_info.get('types', []))}")
        print(f"Cooldown: {basic_info.get('cooldown', 'N/A')} seconds")
        print(f"Damage: {basic_info.get('damage', 'N/A')}")
        print(f"Tags: {len(basic_info.get('tags', []))} tags")
        print(f"Enchantments: {len(card_data.get('enchantments', []))} enchantments")
        print(f"Merchants: {len(card_data.get('merchants', []))} merchants")
        print(f"History: {len(card_data.get('history', []))} patch versions")

        print(f"\n✓ Successfully extracted card data to {output_file}")

    except Exception as e:
        print(f"Error during extraction: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
