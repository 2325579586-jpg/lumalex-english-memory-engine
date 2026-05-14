import { apiUrl } from "@/services/api-base";
import type { WordItem } from "@/types/domain";

export type LearningAid = {
  roots: string[];
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
  memoryHint: string;
  example: string;
  exampleTranslation: string;
};

function toStringArray(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[;,，；、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function fallbackAid(word: WordItem): LearningAid {
  const baseMeaning = word.meanings[0] || "先把它放回例句语境中记忆。";
  return {
    roots: word.roots.length ? word.roots : [`词形线索：观察 ${word.term} 的前后缀、重音和熟词部分。`],
    synonyms: word.synonyms.length ? word.synonyms : ["同义词待 AI 进一步补全"],
    antonyms: word.antonyms.length ? word.antonyms : ["反义词待 AI 进一步补全"],
    collocations: word.collocations.length ? word.collocations : [`use ${word.term} in context`, `${word.term} + example sentence`],
    memoryHint: word.memoryHint || `先抓住核心义“${baseMeaning}”，再用一个真实句子固定它的使用场景。`,
    example: word.example || `Try to use ${word.term} in a sentence you might actually say.`,
    exampleTranslation: word.exampleTranslation || `试着把 ${word.term} 放进一个你真的会使用的句子里。`,
  };
}

export async function getLearningAid(word: WordItem): Promise<LearningAid> {
  const fallback = fallbackAid(word);
  try {
    const response = await fetch(apiUrl("/enrich"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: word.term, kind: word.type }),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as Record<string, unknown>;
    return {
      roots: toStringArray(payload.roots).length ? toStringArray(payload.roots) : fallback.roots,
      synonyms: toStringArray(payload.synonyms).length ? toStringArray(payload.synonyms) : fallback.synonyms,
      antonyms: toStringArray(payload.antonyms).length ? toStringArray(payload.antonyms) : fallback.antonyms,
      collocations: toStringArray(payload.collocations).length ? toStringArray(payload.collocations) : fallback.collocations,
      memoryHint: String(payload.mnemonicZh || payload.memoryHint || fallback.memoryHint),
      example: String(payload.exampleEn || fallback.example),
      exampleTranslation: String(payload.exampleZh || fallback.exampleTranslation),
    };
  } catch {
    return fallback;
  }
}
