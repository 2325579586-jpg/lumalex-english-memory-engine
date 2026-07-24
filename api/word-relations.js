const { handleOptions, readJsonBody, sendJson } = require("./_lib/http");
const { fetchWithTimeout } = require("./_lib/fetch");
const { checkRateLimit } = require("./_lib/rate-limit");

const GROUPS = [
  {
    type: "lookalike",
    title: "长相近似",
    description: "容易和当前单词看混、拼错或读错的词",
  },
  {
    type: "synonym",
    title: "近义词",
    description: "意思接近，但语气或使用场景不同的词",
  },
  {
    type: "antonym",
    title: "反义词",
    description: "意思相反或方向相反的词",
  },
  {
    type: "derived",
    title: "派生 / 相关词",
    description: "由当前单词派生出的词、短语或高频相关表达",
  },
];

const responseCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 250;

function getCachedResponse(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  responseCache.delete(key);
  responseCache.set(key, cached);
  return cached.value;
}

function setCachedResponse(key, value) {
  responseCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (responseCache.size > MAX_CACHE_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value);
  }
}

function text(value) {
  return String(value || "").trim();
}

function cacheKey(payload) {
  return [
    text(payload.word).toLowerCase().replace(/\s+/g, " "),
    text(payload.partOfSpeech).toLowerCase(),
    text(payload.definition).slice(0, 160),
    text(payload.language) || "zh-CN",
  ].join("|");
}

function stripJsonFence(value) {
  const clean = text(value);
  if (!clean.startsWith("```")) return clean;
  return clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseJsonContent(value) {
  const clean = stripJsonFence(value);
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error("LLM did not return valid JSON.");
  }
}

function isSingleEnglishWord(value) {
  return /^[A-Za-z]+$/.test(text(value));
}

function sanitizeItem(value, groupType) {
  if (!value || typeof value !== "object") return null;
  const word = text(value.word);
  if (!word) return null;
  if (groupType === "lookalike" && !isSingleEnglishWord(word)) return null;
  return {
    word,
    phonetic: text(value.phonetic),
    partOfSpeech: text(value.partOfSpeech),
    chinese: text(value.chinese),
    note: text(value.note),
    difference: text(value.difference),
    example: text(value.example),
    exampleZh: text(value.exampleZh),
  };
}

function normalizeResponse(payload, fallbackWord) {
  const source = payload && typeof payload === "object" ? payload : {};
  const rawGroups = Array.isArray(source.groups) ? source.groups : [];
  const groupMap = new Map();

  for (const rawGroup of rawGroups) {
    if (!rawGroup || typeof rawGroup !== "object") continue;
    const type = text(rawGroup.type);
    const meta = GROUPS.find((item) => item.type === type);
    if (!meta) continue;
    const items = Array.isArray(rawGroup.items)
      ? rawGroup.items.map((item) => sanitizeItem(item, type)).filter(Boolean).slice(0, 6)
      : [];
    groupMap.set(type, {
      ...meta,
      title: text(rawGroup.title) || meta.title,
      description: text(rawGroup.description) || meta.description,
      items,
    });
  }

  return {
    word: text(source.word) || fallbackWord,
    groups: GROUPS.map((group) => groupMap.get(group.type) || { ...group, items: [] }),
  };
}

