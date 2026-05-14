import type { WordItem } from "@/types/domain";

export function collectLibraryTags(words: WordItem[]) {
  return Array.from(new Set(words.flatMap((word) => word.tags))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function buildDeckSummary(words: WordItem[]) {
  return {
    total: words.length,
    starred: words.filter((word) => word.isStarred).length,
    focused: words.filter((word) => word.isFocused).length,
    due: words.filter((word) => word.nextReviewAt && word.nextReviewAt <= Date.now()).length,
  };
}
