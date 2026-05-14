import { getLexicons } from "@/services/api";
import { apiUrl } from "@/services/api-base";
import type { BackendLexiconDto, BackendLexiconItemDto } from "@/types/api";

export { getLexicons };

export async function getLexiconCatalog(): Promise<BackendLexiconDto[]> {
  const response = await fetch(apiUrl("/lexicons"));
  if (!response.ok) {
    throw new Error("Failed to fetch lexicon catalog");
  }
  const payload = (await response.json()) as { lexicons?: BackendLexiconDto[] };
  return payload.lexicons || [];
}

export async function getLexiconItems(
  lexiconId: string,
): Promise<{ lexicon: BackendLexiconDto; items: BackendLexiconItemDto[] }> {
  const response = await fetch(apiUrl(`/lexicons/items?lexiconId=${encodeURIComponent(lexiconId)}`));
  if (!response.ok) {
    throw new Error("Failed to fetch lexicon items");
  }
  return response.json();
}
