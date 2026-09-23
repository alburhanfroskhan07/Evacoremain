import sharp from "sharp";
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const iconsDir = path.join(publicDir, "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Exact official logo source
const sourceJpg = path.join(publicDir, "logo.jpg");
const sourceTransparent = path.join(publicDir, "logo-transparent.png");

async function generatePerfectIcons() {
  console.log("Generating perfect official Evacore SIH app icons...");

  // 1. High-Res Emblem (512x512 transparent) from logo-transparent.png
  // Extract the top emblem from logo-transparent.png (top ~75% contains emblem)
  const metaTrans = await sharp(sourceTransparent).metadata();
  const emblemCropHeight = Math.round(metaTrans.height * 0.76);
  
  await sharp(sourceTransparent)
    .extract({ left: 0, top: 0, width: metaTrans.width, height: emblemCropHeight })
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(publicDir, "logo-emblem.png"));
  console.log("✓ Generated crisp 512x512 logo-emblem.png");

  // 2. Official PWA Icon 512x512 with clean white background
  // Center the logo.jpg nicely
  const resized512 = await sharp(sourceJpg)
    .resize(460, 460, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([{ input: resized512, gravity: "center" }])
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-512x512.png"));
  console.log("✓ Generated icon-512x512.png");

  // 3. Official PWA Icon 192x192 with clean white background
  const resized192 = await sharp(sourceJpg)
    .resize(172, 172, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: { width: 192, height: 192, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([{ input: resized192, gravity: "center" }])
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-192x192.png"));
  console.log("✓ Generated icon-192x192.png");

  // 4. Android Maskable Icon (safe zone requires ~65% center area)
  const resizedMaskable = await sharp(sourceJpg)
    .resize(350, 350, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([{ input: resizedMaskable, gravity: "center" }])
    .png({ quality: 95 })
    .toFile(path.join(iconsDir, "icon-maskable-512x512.png"));
  console.log("✓ Generated icon-maskable-512x512.png");

  // 5. Apple Touch Icon (180x180)
  const resizedApple = await sharp(sourceJpg)
    .resize(160, 160, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: { width: 180, height: 180, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([{ input: resizedApple, gravity: "center" }])
    .png({ quality: 95 })
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("✓ Generated apple-touch-icon.png");

  // 6. Copy 192 and 512 to public root
  fs.copyFileSync(path.join(iconsDir, "icon-192x192.png"), path.join(publicDir, "icon-192.png"));
  fs.copyFileSync(path.join(iconsDir, "icon-512x512.png"), path.join(publicDir, "icon-512.png"));

  // 7. Generate favicon.ico / favicon.png (48x48)
  await sharp(sourceJpg)
    .resize(48, 48, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .toFile(path.join(publicDir, "favicon.png"));

  console.log("✓ All PWA and web icons regenerated with official Evacore SIH logo!");
}

generatePerfectIcons().catch((err) => {
  console.error("Icon generation error:", err);
  process.exit(1);
});
