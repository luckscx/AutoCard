# 使用示例

## 1. 基本使用

提取卡牌信息，自动生成输出文件名：

```bash
cd /Users/grissom/Game/AutoCard
python3 tool/extract_card_info.py docs/盐钳海盗_card_page.md
```

输出：`docs/盐钳海盗_card_page_data.json`

## 2. 指定输出文件名

```bash
python3 tool/extract_card_info.py docs/盐钳海盗_card_page.md docs/my_card.json
```

输出：`docs/my_card.json`

## 3. 查看帮助信息

```bash
python3 tool/extract_card_info.py
```

输出：
```
Usage: python3 extract_card_info.py <markdown_file> [output_json_file]

Examples:
  python3 extract_card_info.py docs/盐钳海盗_card_page.md
  python3 extract_card_info.py docs/card_page.md docs/card_data.json
```

## 4. 处理多个文件

可以使用shell脚本批量处理：

```bash
#!/bin/bash
for file in docs/*_card_page.md; do
    echo "Processing $file..."
    python3 tool/extract_card_info.py "$file"
done
```

## 5. 脚本输出示例

运行脚本后会看到如下输出：

```
Input file: docs/盐钳海盗_card_page.md
Output file: docs/盐钳海盗_card_data.json

Loading file...
Extracting basic information...
Extracting deep mechanics...
Extracting enchantments...
Extracting merchants...
Extracting history...
Saved to docs/盐钳海盗_card_data.json

=== Extraction Summary ===
Card Name: 盐钳海盗 (Old Saltclaw)
Types: Aquatic, Friend, Weapon
Cooldown: 6.0 seconds
Damage: 30
Tags: 7 tags
Enchantments: 12 enchantments
Merchants: 16 merchants
History: 7 patch versions

✓ Successfully extracted card data to docs/盐钳海盗_card_data.json
```

## 6. 错误处理

### 文件不存在
```bash
$ python3 tool/extract_card_info.py nonexistent.md
Error: File 'nonexistent.md' does not exist.
```

### 解析错误
如果解析过程中出现错误，脚本会显示详细的错误信息和堆栈跟踪：

```
Error during extraction: ...
Traceback (most recent call last):
  ...
```

## 7. 在Python代码中使用

```python
from tool.extract_card_info import CardExtractor

# 创建提取器实例
extractor = CardExtractor('docs/盐钳海盗_card_page.md')

# 提取所有信息
card_data = extractor.extract_all()

# 访问提取的数据
print(f"Card name: {card_data['basic_info']['name']}")
print(f"Damage: {card_data['basic_info']['damage']}")

# 保存到JSON
extractor.save_to_json('output.json')
```
