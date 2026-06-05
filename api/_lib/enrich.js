function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function detectKind(value) {
  return String(value || "").trim().includes(" ") ? "phrase" : "word";
}

function containsCjk(value) {
  return /[\u4e00-\u9fff]/.test(String(value || ""));
}

function isGenericFallbackMeaning(value, text) {
  const clean = String(value || "").trim();
  const normalized = normalizeText(clean);
  const normalizedText = normalizeText(text);
  return (
    !clean ||
    normalized.includes("常用英语词汇") ||
    normalized.includes("常用英语短语") ||
    normalized.includes("相关的常用") ||
    normalized.includes("建议稍后") ||
    normalized === normalizeText(buildFallbackMeaning(text, detectKind(text))) ||
    (normalizedText && normalized === normalizeText(`与 ${text} 相关的常用英语词汇含义。`))
  );
}

function isGenericFallbackExample(value, text) {
  const clean = String(value || "").trim();
  const normalized = normalizeText(clean).replace(/[.。]/g, "");
  const normalizedText = normalizeText(text);
  return (
    !clean ||
    normalized === normalizeText(buildFallbackExample(text)).replace(/[.。]/g, "") ||
    (normalizedText &&
      normalized.includes(`remember ${normalizedText} more easily`) &&
      normalized.includes("real sentence")) ||
    normalized.includes("try to use") ||
    normalized.includes("in a sentence you might actually say")
  );
}

function buildFallbackMeaning(text, kind) {
  return kind === "phrase" ? `与 ${text} 相关的常用英语短语表达。` : `与 ${text} 相关的常用英语词汇含义。`;
}

function buildFallbackExample(text) {
  return `You can remember ${text} more easily when you meet it again in a real sentence.`;
}

function buildFallbackExampleZh(text) {
  return `如果你在真实语境里再次遇到 ${text}，会更容易记住它。`;
}

function buildFallbackMnemonic(text, meaning) {
  return `先记住 ${text} 的核心中文义，再结合例句把它放进真实语境里。`;
}

async function fetchDictionaryPayload(text) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  return Array.isArray(payload) && payload.length ? payload[0] : null;
}

function extractAudioUrl(entry) {
  if (!entry || typeof entry !== "object") return "";
  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  for (const item of phonetics) {
    const audio = String(item?.audio || "").trim();
    if (audio) return audio;
  }
  return "";
}

