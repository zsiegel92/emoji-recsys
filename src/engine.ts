import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import type { EmojiResult } from "./types";

interface VectorData {
  model: string;
  dimensions: number;
  emojis: Record<string, { name: string; vector: number[] }>;
}

// Use import with type assertion to avoid TS inferring a massive union from JSON keys
import _emojiVectors from "./data/emoji-vectors.json";
const emojiVectors = _emojiVectors as unknown as VectorData;

const MODEL = "Xenova/all-MiniLM-L6-v2";

let pipePromise: Promise<FeatureExtractionPipeline> | null = null;

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!pipePromise) {
    // @ts-expect-error — pipeline's overloaded union is too complex for TS
    pipePromise = pipeline("feature-extraction", MODEL, { dtype: "fp32" });
  }
  return pipePromise;
}

/** Pre-warm the embedding model so first query is fast. */
export async function preloadModel(): Promise<void> {
  await getEmbedder();
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return output.data as Float32Array;
}

function cosineSimilarity(a: Float32Array | number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const allEmojis = Object.entries(emojiVectors.emojis) as [
  string,
  { name: string; vector: number[] },
][];

/**
 * Rank emojis by cosine similarity to the query vector.
 * If `subset` is provided, only those emojis are considered.
 */
export function rankEmojis(
  queryVec: Float32Array,
  n: number,
  subset?: string[],
): EmojiResult[] {
  const candidates = subset
    ? subset
        .map((e) => {
          const data = emojiVectors.emojis[e];
          return data
            ? ([e, data] as [string, { name: string; vector: number[] }])
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    : allEmojis;

  const scored: EmojiResult[] = candidates.map(([emoji, { name, vector }]) => ({
    emoji,
    name,
    score: cosineSimilarity(queryVec, vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}

/** Get the list of all emoji characters with precomputed vectors. */
export function getAllEmojis(): string[] {
  return allEmojis.map(([emoji]) => emoji);
}
