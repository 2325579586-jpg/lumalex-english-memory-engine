export type BackendLexiconDto = {
  id: string;
  key?: string;
  slug?: string;
  name?: { en?: string; zh?: string };
  description?: { en?: string; zh?: string };
  scope?: "system" | "custom";
  itemCount?: number;
  item_count?: number;
  createdAt?: number;
};

export type BackendLexiconItemDto = {
  id: string;
  text: string;
  kind: "word" | "phrase";
  phonetic?: string;
  pos?: string;
  category?: { en?: string; zh?: string };
  difficulty?: { en?: string; zh?: string };
  meaning?: { en?: string; zh?: string };
  example?: { en?: string; zh?: string };
  mnemonic?: { en?: string; zh?: string };
  audioUrl?: string;
  lexiconId?: string;
  lexiconKey?: string;
  createdAt?: number;
};
