import { dashboardLexicons, type Lexicon } from "@/data/mock-data";
import { apiUrl } from "@/services/api-base";
import type { BackendLexiconDto } from "@/types/api";

export async function getLexicons(): Promise<Lexicon[]> {
  try {
    const response = await fetch(apiUrl("/lexicons"));
    if (!response.ok) {
      throw new Error("Failed to load lexicons");
    }

    const payload = (await response.json()) as { lexicons?: BackendLexiconDto[] };
    return (payload.lexicons || []).map((item) => ({
      id: item.id,
      name: item.name?.zh || item.name?.en || item.id,
      category: item.id.startsWith("custom-") ? "自建" : "考试",
      total: item.itemCount || item.item_count || 0,
      pendingLearn: Math.max(4, Math.round((item.itemCount || item.item_count || 0) * 0.12)),
      pendingReview: Math.max(2, Math.round((item.itemCount || item.item_count || 0) * 0.08)),
      updatedAt: "刚刚同步",
    }));
  } catch {
    return dashboardLexicons;
  }
}
