const https = require('https');
const fs = require('fs');
const path = require('path');

// Image URLs to download
const imageUrls = [
  "https://s.bazaardb.gg/v1/z11.0/a2beec64f30dde8ee0cee746640eb33bab270d64@400.webp",
  "https://s.bazaardb.gg/v1/z11.0/312a8272cd7d6db2c94dd66ea1be3552eda312a2_p@256.webp?v=6",
  "https://s.bazaardb.gg/v1/z11.0/172d2747a8f8f4d3cc68efcb672ded158ac3d585_p@256.webp?v=6",
  "https://s.bazaardb.gg/v1/z11.0/8f8cc5cb45bdc8e983a6ba7da5dfad5ec3206645_p@256.webp?v=6"
];

/**
 * Download image from URL
 */
function downloadImage(url, index) {
  return new Promise((resolve, reject) => {
    const ext = '.webp';
    const filename = `bazaar_image_${index + 1}${ext}`;

    console.log(`Downloading: ${url}`);
    console.log(`Saving as: ${filename}`);

    const file = fs.createWriteStream(filename);

    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(filename);
          console.log(`✓ Downloaded: ${filename} (${(stats.size / 1024).toFixed(2)} KB)\n`);
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

/**
 * Download all images
 */
async function downloadAll() {
  console.log(`Starting download of ${imageUrls.length} images...\n`);

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      await downloadImage(imageUrls[i], i);
    } catch (error) {
      console.error(`Error downloading image ${i + 1}:`, error.message);
    }
  }

  console.log('All downloads completed!');
}

downloadAll();
