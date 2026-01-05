#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '../assets/onboarding');
const OUTPUT_DIR = INPUT_DIR; // Output to same directory

// Modern iPhone dimensions (iPhone 14 Pro aspect ratio: ~19.5:9)
const SIZES = {
  '@3x': { width: 1125, height: 2436 },  // 3x resolution
  '@2x': { width: 750, height: 1624 },   // 2x resolution
  '@1x': { width: 375, height: 812 },    // 1x resolution (base)
};

const QUALITY = 85; // JPEG quality (0-100)

async function optimizeImage(inputPath) {
  const filename = path.basename(inputPath, '.png');
  const startSize = fs.statSync(inputPath).size;

  console.log(`\n🖼️  Processing: ${filename}.png (${(startSize / 1024 / 1024).toFixed(2)} MB)`);

  for (const [suffix, dimensions] of Object.entries(SIZES)) {
    const outputFilename = suffix === '@1x'
      ? `${filename}.jpg`
      : `${filename}${suffix}.jpg`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    try {
      await sharp(inputPath)
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',          // Crop to fill dimensions
          position: 'center',    // Center the crop
        })
        .jpeg({
          quality: QUALITY,
          progressive: true,     // Progressive JPEG for better loading
        })
        .toFile(outputPath);

      const outputSize = fs.statSync(outputPath).size;
      const savings = ((1 - outputSize / startSize) * 100).toFixed(1);

      console.log(`  ✅ ${suffix}: ${dimensions.width}×${dimensions.height} → ${(outputSize / 1024).toFixed(0)} KB (${savings}% smaller)`);
    } catch (err) {
      console.error(`  ❌ Error creating ${suffix}:`, err.message);
    }
  }
}

async function main() {
  console.log('🚀 Optimizing onboarding images for mobile...\n');

  // Get all PNG files
  const files = fs.readdirSync(INPUT_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();

  if (files.length === 0) {
    console.log('❌ No PNG files found in', INPUT_DIR);
    return;
  }

  console.log(`Found ${files.length} images to optimize`);

  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    await optimizeImage(inputPath);
  }

  console.log('\n✨ Done! Optimized images saved to:', OUTPUT_DIR);
  console.log('\n📝 Summary:');
  console.log('  - Format: JPG (progressive)');
  console.log('  - Quality: 85%');
  console.log('  - Resolutions: @3x (1125×2436), @2x (750×1624), @1x (375×812)');
  console.log('  - Original PNGs preserved');
}

main().catch(console.error);
