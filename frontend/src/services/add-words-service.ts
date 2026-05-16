import { deckRepository } from "@/repositories/deck-repository";
import { learnRecordRepository } from "@/repositories/learn-record-repository";
import { reviewRecordRepository } from "@/repositories/review-record-repository";
import { wordRepository } from "@/repositories/word-repository";
import { apiUrl } from "@/services/api-base";
import { requireCurrentUserId } from "@/services/auth-session";
import type { Deck, DerivedWord, WordItem } from "@/types/domain";

export type SingleWordInput = {
  term: string;
  meanings: string;
  phonetic?: string;
  example?: string;
  exampleTranslation?: string;
  memoryHint?: string;
  tags?: string;
  synonyms?: string;
  antonyms?: string;
  derivedForms?: string | DerivedWord[];
  partOfSpeech?: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
  deckId?: string;
  deckName?: string;
};

export type ParsedDraft = {
  term: string;
  meanings: string[];
  type: "word" | "phrase";
  phonetic?: string;
  partOfSpeech?: string;
  tags?: string[];
  synonyms?: string[];
  antonyms?: string[];
  derivedForms?: DerivedWord[];
  example?: string;
  exampleTranslation?: string;
  memoryHint?: string;
  pronunciationUk?: string;
  pronunciationUs?: string;
};

export type ParseResult = {
  drafts: ParsedDraft[];
  errors: Array<{ line: number; raw: string; reason: string }>;
};

export type EnrichedDraft = {
  term: string;
  kind: "word" | "phrase";
  phonetic: string;
  partOfSpeech: string;
  meanings: string[];
  example: string;
  exampleTranslation: string;
  memoryHint: string;
  pronunciationUk: string;
  pronunciationUs: string;
  tags: string[];
  synonyms: string[];
  antonyms: string[];
  derivedForms: DerivedWord[];
};

function normalizeTerm(term: string) {
  return term.trim().toLowerCase();
}

function inferType(term: string): "word" | "phrase" {
  return term.trim().includes(" ") ? "phrase" : "word";
}

