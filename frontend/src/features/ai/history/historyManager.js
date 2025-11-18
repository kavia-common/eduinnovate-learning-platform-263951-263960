//
// PUBLIC_INTERFACE
// HistoryManager - persists last N AI interactions per context (courseId + optional assignmentId)
// using localStorage. Provides API to store, list, get, select, and clear.
//
const STORAGE_KEY = "lms.ai.history.v1";
const MAX_PER_CONTEXT = 20;

/**
 * Build a stable key for a given context.
 */
function ctxKey({ courseId = "", assignmentId = "" } = {}) {
  const c = String(courseId || "").trim();
  const a = String(assignmentId || "").trim();
  return a ? `course:${c}::assignment:${a}` : `course:${c}`;
}

/**
 * Safely read the entire store from localStorage.
 */
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Safely write the entire store.
 */
function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store || {}));
  } catch {
    // ignore quota or serialization errors
  }
}

/**
 * PUBLIC_INTERFACE
 * saveInteraction - append an interaction to a context list (capped to last 20).
 * @param {object} context - { courseId, assignmentId? }
 * @param {object} payload - { id, timestamp, prompt, result, provider, meta }
 */
export function saveInteraction(context, payload) {
  const key = ctxKey(context);
  const store = readStore();
  const list = Array.isArray(store[key]) ? store[key] : [];
  const id = payload?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    timestamp: payload?.timestamp || new Date().toISOString(),
    prompt: String(payload?.prompt || ""),
    result: payload?.result || null,
    provider: payload?.provider || "",
    meta: payload?.meta || {},
  };
  const next = [entry, ...list].slice(0, MAX_PER_CONTEXT);
  store[key] = next;
  writeStore(store);
  return entry;
}

/**
 * PUBLIC_INTERFACE
 * listHistory - returns list of entries for context, newest first.
 */
export function listHistory(context) {
  const key = ctxKey(context);
  const store = readStore();
  return Array.isArray(store[key]) ? store[key] : [];
}

/**
 * PUBLIC_INTERFACE
 * getInteraction - lookup by id within context.
 */
export function getInteraction(context, id) {
  const items = listHistory(context);
  return items.find((x) => x.id === id) || null;
}

/**
 * PUBLIC_INTERFACE
 * clearHistory - removes the history for the context.
 */
export function clearHistory(context) {
  const key = ctxKey(context);
  const store = readStore();
  if (store[key]) {
    delete store[key];
    writeStore(store);
  }
}

/**
 * PUBLIC_INTERFACE
 * upsertInteraction - replace an entry by id (or add if not exists).
 */
export function upsertInteraction(context, entry) {
  const key = ctxKey(context);
  const store = readStore();
  const list = Array.isArray(store[key]) ? store[key] : [];
  const idx = list.findIndex((x) => x.id === entry.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry };
  } else {
    list.unshift(entry);
  }
  store[key] = list.slice(0, MAX_PER_CONTEXT);
  writeStore(store);
  return entry;
}
