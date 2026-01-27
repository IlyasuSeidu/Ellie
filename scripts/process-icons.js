#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
/**
 * Icon Processing Script
 *
 * Processes source icons and creates optimized versions at 3 resolutions:
 * - 1x: 512×512px (standard)
 * - 2x: 1024×1024px (Retina)
 * - 3x: 2048×2048px (high-res)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const SOURCE_DIR = path.join(__dirname, '../assets/onboarding/icons/source');
const OUTPUT_1X = path.join(__dirname, '../assets/onboarding/icons/1x');
const OUTPUT_2X = path.join(__dirname, '../assets/onboarding/icons/2x');
const OUTPUT_3X = path.join(__dirname, '../assets/onboarding/icons/3x');

// Check if ImageMagick is installed
function checkImageMagick() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync('convert -version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

// Get command name (magick or convert)
function getMagickCommand() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return 'magick';
  } catch {
    return 'convert';
  }
}

// Process a single icon
function processIcon(filename) {
  const sourcePath = path.join(SOURCE_DIR, filename);
  const name = path.parse(filename).name;
  const ext = path.parse(filename).ext;

  if (ext.toLowerCase() !== '.png') {
    console.log(`⏭️  Skipping ${filename} (not a PNG file)`);
    return;
  }

  console.log(`\n📸 Processing: ${filename}`);

  const magickCmd = getMagickCommand();

  try {
    // Create 1x version (512×512)
    const output1x = path.join(OUTPUT_1X, `${name}.png`);
    console.log(`  → Creating 1x version (512×512)...`);
    execSync(`${magickCmd} "${sourcePath}" -resize 512x512 -quality 95 -strip "${output1x}"`, {
      stdio: 'inherit',
    });

    // Create 2x version (1024×1024)
    const output2x = path.join(OUTPUT_2X, `${name}.png`);
    console.log(`  → Creating 2x version (1024×1024)...`);
    execSync(`${magickCmd} "${sourcePath}" -resize 1024x1024 -quality 95 -strip "${output2x}"`, {
      stdio: 'inherit',
    });

    // Create 3x version (2048×2048)
    const output3x = path.join(OUTPUT_3X, `${name}.png`);
    console.log(`  → Creating 3x version (2048×2048)...`);
    execSync(`${magickCmd} "${sourcePath}" -resize 2048x2048 -quality 95 -strip "${output3x}"`, {
      stdio: 'inherit',
    });

    // Get file sizes
    const size1x = (fs.statSync(output1x).size / 1024).toFixed(1);
    const size2x = (fs.statSync(output2x).size / 1024).toFixed(1);
    const size3x = (fs.statSync(output3x).size / 1024).toFixed(1);

    console.log(`  ✅ Done! Sizes: 1x=${size1x}KB, 2x=${size2x}KB, 3x=${size3x}KB`);
  } catch (error) {
    console.error(`  ❌ Error processing ${filename}:`, error.message);
  }
}

// Main function
function main() {
  console.log('🎨 Icon Processing Script\n');
  console.log('='.repeat(50));

  // Check for ImageMagick
  if (!checkImageMagick()) {
    console.error('\n❌ ImageMagick is not installed!\n');
    console.error('Please install it first:');
    console.error('  macOS:   brew install imagemagick');
    console.error('  Ubuntu:  sudo apt-get install imagemagick');
    console.error('  Windows: Download from https://imagemagick.org/\n');
    process.exit(1);
  }

  console.log(`✅ ImageMagick detected (${getMagickCommand()})\n`);

  // Check source directory
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Get all PNG files from source
  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.toLowerCase().endsWith('.png'));

  if (files.length === 0) {
    console.log(`\n⚠️  No PNG files found in ${SOURCE_DIR}`);
    console.log('\nPlace your high-resolution PNG icons in:');
    console.log(`  ${SOURCE_DIR}\n`);
    console.log('Then run this script again.');
    process.exit(0);
  }

  console.log(`Found ${files.length} icon(s) to process\n`);

  // Create output directories if they don't exist
  [OUTPUT_1X, OUTPUT_2X, OUTPUT_3X].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Process each icon
  files.forEach(processIcon);

  console.log('\n' + '='.repeat(50));
  console.log('\n✨ All icons processed successfully!\n');
  console.log('Icons are now available in:');
  console.log(`  1x: ${OUTPUT_1X}`);
  console.log(`  2x: ${OUTPUT_2X}`);
  console.log(`  3x: ${OUTPUT_3X}\n`);
}

// Run the script
main();