function buildUserPrompt({ word, partOfSpeech, definition }) {
  return `请为英文单词生成关系词卡片数据。

单词：${word}
词性：${partOfSpeech}
中文释义：${definition}

要求：
1. 返回 4 个分组：
   - lookalike：长相近似、容易看错或拼错的词
   - synonym：近义词
   - antonym：反义词
   - derived：派生词、相关词或常见短语
2. 每组最多 6 个词。
3. 每个词都要适合英语学习场景。
4. 不要编造不存在的单词。
5. 长相近似词必须在拼写、字形或读音上容易混淆。
   - lookalike 分组只能返回单个连续英文单词，只能包含英文字母 A-Z/a-z。
   - lookalike 分组不要返回短语、固定搭配、带空格表达、带连字符表达或句子。
   - 如果找不到足够的长相近似单词，可以少于 6 个，不要用短语凑数。
6. 近义词必须说明和原词的细微区别。
7. 反义词必须说明和原词的反向关系。
8. 派生词可以包含不同词性、短语、固定搭配。
9. 中文解释要简洁准确。
10. 例句要自然、简单，适合中级英语学习者。
11. 只返回 JSON，格式如下：

{
  "word": "${word}",
  "groups": [
    {
      "type": "lookalike",
      "title": "长相近似",
      "description": "容易和当前单词看混、拼错或读错的词",
      "items": [
        {
          "word": "string",
          "phonetic": "string",
          "partOfSpeech": "string",
          "chinese": "string",
          "note": "string",
          "difference": "string",
          "example": "string",
          "exampleZh": "string"
        }
      ]
    },
    {
      "type": "synonym",
      "title": "近义词",
      "description": "意思接近，但语气或使用场景不同的词",
      "items": []
    },
    {
      "type": "antonym",
      "title": "反义词",
      "description": "意思相反或方向相反的词",
      "items": []
    },
    {
      "type": "derived",
      "title": "派生 / 相关词",
      "description": "由当前单词派生出的词、短语或高频相关表达",
      "items": []
    }
  ]
}`;
}

async function generateWordRelations(payload) {
  const apiKey = text(process.env.LLM_API_KEY || process.env.COMPAT_API_KEY || process.env.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error("LLM_API_KEY, COMPAT_API_KEY, or OPENAI_API_KEY is required.");
  }

  const model = text(process.env.LLM_MODEL || process.env.COMPAT_MODEL || process.env.OPENAI_MODEL) || "gpt-4.1-mini";
  const baseUrl = (text(process.env.LLM_BASE_URL || process.env.COMPAT_BASE_URL || process.env.OPENAI_BASE_URL) || "https://api.openai.com/v1").replace(/\/+$/, "");
  const systemPrompt =
    "你是一个专业的英语词汇学习助手。你的任务是为中国英语学习者生成准确、实用、适合背单词场景的关系词数据。你必须只返回合法 JSON，不要返回 Markdown，不要解释，不要添加多余文本。";

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserPrompt(payload) },
      ],
    }),
  }, 30_000);

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(String(errorPayload?.error?.message || errorPayload?.error || `LLM request failed (${response.status})`));
  }

  const result = await response.json();
  const raw = result?.choices?.[0]?.message?.content || "{}";
  return normalizeResponse(parseJsonContent(raw), payload.word);
}

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" }, req);
  if (!checkRateLimit(req, res, { key: "word-relations", max: 20, windowMs: 60_000 })) return;

  const payload = await readJsonBody(req, res, { maxBytes: 24 * 1024 });
  if (!payload) return;
  const word = text(payload.word);
  const definition = text(payload.definition);
  const partOfSpeech = text(payload.partOfSpeech);
  const language = text(payload.language) || "zh-CN";
  if (!word || word.length > 80 || definition.length > 500 || partOfSpeech.length > 80 || language.length > 20) {
    return sendJson(res, 400, { error: "word relation input is invalid", code: "INVALID_RELATION_INPUT" }, req);
  }

  const requestPayload = { word, definition, partOfSpeech, language };
  const key = cacheKey(requestPayload);
  const cached = getCachedResponse(key);
  if (cached) {
    return sendJson(res, 200, cached, req);
  }

  try {
    const relations = await generateWordRelations(requestPayload);
    setCachedResponse(key, relations);
    return sendJson(res, 200, relations, req);
  } catch (error) {
    console.warn("[word-relations] provider request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return sendJson(res, 502, { error: "关系词服务暂时不可用，请稍后重试。", code: "RELATION_PROVIDER_FAILED" }, req);
  }
};
