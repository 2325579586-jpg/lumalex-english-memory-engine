function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function detectKind(value) {
  return String(value || "").trim().includes(" ") ? "phrase" : "word";
}

function containsCjk(value) {
  return /[\u4e00-\u9fff]/.test(String(value || ""));
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
    "Return strict JSON with keys: phonetic, pos, meaning, exampleEn, exampleZh, mnemonicEn, mnemonicZh.",
    "meaning must be concise Simplified Chinese, not English.",
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
  if (!containsCjk(meaning)) {
    throw new Error("AI did not return a valid Simplified Chinese meaning.");
  }

  const dictionaryEntry = kind === "word" ? await fetchDictionaryPayload(text).catch(() => null) : null;
  return {
    text,
    kind,
    phonetic: parsed.phonetic || "",
    pos: parsed.pos || (kind === "phrase" ? "phrase" : "n."),
    meaning,
    exampleEn: parsed.exampleEn || buildFallbackExample(text),
    exampleZh: parsed.exampleZh || buildFallbackExampleZh(text),
    mnemonicEn: parsed.mnemonicEn || `Connect "${text}" with a concrete scene.`,
    mnemonicZh: parsed.mnemonicZh || buildFallbackMnemonic(text, meaning),
    audioUrl: extractAudioUrl(dictionaryEntry),
    provider: "compatible-llm",
  };
}

async function enrichWord(text, kind) {
  try {
    return await generateWithQwen(text, kind);
  } catch {
    if (kind === "word") {
      const dictionaryEntry = await fetchDictionaryPayload(text).catch(() => null);
      if (dictionaryEntry) {
        return {
          ...fallbackEnrichment(text),
          phonetic:
            dictionaryEntry.phonetic ||
            (Array.isArray(dictionaryEntry.phonetics)
              ? dictionaryEntry.phonetics.find((item) => item?.text)?.text || ""
              : ""),
          pos:
            (Array.isArray(dictionaryEntry.meanings) && dictionaryEntry.meanings[0]?.partOfSpeech
              ? dictionaryEntry.meanings[0].partOfSpeech
              : "n."),
          audioUrl: extractAudioUrl(dictionaryEntry),
          provider: "dictionaryapi",
        };
      }
    }
    return fallbackEnrichment(text);
  }
}

module.exports = {
  enrichWord,
  detectKind,
};
