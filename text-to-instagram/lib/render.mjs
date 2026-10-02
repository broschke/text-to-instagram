// Turns a message into a 1080x1350 JPEG: white text centered on navy.
import fs from "node:fs";
import path from "node:path";

const W = 1080, H = 1350, PAD = 130;
const BOX_W = W - PAD * 2, BOX_H = H - PAD * 2;
const MAX_TEXT_PX = 150;               // cap so one-word texts don't become gigantic
const BACKGROUND = process.env.BG_COLOR || "#14213D";
const TEXT_COLOR = process.env.TEXT_COLOR || "#FFFFFF";

const FONT_DIR = path.resolve("fonts");
const FONT_FILE = path.join(FONT_DIR, "Poppins-Medium.ttf");

// Serverless hosts have no system fonts, so point fontconfig at the bundled one.
let sharpPromise;
function loadSharp() {
  if (!sharpPromise) {
    const conf = "/tmp/fonts.conf";
    fs.writeFileSync(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>${FONT_DIR}</dir><cachedir>/tmp/fontcache</cachedir></fontconfig>`);
    process.env.FONTCONFIG_FILE = conf;
    sharpPromise = import("sharp").then(m => m.default);
  }
  return sharpPromise;
}

const escapeMarkup = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function textLayer(sharp, text, autoFit) {
  const opts = {
    text: `<span foreground="${TEXT_COLOR}">${escapeMarkup(text)}</span>`,
    font: autoFit ? "Poppins Medium" : "Poppins Medium 12",
    fontfile: FONT_FILE,
    width: BOX_W,
    align: "centre",
    wrap: "word",
    rgba: true,
  };
  if (autoFit) opts.height = BOX_H;                       // shrink to fit the box
  else opts.dpi = Math.round((MAX_TEXT_PX * 72) / 12);    // fixed size, 12pt = MAX_TEXT_PX
  const buf = await sharp({ text: opts }).png().toBuffer();
  const { width, height } = await sharp(buf).metadata();
  return { buf, width, height };
}

export async function renderPost(text) {
  const sharp = await loadSharp();
  let layer = await textLayer(sharp, text, false);
  if (layer.height > BOX_H || layer.width > BOX_W) layer = await textLayer(sharp, text, true);

  return sharp({ create: { width: W, height: H, channels: 3, background: BACKGROUND } })
    .composite([{
      input: layer.buf,
      left: Math.round((W - layer.width) / 2),
      top: Math.round((H - layer.height) / 2),
    }])
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
