import { useState, useEffect } from "react";
import { embedQuery, rankEmojis } from "./engine";
import type { EmojiResult } from "./types";

/**
 * Returns the top `n` emojis most semantically similar to `query`.
 * Results update reactively when `query` or `n` changes.
 * Returns `[]` while loading or if query is empty.
 */
export function useEmojiRecommendations(
  query: string,
  n: number = 5,
): EmojiResult[] {
  const [results, setResults] = useState<EmojiResult[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;

    embedQuery(query).then((queryVec) => {
      if (!cancelled) {
        setResults(rankEmojis(queryVec, n));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query, n]);

  return results;
}

/**
 * Returns the single best emoji match for `query`.
 */
export function useEmojiRecommendation(query: string): EmojiResult | null {
  const results = useEmojiRecommendations(query, 1);
  return results[0] ?? null;
}

/**
 * Like `useEmojiRecommendations`, but searches only within `vocabulary`.
 */
export function useCustomSubsetEmojiRecommendations(
  query: string,
  n: number,
  vocabulary: string[],
): EmojiResult[] {
  const [results, setResults] = useState<EmojiResult[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;

    embedQuery(query).then((queryVec) => {
      if (!cancelled) {
        setResults(rankEmojis(queryVec, n, vocabulary));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query, n, vocabulary]);

  return results;
}
