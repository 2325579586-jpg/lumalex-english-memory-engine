export type WordRelationType = "lookalike" | "synonym" | "antonym" | "derived";

export type WordRelation = {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  chinese: string;
  note: string;
  difference?: string;
  example: string;
  exampleZh: string;
};

export type WordRelationGroup = {
  type: WordRelationType;
  title: string;
  description: string;
  items: WordRelation[];
};

export type WordRelationsResponse = {
  word: string;
  groups: WordRelationGroup[];
};

export type WordRelationsRequest = {
  word: string;
  definition: string;
  partOfSpeech: string;
  language?: "zh-CN" | string;
};
