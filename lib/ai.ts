import "server-only";

/**
 * Minimal Google Gemini client (REST, no SDK). Server-only: the API key never reaches the browser.
 * Set GEMINI_API_KEY in .env (and in the hosting panel). GEMINI_MODEL optionally overrides the model.
 * If a model fails or is too slow, the next one in the list is tried.
 */
const MODELS = [process.env.GEMINI_MODEL, "gemini-3.5-flash", "gemini-3-flash-preview", "gemini-3.1-flash-lite"].filter(
  (m, i, a): m is string => !!m && a.indexOf(m) === i
);
const TIMEOUT_MS = 40_000;

export type AiMessage = { role: "user" | "model"; text: string };

export const aiEnabled = () => !!process.env.GEMINI_API_KEY;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { message?: string; status?: string };
  promptFeedback?: { blockReason?: string };
};

export async function generate({
  system,
  messages,
  temperature = 0.6,
  maxOutputTokens = 2048,
}: {
  system: string;
  messages: AiMessage[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ text: string } | { error: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "AI is not set up: add GEMINI_API_KEY to the server environment." };

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature, maxOutputTokens },
  });

  let lastError = "The AI service did not respond.";
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as GeminiResponse;
      if (!res.ok) {
        lastError = data.error?.message ?? `AI request failed (${res.status}).`;
        // Bad key / quota problems affect every model: stop instead of retrying.
        if (res.status === 400 && /api key/i.test(lastError)) break;
        if (res.status === 401 || res.status === 403 || res.status === 429) break;
        continue;
      }
      if (data.promptFeedback?.blockReason) return { error: "The AI declined this request. Try rephrasing it." };
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      if (text) return { text };
      lastError = "The AI returned an empty answer.";
    } catch (e) {
      lastError = e instanceof Error && e.name === "TimeoutError" ? "The AI took too long to answer." : "Could not reach the AI service.";
    }
  }
  console.error("Gemini error:", lastError);
  return { error: lastError };
}
