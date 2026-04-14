import type { CategoryTrend } from "@finance/types";

interface OpenRouterSuggestionInput {
  categoryTrends: CategoryTrend[];
  financialHealthScore: number;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function safeJsonParse(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    // Fallback handled below.
  }

  return content
    .split("\n")
    .map((line) => line.replace(/^[\-\*\d\.\)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function getOpenRouterSuggestions(
  input: OpenRouterSuggestionInput,
): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return [];

  const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  const topTrendSummary = input.categoryTrends.slice(0, 5).map((trend) => ({
    category: trend.category,
    direction: trend.direction,
    changePercent: Number(trend.changePercent.toFixed(2)),
  }));

  const prompt = [
    "You are a personal finance assistant.",
    "Return only a JSON array of max 5 short actionable suggestions.",
    "No markdown, no extra explanation.",
    `Financial health score: ${input.financialHealthScore}`,
    `Trends: ${JSON.stringify(topTrendSummary)}`,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return [];

    return safeJsonParse(content);
  } catch {
    return [];
  }
}
