const fs = require('fs');
const path = require('path');
const https = require('https');
const { JSDOM } = require('jsdom');

/**
 * Parse HTML and download images from div with class '_aM'
 */
async function parseAndDownloadImages(htmlFilePath) {
  try {
    // Read HTML file
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
    console.log(`Loaded HTML file: ${htmlFilePath}`);

    // Parse HTML with JSDOM
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Find all divs with class '_aM'
    const divs = document.querySelectorAll('div._aM');
    console.log(`Found ${divs.length} div(s) with class '_aM'`);

    if (divs.length === 0) {
      console.log('No divs with class "_aM" found');
      return;
    }

    // Find all img tags under these divs
    const images = [];
    divs.forEach((div, index) => {
      const imgs = div.querySelectorAll('img');
      console.log(`Div ${index + 1}: Found ${imgs.length} image(s)`);

      imgs.forEach((img) => {
        const src = img.getAttribute('src');
        if (src) {
          images.push(src);
          console.log(`  Image URL: ${src}`);
        }
      });
    });

    if (images.length === 0) {
      console.log('No images found in divs with class "_aM"');
      return;
    }

    // Download each image
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      await downloadImage(imageUrl, i);
    }

    console.log('\nAll downloads completed!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Download image from URL
 */
function downloadImage(url, index) {
  return new Promise((resolve, reject) => {
    // Handle relative URLs
    let fullUrl = url;
    if (url.startsWith('//')) {
      fullUrl = 'https:' + url;
    } else if (url.startsWith('/')) {
      fullUrl = 'https://bazaardb.gg' + url;
    }

    // Extract filename from URL
    const urlPath = new URL(fullUrl).pathname;
    const ext = path.extname(urlPath) || '.webp';
    const filename = `image_${index + 1}${ext}`;

    console.log(`\nDownloading: ${fullUrl}`);
    console.log(`Saving as: ${filename}`);

    const file = fs.createWriteStream(filename);

    https.get(fullUrl, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Downloaded: ${filename}`);
          resolve();
        });
      } else {
        fs.unlink(filename, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

// Main execution
const htmlFile = process.argv[2] || 'bazaar_ship_wheel.html';

if (!fs.existsSync(htmlFile)) {
  console.error(`Error: HTML file not found: ${htmlFile}`);
  console.log('Usage: node parse-and-download.js <html-file>');
  process.exit(1);
}

parseAndDownloadImages(htmlFile);
