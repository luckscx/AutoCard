#!/usr/bin/env python3
"""
Script to fetch a webpage, save snapshot as YAML, and download images from specific div
Usage: python fetch_page.py <url>
"""

import sys
import subprocess
import json
import os
import requests
import re
import yaml
import base64
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote


def extract_name_from_url(url):
    """Extract card name from URL for filename"""
    try:
        # URL format: https://bazaardb.gg/card/{id}/{name}/zh-CN
        parsed = urlparse(url)
        path_parts = parsed.path.strip('/').split('/')

        if len(path_parts) >= 3 and path_parts[0] == 'card':
            # Get the name part (index 2)
            name = unquote(path_parts[2])
            # Clean filename: remove invalid characters
            name = re.sub(r'[<>:"/\\|?*]', '_', name)
            return name

        # Fallback: use the last part of path
        if path_parts:
            name = unquote(path_parts[-1])
            name = re.sub(r'[<>:"/\\|?*]', '_', name)
            return name

    except Exception as e:
        print(f"Warning: Could not extract name from URL: {e}")

    return "page"


def run_playwright_cli(args, session='default'):
    """Run playwright-cli command and return output"""
    cmd = ['playwright-cli', f'-s={session}'] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout, result.stderr, result.returncode


def save_snapshot(url, session='default', output_file='page.yml'):
    """Open URL with playwright-cli and save snapshot as YAML"""
    print(f"Opening URL: {url}")

    # Open the URL
    stdout, stderr, returncode = run_playwright_cli(['open', url], session)

    if returncode != 0:
        print(f"✗ Failed to open URL")
        return False

    # Wait for lazy load images to load
    print(f"Waiting for images to load...")
    import time
    time.sleep(3)  # Wait 3 seconds for lazy load

    # Take a snapshot with custom filename
    print(f"Taking snapshot...")
    stdout, stderr, returncode = run_playwright_cli(['snapshot', f'--filename={output_file}'], session)

    if returncode == 0 and os.path.exists(output_file):
        file_size = os.path.getsize(output_file)
        print(f"✓ Snapshot saved to {output_file}")
        print(f"  File size: {file_size} bytes")
        return True
    else:
        print(f"✗ Could not save snapshot file")
        return False


def get_image_url(session='default'):
    """Execute DOM query to find image URL in div._aN.undefined"""
    print(f"\nQuerying DOM for images in div._aN.undefined...")

    # JavaScript code to extract image URL from the specific div
    # Query for div._aN.undefined img[src] to get images with src attribute
    js_code = '() => Array.from(document.querySelectorAll("div._aN.undefined img[src]")).map(img => img.src).filter(src => src.startsWith("http"))[0]'

    stdout, stderr, returncode = run_playwright_cli(['eval', js_code], session)

    if returncode == 0 and stdout.strip():
        # Clean up the output - look for the actual result
        lines = stdout.split('\n')
        for line in lines:
            if line.startswith('"') or line.startswith('http'):
                img_url = line.strip().strip('"')

                if img_url.startswith('http'):
                    print(f"✓ Found image URL: {img_url[:100]}...")
                    return img_url

    print(f"✗ No image found in div._aN.undefined")
    print(f"Output: {stdout[:200]}")
    return None


def save_image(img_data, output_dir='images', base_filename='image'):
    """Save image data to local directory (supports both URL and base64)"""
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(exist_ok=True)

    try:
        if img_data.startswith('data:'):
            # Handle base64 encoded image
            print(f"\nProcessing base64 encoded image...")

            # Extract base64 data
            # Format: data:image/webp;base64,<data>
            match = re.match(r'data:image/(\w+);base64,(.+)', img_data)
            if match:
                img_format = match.group(1)
                base64_data = match.group(2)

                # Create filename with correct extension
                filename = f'{base_filename}.{img_format}'
                output_path = os.path.join(output_dir, filename)

                print(f"Saving to: {output_path}")

                # Decode and save
                img_bytes = base64.b64decode(base64_data)
                with open(output_path, 'wb') as f:
                    f.write(img_bytes)

                print(f"✓ Base64 image saved successfully")
                print(f"  File size: {len(img_bytes)} bytes")
                print(f"  Format: {img_format}")
                return output_path
            else:
                print(f"✗ Invalid base64 image format")
                return None

        elif img_data.startswith('http'):
            # Handle URL - detect extension from URL
            parsed_url = urlparse(img_data)
            url_path = parsed_url.path

            # Extract extension from URL (e.g., .webp, .jpg, .png)
            ext = os.path.splitext(url_path)[1]
            if not ext or ext not in ['.webp', '.jpg', '.jpeg', '.png', '.gif']:
                ext = '.jpg'  # default extension

            filename = f'{base_filename}{ext}'
            output_path = os.path.join(output_dir, filename)
            return download_image_from_url(img_data, output_path)

        else:
            print(f"✗ Unknown image data format")
            return None

    except Exception as e:
        print(f"✗ Failed to save image: {e}")
        return None


