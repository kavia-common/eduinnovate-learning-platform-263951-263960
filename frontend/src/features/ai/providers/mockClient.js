//
// Mock AI client - safe, deterministic responses for local/dev or when no provider configured.
// No network calls or secrets.
//
// PUBLIC_INTERFACE
export class MockAIClient {
  /** Summarize provided text or contentId. */
  // PUBLIC_INTERFACE
  async summarize({ text = "", contentId = "" }) {
    const base = text?.trim()
      ? text.trim().slice(0, 220)
      : contentId
      ? `Content ${contentId}`
      : "the provided content";
    return {
      type: "summary",
      provider: "mock",
      content: `Summary (mock): This is a concise overview of ${base}. Key points are highlighted, focusing on fundamentals and clarity.`,
    };
  }

  /** Generate quiz questions. */
  // PUBLIC_INTERFACE
  async generateQuiz({ text = "", contentId = "", n = 5 }) {
    const count = Math.max(1, Math.min(Number(n) || 5, 10));
    const topic = text?.trim()
      ? text.trim().slice(0, 60)
      : contentId
      ? `Content ${contentId}`
      : "the topic";
    const items = Array.from({ length: count }).map((_, i) => ({
      q: `(${i + 1}) What is one key concept about ${topic}?`,
      a: `Answer: A fundamental principle of ${topic} explained simply.`,
    }));
    return {
      type: "quiz",
      provider: "mock",
      items,
    };
  }

  /** Explain like I'm 5. */
  // PUBLIC_INTERFACE
  async explainELI5({ text = "", contentId = "" }) {
    const subject = text?.trim()
      ? text.trim().slice(0, 120)
      : contentId
      ? `Content ${contentId}`
      : "this";
    return {
      type: "eli5",
      provider: "mock",
      content:
        `ELI5 (mock): Imagine ${subject} is like building with blocks—` +
        `we start small, stack pieces carefully, and make sure each part supports the next.`,
    };
  }
}