function uniqueList(items, forbidden = []) {
  const blocked = new Set(forbidden.map(normalizeText));
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeText(item);
      if (!key || blocked.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function normalizeWordForms(value, forbidden = []) {
  const blocked = new Set(forbidden.map(normalizeText));
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  return source
    .map((item) => ({
      term: String(item?.term || item?.word || "").trim(),
      pos: String(item?.pos || item?.partOfSpeech || "other").trim().toLowerCase(),
      meaning: String(item?.meaning || item?.meaningZh || "").trim(),
    }))
    .filter((item) => item.term)
    .map((item) => ({
      ...item,
      pos: ["noun", "verb", "adjective", "adverb", "phrase"].includes(item.pos) ? item.pos : "other",
    }))
    .filter((item) => {
      const key = normalizeText(item.term);
      if (!key || blocked.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function extractDictionaryRelated(entry, key) {
  if (!entry || typeof entry !== "object") return [];
  const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
  const values = [];
  for (const meaning of meanings) {
    if (Array.isArray(meaning?.[key])) values.push(...meaning[key]);
    const definitions = Array.isArray(meaning?.definitions) ? meaning.definitions : [];
    for (const definition of definitions) {
      if (Array.isArray(definition?.[key])) values.push(...definition[key]);
    }
  }
  return uniqueList(values, [entry.word]);
}

function fallbackEnrichment(text) {
  const kind = detectKind(text);
  const meaning = buildFallbackMeaning(text, kind);
  return {
    text,
    kind,
    phonetic: kind === "word" ? `/${normalizeText(text).replace(/\s+/g, "-")}/` : "",
    pos: kind === "phrase" ? "phrase" : "n.",
    meaning,
    exampleEn: buildFallbackExample(text),
    exampleZh: buildFallbackExampleZh(text),
    mnemonicEn: `Connect "${text}" with a concrete scene.`,
    mnemonicZh: buildFallbackMnemonic(text, meaning),
    wordForms: [],
    synonyms: [],
    antonyms: [],
    audioUrl: "",
    provider: "fallback",
  };
}

async function generateWithQwen(text, kind) {
  const apiKey = String(process.env.COMPAT_API_KEY || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("No compatible API key configured.");

  const model = String(process.env.COMPAT_MODEL || process.env.OPENAI_MODEL || "qwen3-max").trim();
  const baseUrl = String(process.env.COMPAT_BASE_URL || "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const systemPrompt = [
    "You generate clean English vocabulary study cards.",
    "Return strict JSON with keys: phonetic, pos, meaning, exampleEn, exampleZh, mnemonicEn, mnemonicZh, wordForms, synonyms, antonyms.",
    "meaning must be concise Simplified Chinese only, 3 to 6 short senses separated by Chinese semicolons. Do not include English definitions, abbreviations like sth/sb/esp, markdown, or long paragraphs.",
    "phonetic must contain only one standard IPA pronunciation, for example /ɪmˈbaɪb/. If unsure, return an empty string.",
    "pos must be a compact label such as n., v., adj., adv., or phr.",
    "wordForms must be an array of related derivational forms with keys term, pos, meaning. Use pos noun, verb, adjective, adverb, phrase, or other.",
    "Every wordForms meaning must be short Simplified Chinese only.",
    "Include useful word-family forms such as noun, verb, adjective, and adverb when they exist.",
    "synonyms and antonyms must be arrays of plain English words or short phrases, max 8 each.",
    "exampleEn must be natural English. exampleZh must be clear Chinese.",
    "mnemonicZh must be Chinese. mnemonicEn must be short English support text.",
    "For phrases, use pos='phrase'.",
    "Do not include markdown fences.",
  ].join(" ");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate one study card for this ${kind}: ${text}. Return strict JSON only.` },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.error?.message || payload?.error || `AI enrich failed (${response.status})`;
    throw new Error(String(message));
  }

  const content = await response.json();
  const raw = content?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  const meaning = String(parsed.meaning || "").trim();
  const exampleEn = String(parsed.exampleEn || "").trim();
  const exampleZh = String(parsed.exampleZh || "").trim();
  if (!containsCjk(meaning) || isGenericFallbackMeaning(meaning, text)) {
    throw new Error("AI did not return a valid Simplified Chinese meaning.");
  }
  if (isGenericFallbackExample(exampleEn, text) || !containsCjk(exampleZh)) {
    throw new Error("AI did not return a useful example sentence.");
  }

  const dictionaryEntry = kind === "word" ? await fetchDictionaryPayload(text).catch(() => null) : null;
  return {
    text,
    kind,
    phonetic: parsed.phonetic || "",
    pos: parsed.pos || (kind === "phrase" ? "phrase" : "n."),
    meaning,
    exampleEn,
    exampleZh,
    mnemonicEn: parsed.mnemonicEn || `Connect "${text}" with a concrete scene.`,
    mnemonicZh: parsed.mnemonicZh || buildFallbackMnemonic(text, meaning),
    wordForms: normalizeWordForms(parsed.wordForms, [text]),
    synonyms: uniqueList(Array.isArray(parsed.synonyms) ? parsed.synonyms : [], [text]),
    antonyms: uniqueList(Array.isArray(parsed.antonyms) ? parsed.antonyms : [], [text]),
    audioUrl: extractAudioUrl(dictionaryEntry),
    provider: "compatible-llm",
  };
}

async function enrichWord(text, kind) {
  try {
    return await generateWithQwen(text, kind);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new Error(`AI auto-enrich failed: ${detail}`);
  }
}

module.exports = {
  enrichWord,
  detectKind,
};
