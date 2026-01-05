#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, '../assets/onboarding/product-screenshot.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/onboarding');

// Phone mockup dimensions for overlay
const SIZES = {
  '@3x': { width: 375 * 3, height: 812 * 3 },  // 1125 x 2436 (iPhone 14 Pro)
  '@2x': { width: 375 * 2, height: 812 * 2 },  // 750 x 1624
  '@1x': { width: 375, height: 812 },          // 375 x 812 (base)
};

async function optimizeScreenshot() {
  const startSize = fs.statSync(INPUT_PATH).size;
  console.log(`\n📱 Processing: product-screenshot.png (${(startSize / 1024).toFixed(0)} KB)`);

  // Process in reverse order to avoid overwriting input
  const entries = Object.entries(SIZES).reverse();

  for (const [suffix, dimensions] of entries) {
    const outputFilename = suffix === '@1x'
      ? 'product-screenshot-temp.png'
      : `product-screenshot${suffix}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    try {
      await sharp(INPUT_PATH)
        .resize(dimensions.width, dimensions.height, {
          fit: 'contain',         // Maintain aspect ratio, fit within bounds
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
        })
        .png({
          compressionLevel: 9,    // Maximum compression
          quality: 90,
        })
        .toFile(outputPath);

      const outputSize = fs.statSync(outputPath).size;
      const savings = ((1 - outputSize / startSize) * 100).toFixed(1);

      console.log(`  ✅ ${suffix}: ${dimensions.width}×${dimensions.height} → ${(outputSize / 1024).toFixed(0)} KB`);
    } catch (err) {
      console.error(`  ❌ Error creating ${suffix}:`, err.message);
    }
  }

  // Rename temp file to final @1x name
  const tempPath = path.join(OUTPUT_DIR, 'product-screenshot-temp.png');
  const finalPath = path.join(OUTPUT_DIR, 'product-screenshot.png');
  if (fs.existsSync(tempPath)) {
    fs.renameSync(tempPath, finalPath);
    const finalSize = fs.statSync(finalPath).size;
    console.log(`  ✅ @1x: 375×812 → ${(finalSize / 1024).toFixed(0)} KB (renamed from temp)`);
  }

  console.log('\n✨ Done! Product screenshot optimized');
}

optimizeScreenshot().catch(console.error);
