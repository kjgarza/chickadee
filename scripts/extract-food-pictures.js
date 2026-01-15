#!/usr/bin/env bun
/**
 * Extract Food Pictures from Recipe Images
 * Usage: bun scripts/extract-food-pictures.js <image-path>
 *        bun scripts/extract-food-pictures.js --all
 *
 * Extracts 6 food pictures from recipe page images:
 * 1. Rotates image 90° counter-clockwise
 * 2. Crops 6 food pictures at fixed coordinates
 * 3. Resizes each to max 300KB
 * 4. Saves to src/assets/images/steps/
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const photosDir = path.join(process.env.HOME, 'aves/chickadee/photos');
const outputDir = path.join(__dirname, '../src/assets/images/steps');

// Fixed crop coordinates for 6 food pictures (990x580 px each)
// After 90° CCW rotation, images are ~4624x3472 px
// Layout: 2 rows × 3 columns
const PICTURE_COORDINATES = [
  // Row 1 (top)
  { x: 1500, y: 120, width: 990, height: 580 },  // pic-1
  { x: 2540, y: 120, width: 990, height: 580 },  // pic-2
  { x: 3580, y: 120, width: 990, height: 580 },  // pic-3
  // Row 2 (bottom)
  { x: 1500, y: 1750, width: 990, height: 580 }, // pic-4
  { x: 2540, y: 1750, width: 990, height: 580 }, // pic-5
  { x: 3580, y: 1750, width: 990, height: 580 }, // pic-6
];

const MAX_FILE_SIZE_KB = 300;

/**
 * Check if ImageMagick is installed
 */
function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'ignore' });
    return true;
  } catch (err) {
    console.error('❌ Error: ImageMagick is not installed');
    console.error('   Install with: brew install imagemagick');
    process.exit(1);
  }
}

/**
 * Rotate image 90° counter-clockwise
 */
function rotateImage(inputPath, outputPath) {
  try {
    execSync(`magick "${inputPath}" -rotate -90 "${outputPath}"`, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error(`   ❌ Failed to rotate image: ${err.message}`);
    return false;
  }
}

/**
 * Crop a single picture from rotated image
 */
function cropPicture(rotatedPath, coords, outputPath) {
  const { x, y, width, height } = coords;
  const cropSpec = `${width}x${height}+${x}+${y}`;

  try {
    execSync(`magick "${rotatedPath}" -crop ${cropSpec} "${outputPath}"`, { stdio: 'ignore' });
    return true;
  } catch (err) {
    console.error(`   ❌ Failed to crop: ${err.message}`);
    return false;
  }
}

/**
 * Resize image to max file size by iteratively reducing quality
 */
function resizeToMaxSize(imagePath, maxKB) {
  const stats = fs.statSync(imagePath);
  const currentKB = stats.size / 1024;

  if (currentKB <= maxKB) {
    return true; // Already small enough
  }

  // Try quality levels from 85% down to 60%
  for (let quality = 85; quality >= 60; quality -= 5) {
    try {
      const tempPath = imagePath + '.tmp.jpg';
      execSync(`magick "${imagePath}" -quality ${quality} "${tempPath}"`, { stdio: 'ignore' });

      const tempStats = fs.statSync(tempPath);
      const tempKB = tempStats.size / 1024;

      if (tempKB <= maxKB) {
        // Replace original with compressed version
        fs.renameSync(tempPath, imagePath);
        return true;
      }

      // Clean up temp file if still too large
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.error(`   ⚠️  Quality reduction at ${quality}% failed`);
    }
  }

  console.error(`   ⚠️  Could not reduce file size below ${maxKB}KB`);
  return false;
}

/**
 * Extract 6 food pictures from a single recipe image
 */
async function extractFromImage(imagePath) {
  const basename = path.basename(imagePath, path.extname(imagePath));
  console.log(`🔄 Processing: ${basename}`);

  // Validate input
  if (!fs.existsSync(imagePath)) {
    console.error(`   ❌ Image not found: ${imagePath}`);
    return { success: false, extracted: 0 };
  }

  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Rotate image
  const rotatedPath = path.join(photosDir, `${basename}_rotated.jpg`);
  console.log('  ↻ Rotating image 90° left...');

  if (!rotateImage(imagePath, rotatedPath)) {
    return { success: false, extracted: 0 };
  }

  // Extract each picture
  let extractedCount = 0;

  for (let i = 0; i < PICTURE_COORDINATES.length; i++) {
    const picNum = i + 1;
    const outputPath = path.join(outputDir, `${basename}-pic-${picNum}.jpg`);

    process.stdout.write(`  ✂️  Extracting picture ${picNum}/6... `);

    if (!cropPicture(rotatedPath, PICTURE_COORDINATES[i], outputPath)) {
      console.log('❌');
      continue;
    }

    // Resize to max file size
    resizeToMaxSize(outputPath, MAX_FILE_SIZE_KB);

    const stats = fs.statSync(outputPath);
    const sizeKB = (stats.size / 1024).toFixed(0);
    console.log(`✓ (${sizeKB}KB)`);
    extractedCount++;
  }

  // Cleanup rotated image
  if (fs.existsSync(rotatedPath)) {
    fs.unlinkSync(rotatedPath);
  }

  console.log(`  ✓ Extracted ${extractedCount}/6 pictures → ${outputDir}\n`);
  return { success: extractedCount === 6, extracted: extractedCount };
}

/**
 * Batch process all images in photos directory
 */
async function batchExtract() {
  console.log('📁 Batch processing all images in photos directory...\n');

  if (!fs.existsSync(photosDir)) {
    console.error(`❌ Photos directory not found: ${photosDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(photosDir)
    .filter(file => /\.(jpg|jpeg|JPG|JPEG)$/i.test(file))
    .filter(file => !file.includes('_rotated')) // Skip temp files
    .map(file => path.join(photosDir, file));

  if (files.length === 0) {
    console.log('No image files found in photos directory');
    process.exit(0);
  }

  console.log(`Found ${files.length} images to process\n`);

  let totalProcessed = 0;
  let totalExtracted = 0;
  let errors = 0;

  for (const file of files) {
    const result = await extractFromImage(file);
    totalProcessed++;
    totalExtracted += result.extracted;
    if (!result.success) errors++;
  }

  console.log('📊 Batch Summary:');
  console.log(`  - ${totalProcessed} images processed`);
  console.log(`  - ${totalExtracted} pictures extracted`);
  console.log(`  - ${errors} errors`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Check ImageMagick installation
  checkImageMagick();

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage:');
    console.log('  bun scripts/extract-food-pictures.js <image-path>  # Process single image');
    console.log('  bun scripts/extract-food-pictures.js --all          # Batch process all images');
    console.log('\nExample:');
    console.log('  bun scripts/extract-food-pictures.js ~/aves/chickadee/photos/PXL_20251228_145906937.MP.jpg');
    process.exit(args[0] === '--help' || args[0] === '-h' ? 0 : 1);
  }

  if (args[0] === '--all') {
    await batchExtract();
  } else {
    const imagePath = path.resolve(args[0]);
    await extractFromImage(imagePath);
  }
}

main();
