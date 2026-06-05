export function normalizeSpellingAnswer(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’'‘`]/g, "")
    .replace(/[‐‑‒–—−]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "");
}

type MeaningHintWord = {
  term: string;
  meanings: string[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildTermPattern(term: string) {
  const parts = term
    .trim()
    .split(/[\s\-_.]+/)
    .filter(Boolean)
    .map(escapeRegExp);
  if (!parts.length) return null;
  return new RegExp(`(^|[^A-Za-z0-9])${parts.join("[\\s\\-_.]+")}(?=$|[^A-Za-z0-9])`, "gi");
}

function cleanMeaningText(value: string) {
  return value
    .replace(/[；;，,、\/|]+(\s*[；;，,、\/|]+)+/g, "；")
    .replace(/^[\s；;，,、\/|:：\-]+|[\s；;，,、\/|:：\-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getSpellingMeaningHints(word: MeaningHintWord) {
  const normalizedTerm = normalizeSpellingAnswer(word.term);
  const termPattern = buildTermPattern(word.term);
  const hints = word.meanings
    .flatMap((meaning) => meaning.split(/[；;]/g))
    .map((meaning) => {
      const withoutTerm = termPattern ? meaning.replace(termPattern, (match, prefix: string) => prefix || "") : meaning;
      return cleanMeaningText(withoutTerm);
    })
    .filter((meaning) => meaning && normalizeSpellingAnswer(meaning) !== normalizedTerm);

  return hints;
}

export function getSpellingMeaningText(word: MeaningHintWord, fallback = "暂无释义") {
  const hints = getSpellingMeaningHints(word);
  return hints.length ? hints.join("；") : fallback;
}

type StudyTitleOptions = {
  compact?: boolean;
};

function getComparableLength(value: string) {
  const trimmed = value.trim();
  const letters = trimmed.replace(/[^A-Za-z0-9]/g, "").length;
  const separators = (trimmed.match(/[\s\-_.]+/g) || []).length;
  return letters + separators * 2;
}

export function getStudyTitleStyle(value: string, options: StudyTitleOptions = {}) {
  const length = getComparableLength(value);
  const hasLatin = /[A-Za-z]/.test(value);
  const compact = Boolean(options.compact);

  let fontSize = compact ? "2.75rem" : "3.5rem";

  if (!hasLatin) {
    fontSize = compact ? "2rem" : "2.75rem";
  } else if (compact) {
    if (length > 28) fontSize = "1.2rem";
    else if (length > 20) fontSize = "1.5rem";
    else if (length > 14) fontSize = "1.875rem";
    else if (length > 9) fontSize = "2.375rem";
  } else {
    if (length > 28) fontSize = "1.375rem";
    else if (length > 20) fontSize = "1.75rem";
    else if (length > 14) fontSize = "2.25rem";
    else if (length > 9) fontSize = "2.875rem";
  }

  return {
    fontSize,
    lineHeight: 1.05,
    letterSpacing: 0,
    maxWidth: "100%",
    minWidth: 0,
    whiteSpace: "normal",
    overflow: "visible",
    overflowWrap: "anywhere",
    wordBreak: "normal",
  } as const;
}