def download_image_from_url(img_url, output_path):
    """Download image from URL"""
    print(f"\nDownloading image from: {img_url}")
    print(f"Saving to: {output_path}")

    try:
        response = requests.get(img_url, timeout=30)
        response.raise_for_status()

        with open(output_path, 'wb') as f:
            f.write(response.content)

        print(f"✓ Image downloaded successfully")
        print(f"  File size: {len(response.content)} bytes")
        return output_path
    except Exception as e:
        print(f"✗ Failed to download image: {e}")
        return None


def process_url(url, session='fetch_page_session'):
    """Process a single URL"""
    # Add /zh-CN suffix to URL if not already present
    if not url.endswith('/zh-CN'):
        url = url.rstrip('/') + '/zh-CN'

    # Extract name from URL for filename
    card_name = extract_name_from_url(url)

    print(f"\nStarting script for URL: {url}")
    print(f"Card name: {card_name}")
    print("=" * 60)

    # Check if yml file already exists
    yaml_file = f'yml/{card_name}.yml'
    if os.path.exists(yaml_file):
        print(f"✓ YAML file already exists, skipping: {yaml_file}")
        return True

    try:
        # Step 1: Save page snapshot as YAML
        if not save_snapshot(url, session, yaml_file):
            print("\nWarning: Failed to save snapshot, but continuing...")

        # Step 2: Extract image URL from DOM
        img_data = get_image_url(session)

        if not img_data:
            print("\n⚠ No image found to download")
        else:
            # Step 3: Save the image (handles both URL and base64)
            output_path = save_image(img_data, base_filename=card_name)

            if output_path:
                print("\n" + "=" * 60)
                print("✓ Script completed successfully!")
                print(f"  YAML: {yaml_file}")
                print(f"  Image: {output_path}")
                return True
            else:
                print("\n✗ Failed to save image")
                return False

    except Exception as e:
        print(f"\n✗ Error processing {url}: {e}")
        return False


def main():
    # Read card links from JSON file
    links_file = 'card_links.json'

    if not os.path.exists(links_file):
        print(f"✗ File not found: {links_file}")
        sys.exit(1)

    with open(links_file, 'r', encoding='utf-8') as f:
        card_links = json.load(f)

    # Limit to first 3 links for testing
    test_limit = 1000
    card_links = card_links[:test_limit]

    print(f"Loaded {len(card_links)} URLs from {links_file}")
    print(f"Processing first {test_limit} URLs for testing...\n")

    session = 'fetch_page_session'
    success_count = 0
    skip_count = 0
    fail_count = 0

    try:
        for i, url in enumerate(card_links, 1):
            print(f"\n{'='*80}")
            print(f"Processing {i}/{len(card_links)}: {url}")
            print(f"{'='*80}")

            card_name = extract_name_from_url(url)
            yaml_file = f'yml/{card_name}.yml'

            if os.path.exists(yaml_file):
                print(f"✓ Skipping (already exists): {yaml_file}")
                skip_count += 1
                continue

            result = process_url(url, session)
            if result:
                success_count += 1
            else:
                fail_count += 1

        print(f"\n{'='*80}")
        print("Batch processing completed!")
        print(f"  Total: {len(card_links)}")
        print(f"  Success: {success_count}")
        print(f"  Skipped: {skip_count}")
        print(f"  Failed: {fail_count}")
        print(f"{'='*80}")

    finally:
        # Clean up: close the browser session
        print("\nClosing browser session...")
        run_playwright_cli(['close'], session)
        print("✓ Browser closed")


if __name__ == '__main__':
    main()
