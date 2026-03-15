/**
 * Build script: precompute embedding vectors for all emojis.
 *
 * Usage: pnpm build:vectors
 *
 * This reads emoji data from unicode-emoji-json, computes embeddings
 * using all-MiniLM-L6-v2 via @huggingface/transformers, and writes
 * the result to src/data/emoji-vectors.json.
 */

import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// @ts-ignore — no types for this package
import emojiData from "unicode-emoji-json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "..", "src", "data", "emoji-vectors.json");
const MODEL = "Xenova/all-MiniLM-L6-v2";
const PRECISION = 5; // decimal places

// Skin tone modifier codepoints
const SKIN_TONE_MODIFIERS = [
  "\u{1F3FB}", // light
  "\u{1F3FC}", // medium-light
  "\u{1F3FD}", // medium
  "\u{1F3FE}", // medium-dark
  "\u{1F3FF}", // dark
];

function hasSkinTone(emoji: string): boolean {
  return SKIN_TONE_MODIFIERS.some((mod) => emoji.includes(mod));
}

function truncate(vec: number[]): number[] {
  const factor = 10 ** PRECISION;
  return vec.map((v) => Math.round(v * factor) / factor);
}

interface EmojiEntry {
  name: string;
  slug: string;
  group: string;
  emoji_version: string;
  unicode_version: string;
  skin_tone_support: boolean;
}

async function main() {
  console.log("Loading model...");
  const pipe = (await pipeline("feature-extraction", MODEL, {
    dtype: "fp32",
  })) as FeatureExtractionPipeline;

  const entries = Object.entries(emojiData as Record<string, EmojiEntry>);

  // Filter out skin tone variants — only keep base (yellow) emojis
  const baseEmojis = entries.filter(([emoji]) => !hasSkinTone(emoji));

  console.log(
    `Embedding ${baseEmojis.length} emojis (skipped ${entries.length - baseEmojis.length} skin tone variants)...`,
  );

  const emojis: Record<string, { name: string; vector: number[] }> = {};
  const batchSize = 64;

  for (let i = 0; i < baseEmojis.length; i += batchSize) {
    const batch = baseEmojis.slice(i, i + batchSize);
    const texts = batch.map(([, data]) => data.name);

    const outputs = await pipe(texts, { pooling: "mean", normalize: true });

    for (let j = 0; j < batch.length; j++) {
      const [emoji, data] = batch[j];
      const dims = outputs.dims[outputs.dims.length - 1];
      const start = j * dims;
      const vec = Array.from(outputs.data.slice(start, start + dims) as Float32Array);
      emojis[emoji] = {
        name: data.name,
        vector: truncate(vec),
      };
    }

    const done = Math.min(i + batchSize, baseEmojis.length);
    process.stdout.write(`\r  ${done}/${baseEmojis.length}`);
  }

  console.log("\nWriting vectors...");

  const result = {
    model: MODEL,
    dimensions: 384,
    emojis,
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(result));

  const sizeMB = (Buffer.byteLength(JSON.stringify(result)) / 1e6).toFixed(1);
  console.log(`Done! Wrote ${Object.keys(emojis).length} emojis (${sizeMB}MB) to ${OUTPUT}`);
}

main().catch(console.error);
