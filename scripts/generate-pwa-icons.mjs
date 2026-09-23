import sharp from "sharp";
import fs from "fs";
import path from "path";

sharp.cache(false);
sharp.concurrency(1);

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const iconsDir = path.join(publicDir, "icons");

const sourceFile = path.join(publicDir, "logo-transparent.png");
const bg = { r: 18, g: 20, b: 24, alpha: 1 }; // #121418 brand dark

async function run() {
  console.log("Generating Evacore app icons sequentially...");

  // 1. icon-512x512.png
  const resized512 = await sharp(sourceFile)
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: bg }
  })
    .composite([{ input: resized512, gravity: "center" }])
    .png({ quality: 90 })
    .toFile(path.join(iconsDir, "icon-512x512.png"));

  console.log("Created icon-512x512.png");

  // 2. icon-192x192.png
  const resized192 = await sharp(sourceFile)
    .resize(150, 150, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 192, height: 192, channels: 4, background: bg }
  })
    .composite([{ input: resized192, gravity: "center" }])
    .png({ quality: 90 })
    .toFile(path.join(iconsDir, "icon-192x192.png"));

  console.log("Created icon-192x192.png");

  // 3. icon-maskable-512x512.png (65% safe zone)
  const resizedMaskable = await sharp(sourceFile)
    .resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 512, height: 512, channels: 4, background: bg }
  })
    .composite([{ input: resizedMaskable, gravity: "center" }])
    .png({ quality: 90 })
    .toFile(path.join(iconsDir, "icon-maskable-512x512.png"));

  console.log("Created icon-maskable-512x512.png");

  // 4. apple-touch-icon.png (180x180)
  const resizedApple = await sharp(sourceFile)
    .resize(140, 140, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 180, height: 180, channels: 4, background: bg }
  })
    .composite([{ input: resizedApple, gravity: "center" }])
    .png({ quality: 90 })
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  console.log("Created apple-touch-icon.png");

  // 5. Also copy 192x192 as favicon.png in public
  fs.copyFileSync(path.join(iconsDir, "icon-192x192.png"), path.join(publicDir, "icon-192.png"));
  fs.copyFileSync(path.join(iconsDir, "icon-512x512.png"), path.join(publicDir, "icon-512.png"));
  console.log("Copied icon-192.png and icon-512.png to /public");

  console.log("All icons successfully generated!");
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
