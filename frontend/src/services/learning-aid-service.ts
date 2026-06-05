import { apiUrl } from "@/services/api-base";
import type { DerivedWord, WordItem } from "@/types/domain";

export type LearningAid = {
  roots: string[];
  derivedForms: DerivedWord[];
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
      .split(/[;,，；、\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toDerivedWords(value: unknown): DerivedWord[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const source = item as Record<string, unknown>;
      const pos = String(source.pos || "other").toLowerCase();
      return {
        term: String(source.term || source.word || "").trim(),
        pos: ["noun", "verb", "adjective", "adverb", "phrase"].includes(pos) ? (pos as DerivedWord["pos"]) : "other",
        meaning: String(source.meaning || source.meaningZh || "").trim() || undefined,
      };
    })
    .filter((item) => item.term);
}

function isGenericFallbackExample(term: string, value?: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[.\u3002]/g, "")
    .replace(/\s+/g, " ");
  const cleanTerm = term.trim().toLowerCase().replace(/\s+/g, " ");
  return (
    !normalized ||
    (normalized.includes(`remember ${cleanTerm} more easily`) && normalized.includes("real sentence")) ||
    normalized.includes("try to use") ||
    normalized.includes("in a sentence you might actually say")
  );
}

function fallbackAid(word: WordItem): LearningAid {
  const usefulExample = isGenericFallbackExample(word.term, word.example) ? "" : word.example;
  return {
    roots: word.roots,
    derivedForms: word.derivedForms || [],
    synonyms: word.synonyms,
    antonyms: word.antonyms,
    collocations: word.collocations,
    memoryHint: word.memoryHint,
    example: usefulExample,
    exampleTranslation: usefulExample ? word.exampleTranslation : "",
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
    const payloadExample = String(payload.exampleEn || "");
    const example = isGenericFallbackExample(word.term, payloadExample) ? fallback.example : payloadExample;
    const roots = toStringArray(payload.roots);
    const derivedForms = toDerivedWords(payload.wordForms);
    const synonyms = toStringArray(payload.synonyms);
    const antonyms = toStringArray(payload.antonyms);
    const collocations = toStringArray(payload.collocations);

    return {
      roots: roots.length ? roots : fallback.roots,
      derivedForms: derivedForms.length ? derivedForms : fallback.derivedForms,
      synonyms: synonyms.length ? synonyms : fallback.synonyms,
      antonyms: antonyms.length ? antonyms : fallback.antonyms,
      collocations: collocations.length ? collocations : fallback.collocations,
      memoryHint: String(payload.mnemonicZh || payload.memoryHint || fallback.memoryHint),
      example,
      exampleTranslation: example ? String(payload.exampleZh || fallback.exampleTranslation) : "",
    };
  } catch {
    return fallback;
  }
}
