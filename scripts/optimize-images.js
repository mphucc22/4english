// Encode existing artwork as responsive WebP without changing its composition.
// Example: node scripts/optimize-images.js --source public/images/original.png --name hero --widths 480,768,1448
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { chromium } from "playwright";

const options = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!["--source", "--name", "--widths"].includes(key) || !value || options.has(key))
    throw Error("Use --source <image> --name <asset-name> [--widths 480,768,1448].");
  options.set(key, value);
}
const source = options.get("--source");
const name = options.get("--name");
if (!source || !/^[a-z0-9][a-z0-9-]*$/.test(name || ""))
  throw Error("Supply an existing --source image and a lowercase --name using letters, digits and hyphens.");
const requestedWidths = options.has("--widths")
  ? [...new Set(options.get("--widths").split(",").map(Number))].sort((a, b) => a - b)
  : null;
if (requestedWidths?.some((width) => !Number.isInteger(width) || width < 1 || width > 4096))
  throw Error("Widths must be whole numbers between 1 and 4096.");

const input = await readFile(resolve(source));
const windowsChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const executablePath = process.env.CHROMIUM_PATH || (existsSync(windowsChrome) ? windowsChrome : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
try {
  const context = await browser.newContext();
  // Everything is decoded in memory. No source bytes or artwork are uploaded.
  await context.route("**/*", (route) => route.abort());
  const page = await context.newPage();
  const result = await page.evaluate(async ({ encoded, requested }) => {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes]));
    const image = new Image();
    try {
      image.src = url;
      await image.decode();
      const widths = requested || [...new Set([480, 768, image.naturalWidth].filter((width) => width <= image.naturalWidth))].sort((a, b) => a - b);
      if (widths.some((width) => width > image.naturalWidth))
        throw Error("Requested width exceeds the source image; upscaling is disabled.");
      const outputs = [];
      for (const width of widths) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = Math.round(image.naturalHeight * width / image.naturalWidth);
        const drawing = canvas.getContext("2d");
        drawing.imageSmoothingEnabled = true;
        drawing.imageSmoothingQuality = "high";
        drawing.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/webp", 0.84);
        if (!data.startsWith("data:image/webp;base64,")) throw Error("This browser cannot encode WebP.");
        outputs.push({ width, height: canvas.height, encoded: data.split(",")[1] });
      }
      return { sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight, outputs };
    } finally {
      URL.revokeObjectURL(url);
    }
  }, { encoded: input.toString("base64"), requested: requestedWidths });

  const destination = resolve("public/images");
  await mkdir(destination, { recursive: true });
  const summary = [];
  for (const output of result.outputs) {
    const bytes = Buffer.from(output.encoded, "base64");
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP")
      throw Error("Encoded image has an invalid WebP header.");
    const file = join(destination, `${name}-${output.width}.webp`);
    await writeFile(file, bytes);
    summary.push({ file, width: output.width, height: output.height, bytes: bytes.length, reductionPct: +(100 * (1 - bytes.length / input.length)).toFixed(1) });
  }
  console.log(JSON.stringify({ source: resolve(source), sourceBytes: input.length, sourceWidth: result.sourceWidth, sourceHeight: result.sourceHeight, quality: 0.84, outputs: summary }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
