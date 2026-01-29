/**
 * PWA Icon Generator
 * 
 * Generates all required PWA icon sizes from a base SVG
 * Run with: npx ts-node scripts/generate-pwa-icons.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// SalesTracker logo as SVG - Modern "S" with chart line motif
const LOGO_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="chartGradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#22d3ee;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="url(#bgGradient)"/>
  
  <!-- Stylized "S" for Sales -->
  <path d="M320 140 C320 140, 240 140, 200 140 C140 140, 100 180, 100 230 C100 280, 140 310, 200 310 L312 310 C352 310, 380 340, 380 380 C380 420, 352 450, 312 450 L180 450" 
        fill="none" 
        stroke="white" 
        stroke-width="48" 
        stroke-linecap="round"
        stroke-linejoin="round"/>
  
  <!-- Chart line overlay (represents tracking/growth) -->
  <path d="M120 380 L200 320 L280 360 L360 240 L420 280" 
        fill="none" 
        stroke="url(#chartGradient)" 
        stroke-width="24" 
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.9"/>
  
  <!-- Arrow pointing up (growth indicator) -->
  <path d="M400 260 L420 230 L400 260 L370 250" 
        fill="none" 
        stroke="url(#chartGradient)" 
        stroke-width="24" 
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity="0.9"/>
</svg>
`;

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🎨 Generating PWA icons...\n');

  // Convert SVG to buffer
  const svgBuffer = Buffer.from(LOGO_SVG);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }

  // Also generate favicon.ico (32x32)
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(faviconPath.replace('.ico', '.png'));
  console.log('✅ Generated: favicon.png (rename to .ico if needed)');

  console.log('\n🎉 PWA icon generation complete!');
}

generateIcons().catch(console.error);
