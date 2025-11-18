import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * ToastContext - provides showToast for success/error/info messages.
 */
const ToastContext = createContext({ showToast: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, { tone = "info", duration = 2500 } = {}) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          display: "grid",
          gap: 8,
          zIndex: 50,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            aria-label={`${t.tone} message`}
            style={{
              background: "var(--ocean-surface)",
              border: "1px solid rgba(17,24,39,0.08)",
              boxShadow: "var(--ocean-shadow)",
              borderLeft: `4px solid ${
                t.tone === "success"
                  ? "var(--ocean-secondary)"
                  : t.tone === "error"
                  ? "var(--ocean-error)"
                  : "var(--ocean-primary)"
              }`,
              padding: "10px 12px",
              borderRadius: 10,
              minWidth: 220,
              color: "var(--ocean-text)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * useToast - hook to access showToast function.
 */
export function useToast() {
  return useContext(ToastContext);
}
