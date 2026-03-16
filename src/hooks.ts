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
): { results: EmojiResult[]; error: Error | null } {
  const [results, setResults] = useState<EmojiResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;

    embedQuery(query)
      .then((queryVec) => rankEmojis(queryVec, n))
      .then((ranked) => {
        if (!cancelled) {
          setResults(ranked);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, n]);

  return { results, error };
}

/**
 * Returns the single best emoji match for `query`.
 */
export function useEmojiRecommendation(
  query: string,
): { result: EmojiResult | null; error: Error | null } {
  const { results, error } = useEmojiRecommendations(query, 1);
  return { result: results[0] ?? null, error };
}

/**
 * Like `useEmojiRecommendations`, but searches only within `vocabulary`.
 */
export function useCustomSubsetEmojiRecommendations(
  query: string,
  n: number,
  vocabulary: string[],
): { results: EmojiResult[]; error: Error | null } {
  const [results, setResults] = useState<EmojiResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;

    embedQuery(query)
      .then((queryVec) => rankEmojis(queryVec, n, vocabulary))
      .then((ranked) => {
        if (!cancelled) {
          setResults(ranked);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query, n, vocabulary]);

  return { results, error };
}
