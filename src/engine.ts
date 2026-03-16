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

// Lazy-load vectors so mobile browsers don't parse 6MB upfront
let vectorsPromise: Promise<VectorData> | null = null;

function getVectors(): Promise<VectorData> {
  if (!vectorsPromise) {
    vectorsPromise = import("./data/emoji-vectors.json").then(
      (m) => m.default as unknown as VectorData,
    );
  }
  return vectorsPromise;
}

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

/**
 * Rank emojis by cosine similarity to the query vector.
 * If `subset` is provided, only those emojis are considered.
 */
export async function rankEmojis(
  queryVec: Float32Array,
  n: number,
  subset?: string[],
): Promise<EmojiResult[]> {
  const emojiVectors = await getVectors();
  const allEmojis = Object.entries(emojiVectors.emojis) as [
    string,
    { name: string; vector: number[] },
  ][];

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
export async function getAllEmojis(): Promise<string[]> {
  const emojiVectors = await getVectors();
  return Object.keys(emojiVectors.emojis);
}
