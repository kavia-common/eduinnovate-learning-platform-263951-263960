//
// Notes repository with Supabase (if configured) and graceful localStorage fallback.
// Table: notes { id, user_id, context_type, context_id, title, content, created_at, share_id? }
//
// PUBLIC_INTERFACE
import supabase from "../auth/supabaseClient";
import { useAuth } from "../auth/AuthContext";

// local storage keys
const LS_NOTES_KEY = "lms.notes.v1";
const LS_SHARE_PREFIX = "lms.share.notes.v1:";

/**
 * Generate a URL-safe base64 from content (smallish).
 */
function urlSafeBase64(str) {
  try {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } catch {
    return "";
  }
}

function readLocalNotes() {
  try {
    const raw = localStorage.getItem(LS_NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function writeLocalNotes(store) {
  try {
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(store || {}));
  } catch {
    // ignore
  }
}

/**
 * PUBLIC_INTERFACE
 * NotesRepo - plain functions for use outside React as well.
 */
export const NotesRepo = {
  /**
   * PUBLIC_INTERFACE
   * create - saves a note; if Supabase available and auth present, uses DB; else localStorage.
   * @param {{userId?: string, context_type?: string, context_id?: string, title: string, content: string}} note
   * @returns {Promise<object>} saved note
   */
  async create(note) {
    const payload = {
      context_type: note.context_type || "course",
      context_id: note.context_id || "",
      title: String(note.title || "").slice(0, 200) || "Untitled",
      content: String(note.content || ""),
    };
    if (supabase) {
      // require auth
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        const e = new Error("AUTH_REQUIRED");
        e.code = "AUTH_REQUIRED";
        throw e;
      }
      const row = { ...payload, user_id: userId };
      const { data, error } = await supabase.from("notes").insert(row).select("*").single();
      if (error) {
        throw new Error("SUPABASE_NOTES_FAILED");
      }
      return data;
    }
    // Local fallback
    const store = readLocalNotes();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const created_at = new Date().toISOString();
    const item = { id, ...payload, created_at, user_id: note.userId || "local" };
    store[id] = item;
    writeLocalNotes(store);
    return item;
  },

  /**
   * PUBLIC_INTERFACE
   * list - list notes for current user (Supabase) or all local notes.
   * Supports basic query search across title/content.
   */
  async list({ q = "", limit = 200 } = {}) {
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        const e = new Error("AUTH_REQUIRED");
        e.code = "AUTH_REQUIRED";
        throw e;
      }
      let query = supabase.from("notes").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (q && q.trim()) {
        // basic ilike across title OR content
        const term = q.trim();
        query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
      }
      const { data, error } = await query.limit(limit);
      if (error) throw new Error("SUPABASE_NOTES_FAILED");
      return data || [];
    }
    const store = readLocalNotes();
    const all = Object.values(store);
    let items = all.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    if (q && q.trim()) {
      const qq = q.trim().toLowerCase();
      items = items.filter(
        (n) => n.title?.toLowerCase().includes(qq) || n.content?.toLowerCase().includes(qq)
      );
    }
    return items.slice(0, limit);
  },

  /**
   * PUBLIC_INTERFACE
   * remove - delete note.
   */
  async remove(id) {
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        const e = new Error("AUTH_REQUIRED");
        e.code = "AUTH_REQUIRED";
        throw e;
      }
      const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", userId);
      if (error) throw new Error("SUPABASE_NOTES_FAILED");
      return true;
    }
    const store = readLocalNotes();
    if (store[id]) {
      delete store[id];
      writeLocalNotes(store);
      return true;
    }
    return false;
  },

  /**
   * PUBLIC_INTERFACE
   * getById - fetch single note.
   */
  async getById(id) {
    if (supabase) {
      const { data, error } = await supabase.from("notes").select("*").eq("id", id).single();
      if (error) throw new Error("SUPABASE_NOTES_FAILED");
      return data;
    }
    const store = readLocalNotes();
    return store[id] || null;
  },

  /**
   * PUBLIC_INTERFACE
   * createShareLink - when Supabase is present and user is authed, persist a share_id to note
   * and return a /share/:id URL. Otherwise fallback to clipboard copy mechanism.
   * @returns {Promise<{url?: string, shareId?: string, mode: 'supabase'|'local', encoded?: string}>}
   */
  async createShareLink(note, { frontendOrigin } = {}) {
    const origin = frontendOrigin || process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        const e = new Error("AUTH_REQUIRED");
        e.code = "AUTH_REQUIRED";
        throw e;
      }
      const shareId =
        note.share_id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      // Upsert share_id if not present
      if (!note.share_id) {
        const { error } = await supabase
          .from("notes")
          .update({ share_id: shareId })
          .eq("id", note.id)
          .eq("user_id", userId);
        if (error) throw new Error("SUPABASE_NOTES_FAILED");
      }
      const url = `${origin.replace(/\/+$/, "")}/share/${encodeURIComponent(shareId)}`;
      return { url, shareId, mode: "supabase" };
    }
    // Local fallback: encode content into URL fragment (not sent to server)
    const encoded = urlSafeBase64(JSON.stringify({ title: note.title, content: note.content }));
    // Store to localStorage with a short key so /share route could potentially read it if we ever enable
    const shareId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      localStorage.setItem(LS_SHARE_PREFIX + shareId, encoded);
    } catch {
      // ignore
    }
    return { mode: "local", encoded, shareId };
  },

  /**
   * PUBLIC_INTERFACE
   * resolveShared - given shareId, try to fetch shared content. Supabase mode requires a share_id column.
   * For local mode, look in localStorage.
   */
  async resolveShared(shareId) {
    if (supabase) {
      // Read-only: locate note by share_id without requiring auth
      const { data, error } = await supabase.from("notes").select("title,content,created_at").eq("share_id", shareId).single();
      if (error) throw new Error("SHARE_NOT_FOUND");
      return data;
    }
    // local fallback
    try {
      const encoded = localStorage.getItem(LS_SHARE_PREFIX + shareId);
      if (!encoded) throw new Error("SHARE_NOT_FOUND");
      const json = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
      const parsed = JSON.parse(decodeURIComponent(escape(json)));
      return parsed;
    } catch {
      throw new Error("SHARE_NOT_FOUND");
    }
  },
};

/**
 * PUBLIC_INTERFACE
 * useNotesRepo - convenience hook returning repo plus auth awareness if needed later.
 */
export function useNotesRepo() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isAuthenticated } = useAuth();
  return { ...NotesRepo, isAuthenticated };
}