function splitTags(tags?: string) {
  return (tags || "")
    .split(/[，,;；]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitWordList(value?: string) {
  return (value || "")
    .split(/[，,;；、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDerivedPos(value: string): DerivedWord["pos"] {
  const clean = value.trim().toLowerCase();
  if (["noun", "n", "n."].includes(clean)) return "noun";
  if (["verb", "v", "v.", "vi", "vt", "vi.", "vt."].includes(clean)) return "verb";
  if (["adjective", "adj", "adj."].includes(clean)) return "adjective";
  if (["adverb", "adv", "adv."].includes(clean)) return "adverb";
  if (["phrase", "phr"].includes(clean)) return "phrase";
  return "other";
}

function normalizeDerivedForms(value: unknown): DerivedWord[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return { term: item.trim(), pos: "other" as const };
        const source = item as Record<string, unknown>;
        return {
          term: String(source.term || source.word || "").trim(),
          pos: normalizeDerivedPos(String(source.pos || source.partOfSpeech || "other")),
          meaning: String(source.meaning || source.meaningZh || "").trim() || undefined,
        };
      })
      .filter((item) => item.term);
  }
  if (typeof value === "string") {
    return value
      .split(/[，,;；、\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((term) => ({ term, pos: "other" as const }));
  }
  return [];
}

function inferDifficultyTag(term: string) {
  return inferType(term) === "phrase" ? "短语" : "单词";
}

async function resolveDeckId(input: Pick<SingleWordInput, "deckId" | "deckName">) {
  if (input.deckId) return input.deckId;

  const rawName = input.deckName?.trim();
  if (!rawName) {
    return "custom-reading-notes";
  }

  const decks = await deckRepository.list();
  const existing = decks.find((deck) => deck.name === rawName);
  if (existing) {
    return existing.id;
  }

  const created = await deckRepository.createCustom(rawName, "由添加页面快速创建");
  return created.id;
}

function draftToWord(draft: ParsedDraft, deckId: string): WordItem {
  const userId = requireCurrentUserId();
  const now = Date.now();
  return {
    id: `word-${crypto.randomUUID()}`,
    userId,
    term: draft.term.trim(),
    normalizedTerm: normalizeTerm(draft.term),
    type: draft.type,
    phonetic: draft.phonetic || "",
    pronunciationUk: draft.pronunciationUk || "",
    pronunciationUs: draft.pronunciationUs || "",
    partOfSpeech: draft.partOfSpeech || "",
    meanings: draft.meanings,
    example: draft.example || "",
    exampleTranslation: draft.exampleTranslation || "",
    memoryHint: draft.memoryHint || "",
    roots: [],
    derivedForms: draft.derivedForms || [],
    synonyms: draft.synonyms || [],
    antonyms: draft.antonyms || [],
    collocations: [],
    imageUrl: "",
    tags: draft.tags || [],
    source: "manual",
    deckId,
    difficultyLevel: draft.type === "phrase" ? 3 : 2,
    status: "unseen",
    memoryStrength: 0,
    correctCount: 0,
    wrongCount: 0,
    hesitateCount: 0,
    learnCount: 0,
    reviewCount: 0,
    lastStudiedAt: undefined,
    lastReviewedAt: undefined,
    nextReviewAt: undefined,
    createdAt: now,
    updatedAt: now,
    isStarred: false,
    isFocused: false,
    isConfused: false,
    errorTags: [],
  };
}

function resetWordForRelearning(existingWord: WordItem, draft: ParsedDraft, deckId: string): WordItem {
  const now = Date.now();
  return {
    ...existingWord,
    term: draft.term.trim(),
    normalizedTerm: normalizeTerm(draft.term),
    type: draft.type,
    phonetic: draft.phonetic || "",
    pronunciationUk: draft.pronunciationUk || "",
    pronunciationUs: draft.pronunciationUs || "",
    partOfSpeech: draft.partOfSpeech || "",
    meanings: draft.meanings,
    example: draft.example || "",
    exampleTranslation: draft.exampleTranslation || "",
    memoryHint: draft.memoryHint || "",
    derivedForms: draft.derivedForms || existingWord.derivedForms || [],
    synonyms: draft.synonyms || existingWord.synonyms,
    antonyms: draft.antonyms || existingWord.antonyms,
    tags: draft.tags || [],
    deckId,
    difficultyLevel: draft.type === "phrase" ? 3 : 2,
    status: "unseen",
    memoryStrength: 0,
    correctCount: 0,
    wrongCount: 1,
    hesitateCount: 0,
    learnCount: 0,
    reviewCount: 0,
    lastStudiedAt: undefined,
    lastReviewedAt: undefined,
    nextReviewAt: undefined,
    createdAt: now,
    updatedAt: now,
    isStarred: false,
    isFocused: true,
    isConfused: false,
    errorTags: [],
  };
}

function mapSingleInputToDraft(input: SingleWordInput): ParsedDraft {
  return {
    term: input.term.trim(),
    meanings: input.meanings
      .split(/[；;，,\n]/)
      .map((item) => item.trim())
      .filter(Boolean),
    type: inferType(input.term),
    phonetic: input.phonetic?.trim() || "",
    partOfSpeech: input.partOfSpeech?.trim() || "",
    tags: splitTags(input.tags),
    example: input.example?.trim() || "",
    exampleTranslation: input.exampleTranslation?.trim() || "",
    memoryHint: input.memoryHint?.trim() || "",
    synonyms: splitWordList(input.synonyms),
    antonyms: splitWordList(input.antonyms),
    derivedForms: normalizeDerivedForms(input.derivedForms),
    pronunciationUk: input.pronunciationUk?.trim() || "",
    pronunciationUs: input.pronunciationUs?.trim() || "",
  };
}

function fallbackEnrichment(term: string): EnrichedDraft {
  const kind = inferType(term);
  return {
    term,
    kind,
    phonetic: kind === "word" ? `/${normalizeTerm(term).replace(/\s+/g, "-")}/` : "",
    partOfSpeech: kind === "phrase" ? "phrase" : "n.",
    meanings: [kind === "phrase" ? "常用英文短语，可继续补充更准确的语境释义。" : "常用英文词汇，建议稍后根据场景再微调释义。"],
    example: `You can remember ${term} more easily when you meet it again in a real sentence.`,
    exampleTranslation: `如果你在真实语境里再次遇到 ${term}，会更容易记住它。`,
    memoryHint: kind === "phrase" ? "把它当成一个完整表达块去记，不要拆成单个词硬背。" : "先抓住核心中文义，再结合例句去建立语境记忆。",
    pronunciationUk: "",
    pronunciationUs: "",
    tags: [inferDifficultyTag(term), "自动补全"],
    synonyms: [],
    antonyms: [],
    derivedForms: [],
  };
}

function hasGenericFallbackMeaning(value: string) {
  return value.includes("\u5e38\u7528\u82f1\u6587\u8bcd\u6c47") || value.includes("\u5efa\u8bae\u7a0d\u540e");
}

function assertUsefulMeaning(term: string, meaning: string) {
  const cleanMeaning = meaning.trim();
  if (!cleanMeaning || hasGenericFallbackMeaning(cleanMeaning)) {
    throw new Error(`AI \u6ca1\u6709\u8fd4\u56de ${term} \u7684\u771f\u5b9e\u4e2d\u6587\u91ca\u4e49\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002`);
  }
  return cleanMeaning;
}

export async function requestAutoEnrich(term: string): Promise<EnrichedDraft> {
  const clean = term.trim();
  if (!clean) {
    throw new Error("请输入要添加的单词或短语。");
  }

  try {
    const response = await fetch(apiUrl("/enrich"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        kind: inferType(clean),
      }),
    });

    if (!response.ok) {
      const errorPayload = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
      throw new Error(errorPayload.error || `自动补全接口暂时不可用（HTTP ${response.status}）。`);
      throw new Error("自动补全接口暂时不可用。");
    }

    const payload = (await response.json()) as {
      text?: string;
      kind?: "word" | "phrase";
      phonetic?: string;
      pos?: string;
      meaning?: string;
      exampleEn?: string;
      exampleZh?: string;
      mnemonicZh?: string;
      audioUrl?: string;
      synonyms?: string[] | string;
      antonyms?: string[] | string;
      wordForms?: Array<{ term?: string; word?: string; pos?: string; partOfSpeech?: string; meaning?: string; meaningZh?: string }>;
    };

    const fallback = fallbackEnrichment(clean);

    return {
      term: payload.text || clean,
      kind: payload.kind || inferType(clean),
      phonetic: payload.phonetic || fallback.phonetic,
      partOfSpeech: payload.pos || fallback.partOfSpeech,
      meanings: [assertUsefulMeaning(clean, payload.meaning || "")],
      example: payload.exampleEn || fallback.example,
      exampleTranslation: payload.exampleZh || fallback.exampleTranslation,
      memoryHint: payload.mnemonicZh || fallback.memoryHint,
      pronunciationUk: payload.audioUrl || "",
      pronunciationUs: payload.audioUrl || "",
      tags: [inferDifficultyTag(clean), "自动补全"],
      synonyms: splitWordList(Array.isArray(payload.synonyms) ? payload.synonyms.join("，") : payload.synonyms),
      antonyms: splitWordList(Array.isArray(payload.antonyms) ? payload.antonyms.join("，") : payload.antonyms),
      derivedForms: normalizeDerivedForms(payload.wordForms),
    };
  } catch (error) {
    throw error instanceof Error ? error : new Error("\u81ea\u52a8\u8865\u5168\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002");
  }
}

export async function saveSingleWord(input: SingleWordInput) {
  const deckId = await resolveDeckId(input);
  const draft = mapSingleInputToDraft(input);
  const normalized = normalizeTerm(draft.term);
  const existing = (await wordRepository.list()).find((item) => item.deckId === deckId && item.normalizedTerm === normalized);
  const word = existing ? resetWordForRelearning(existing, draft, deckId) : draftToWord(draft, deckId);

  if (existing) {
    await Promise.all([
      learnRecordRepository.deleteByWord(existing.id),
      reviewRecordRepository.deleteByWord(existing.id),
    ]);
  }
  await wordRepository.put(word);
  const deckWords = await wordRepository.listByDeck(deckId);
  await deckRepository.updateCount(deckId, deckWords.length);
  return word;
}

export async function quickAddTermToDeck(term: string, deckId: string) {
  const cleanTerm = term.trim();
  if (!cleanTerm) {
    throw new Error("请输入要添加的单词或短语。");
  }

  const normalized = normalizeTerm(cleanTerm);
  const existing = (await wordRepository.list()).find(
    (item) => item.deckId === deckId && item.normalizedTerm === normalized,
  );

  if (existing) {
    const enriched = await requestAutoEnrich(cleanTerm);
    const updated = await saveSingleWord({
      term: enriched.term,
      meanings: enriched.meanings.join("；"),
      phonetic: enriched.phonetic,
      example: enriched.example,
      exampleTranslation: enriched.exampleTranslation,
      memoryHint: enriched.memoryHint,
      tags: enriched.tags.join("，"),
      partOfSpeech: enriched.partOfSpeech,
      pronunciationUk: enriched.pronunciationUk,
      pronunciationUs: enriched.pronunciationUs,
      synonyms: enriched.synonyms.join("，"),
      antonyms: enriched.antonyms.join("，"),
      derivedForms: enriched.derivedForms.map((item) => item.term).join("，"),
      deckId,
    });
    return { status: "reset" as const, word: updated };
  }

  const enriched = await requestAutoEnrich(cleanTerm);
  const created = await saveSingleWord({
    term: enriched.term,
    meanings: enriched.meanings.join("；"),
    phonetic: enriched.phonetic,
    example: enriched.example,
    exampleTranslation: enriched.exampleTranslation,
    memoryHint: enriched.memoryHint,
    tags: enriched.tags.join("，"),
    partOfSpeech: enriched.partOfSpeech,
    pronunciationUk: enriched.pronunciationUk,
    pronunciationUs: enriched.pronunciationUs,
    synonyms: enriched.synonyms.join("，"),
    antonyms: enriched.antonyms.join("，"),
    derivedForms: enriched.derivedForms.map((item) => item.term).join("，"),
    deckId,
  });

  return { status: "created" as const, word: created };
}

export async function enrichExistingWordRelations(onProgress?: (done: number, total: number, currentTerm: string) => void) {
  const words = await wordRepository.list();
  const targets = words.filter((word) => !(word.derivedForms || []).length || !word.synonyms.length);
  let updated = 0;

  for (const word of targets) {
    onProgress?.(updated, targets.length, word.term);
    try {
      const enriched = await requestAutoEnrich(word.term);
      await wordRepository.put({
        ...word,
        phonetic: word.phonetic || enriched.phonetic,
        partOfSpeech: word.partOfSpeech || enriched.partOfSpeech,
        meanings: word.meanings.length ? word.meanings : enriched.meanings,
        example: word.example || enriched.example,
        exampleTranslation: word.exampleTranslation || enriched.exampleTranslation,
        memoryHint: word.memoryHint || enriched.memoryHint,
        pronunciationUk: word.pronunciationUk || enriched.pronunciationUk,
        pronunciationUs: word.pronunciationUs || enriched.pronunciationUs,
        derivedForms: (word.derivedForms || []).length ? word.derivedForms : enriched.derivedForms,
        synonyms: word.synonyms.length ? word.synonyms : enriched.synonyms,
        antonyms: word.antonyms.length ? word.antonyms : enriched.antonyms,
        tags: Array.from(new Set([...word.tags, ...enriched.tags])),
        updatedAt: Date.now(),
      });
      updated += 1;
    } catch {
      // Keep going; one bad dictionary/AI response should not block the whole library.
    }
  }

  onProgress?.(updated, targets.length, "");
  return { total: targets.length, updated };
}

export function parseBatchText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const drafts: ParsedDraft[] = [];
  const errors: ParseResult["errors"] = [];

  lines.forEach((line, index) => {
    const separator = line.includes("|") ? "|" : line.includes(" - ") ? " - " : line.includes(":") ? ":" : null;
    if (!separator) {
      errors.push({ line: index + 1, raw: line, reason: "未识别到支持的分隔符（|、 - 、:）。" });
      return;
    }

    const [term, ...rest] = line.split(separator);
    const meaning = rest.join(separator).trim();
    if (!term?.trim() || !meaning) {
      errors.push({ line: index + 1, raw: line, reason: "缺少单词或释义。" });
      return;
    }

    drafts.push({
      term: term.trim(),
      meanings: [meaning],
      type: inferType(term),
      tags: [],
    });
  });

  return { drafts, errors };
}

export function parseCsvText(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const drafts: ParsedDraft[] = [];
  const errors: ParseResult["errors"] = [];

  lines.forEach((line, index) => {
    const cols = line.split(",").map((item) => item.trim());
    if (cols.length < 2) {
      errors.push({ line: index + 1, raw: line, reason: "CSV 至少需要 term, meaning 两列。" });
      return;
    }

    drafts.push({
      term: cols[0],
      meanings: [cols[1]],
      phonetic: cols[2] || "",
      partOfSpeech: cols[3] || "",
      type: inferType(cols[0]),
      tags: cols[4] ? splitTags(cols[4]) : [],
    });
  });

  return { drafts, errors };
}

export async function saveDraftsToDeck(drafts: ParsedDraft[], deckId: string) {
  const words = drafts.map((draft) => draftToWord(draft, deckId));
  await wordRepository.bulkUpsert(words);
  const deckWords = await wordRepository.listByDeck(deckId);
  await deckRepository.updateCount(deckId, deckWords.length);
  return words;
}

export async function readTextFile(file: File) {
  return file.text();
}

export async function generateAiMockWordList(params: {
  topic: string;
  count: number;
  difficulty: string;
  withExample: boolean;
}): Promise<ParsedDraft[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 900));
  const base = [
    ["allocate", "分配；调拨"],
    ["counterpart", "对应物；对应的人"],
    ["in light of", "鉴于；考虑到"],
    ["feasible", "可行的；办得到的"],
    ["articulate", "清晰表达"],
    ["reinforce", "强化；巩固"],
  ];

  return base.slice(0, Math.max(1, Math.min(params.count, base.length))).map(([term, meaning]) => ({
    term: params.topic.includes("短语") && !term.includes(" ") ? `${term} phrase` : term,
    meanings: [`${meaning}（${params.topic}）`],
    type: inferType(term),
    tags: [params.topic, params.difficulty],
    example: params.withExample ? `A good learner can use ${term} naturally in context.` : "",
    exampleTranslation: params.withExample ? `一个好的学习者能在语境中自然使用 ${term}。` : "",
    memoryHint: "这是 mock 生成结果，后续可以接入真实 AI。",
  }));
}

export async function ensureDeckOptions() {
  const decks = await deckRepository.list();
  return decks.sort((a, b) => {
    if (a.sourceType === b.sourceType) {
      return b.updatedAt - a.updatedAt;
    }
    return a.sourceType === "custom" ? -1 : 1;
  });
}

export type DeckOption = Deck;
