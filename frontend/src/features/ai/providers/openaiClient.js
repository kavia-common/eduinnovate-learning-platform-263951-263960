//
// OpenAI-compatible AI client.
// Uses REACT_APP_OPENAI_API_BASE and REACT_APP_OPENAI_API_KEY from env.
//
// PUBLIC_INTERFACE
import { AIConfig } from "../config";

function getHeaders() {
  const key = AIConfig.OPENAI_API_KEY;
  const headers = {
    "Content-Type": "application/json",
  };
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function postChat(messages, { model = "gpt-4o-mini", temperature = 0.2 } = {}) {
  const base = AIConfig.OPENAI_API_BASE;
  if (!base) {
    const err = new Error("OPENAI_API_BASE_MISSING");
    err.code = "OPENAI_API_BASE_MISSING";
    throw err;
  }
  const url = `${base.replace(/\/+$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      temperature,
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`OPENAI_API_ERROR ${res.status}: ${text || res.statusText}`);
    err.code = "OPENAI_API_ERROR";
    throw err;
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return content;
}

// PUBLIC_INTERFACE
export class OpenAICompatibleClient {
  // PUBLIC_INTERFACE
  async summarize({ text = "", contentId = "" }) {
    const content = text?.trim()
      ? text.trim()
      : `Summarize the content with id: ${contentId}`;
    const messages = [
      { role: "system", content: "You are a helpful study assistant. Be concise." },
      { role: "user", content: `Summarize the following for a student:\n\n${content}` },
    ];
    const out = await postChat(messages);
    return { type: "summary", provider: "openai", content: out };
  }

  // PUBLIC_INTERFACE
  async generateQuiz({ text = "", contentId = "", n = 5 }) {
    const count = Math.max(1, Math.min(Number(n) || 5, 10));
    const content = text?.trim()
      ? text.trim()
      : `Generate ${count} study questions for content id: ${contentId}`;
    const messages = [
      { role: "system", content: "You create clear quizzes. Return JSON array of {q,a}." },
      { role: "user", content: `Generate ${count} short Q&A pairs about:\n\n${content}\n\nReturn JSON only.` },
    ];
    const out = await postChat(messages);
    // Attempt to parse JSON; fallback to bullet extraction
    try {
      const items = JSON.parse(out);
      if (Array.isArray(items)) {
        return { type: "quiz", provider: "openai", items };
      }
    } catch {
      // naive parse: split lines starting with "-"
      const lines = String(out).split("\n").filter(Boolean);
      const items = lines.slice(0, count).map((l, i) => ({
        q: l.replace(/^\s*[-*]\s*/, "") || `Question ${i + 1}`,
        a: "Review your notes to answer.",
      }));
      return { type: "quiz", provider: "openai", items };
    }
    return { type: "quiz", provider: "openai", items: [] };
  }

  // PUBLIC_INTERFACE
  async explainELI5({ text = "", contentId = "" }) {
    const content = text?.trim()
      ? text.trim()
      : `Explain simply the content with id: ${contentId}`;
    const messages = [
      { role: "system", content: "You explain like I'm 5. Use simple analogies." },
      { role: "user", content: `Explain the following concept simply:\n\n${content}` },
    ];
    const out = await postChat(messages, { temperature: 0.5 });
    return { type: "eli5", provider: "openai", content: out };
  }
}
