export interface EmojiResult {
  emoji: string;
  name: string;
  score: number;
}

export type SkinTone =
  | "default"
  | "light"
  | "medium-light"
  | "medium"
  | "medium-dark"
  | "dark";
