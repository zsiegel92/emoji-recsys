# emoji-recsys

[Demo at `emoji-recsys.vercel.app`](https://emoji-recsys.vercel.app/).

Semantic emoji search for React. Type a word or phrase, get the most relevant emojis back.

Uses precomputed embeddings for 1,906 emojis and [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) via [Transformers.js](https://huggingface.co/docs/transformers.js) for query embedding. Runs entirely in the browser.

Built on the approach from [entity-db](https://github.com/babycommando/entity-db) — an in-browser vector database using Transformers.js for semantic search.

## Install

```bash
pnpm i emoji-recsys
```

React 18+ is a peer dependency.

## Usage

```tsx
import { useEmojiRecommendations } from "emoji-recsys";

function EmojiPicker() {
  const { results, error } = useEmojiRecommendations("happy celebration", 5);

  if (error) return <div>Failed to load: {error.message}</div>;

  return (
    <div>
      {results.map((r) => (
        <span key={r.emoji} title={r.name}>
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
```

### Hooks

All hooks return `{ results, error }` (or `{ result, error }` for the singular variant). `error` is `null` on success, or an `Error` if the model fails to load.

#### `useEmojiRecommendations(query: string, n?: number): { results: EmojiResult[]; error: Error | null }`

Returns the top `n` emojis (default 5) most semantically similar to `query`. Returns `[]` while loading or if query is empty.

#### `useEmojiRecommendation(query: string): { result: EmojiResult | null; error: Error | null }`

Returns the single best emoji match.

#### `useCustomSubsetEmojiRecommendations(query: string, n: number, vocabulary: string[]): { results: EmojiResult[]; error: Error | null }`

Same as `useEmojiRecommendations`, but only searches within the provided emoji subset.

```tsx
const { results } = useCustomSubsetEmojiRecommendations("weather", 3, ["☀️", "🌧️", "❄️", "🌈", "⛈️"]);
```

### Utilities

#### `preloadModel(): Promise<void>`

Pre-warms the embedding model so the first query is fast. Call this early (e.g., on app mount) if you want to avoid a delay on the first search.

```tsx
import { preloadModel } from "emoji-recsys";

useEffect(() => { preloadModel(); }, []);
```

#### `getAllEmojis(): Promise<string[]>`

Returns all 1,906 emoji characters that have precomputed vectors.

### Types

```ts
interface EmojiResult {
  emoji: string;  // the emoji character
  name: string;   // Unicode name (e.g., "grinning face")
  score: number;  // cosine similarity (0–1, higher = better match)
}
```

## Example app

See [test-emoji-recsys](https://github.com/zsiegel92/test-emoji-recsys) for a working Next.js example.

## How it works

1. At **build time**, every emoji's Unicode name is embedded into a 384-dimensional vector using all-MiniLM-L6-v2. These vectors ship with the package.
2. At **runtime**, your query string is embedded using the same model (loaded once, cached in the browser — ~23MB on first load).
3. Cosine similarity is computed between the query vector and all emoji vectors, and the top N results are returned.

## Rebuilding vectors

To update the emoji set or re-embed with a different model:

```bash
pnpm build:vectors  # precompute embeddings
pnpm build          # bundle the package
```

## License

MIT
