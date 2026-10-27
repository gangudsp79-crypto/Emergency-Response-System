import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, dur) => showToast(msg, "success", dur), [showToast]);
  const error = useCallback((msg, dur) => showToast(msg, "error", dur), [showToast]);
  const warning = useCallback((msg, dur) => showToast(msg, "warning", dur), [showToast]);
  const info = useCallback((msg, dur) => showToast(msg, "info", dur), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "420px",
          width: "100%",
          pointerEvents: "none"
        }}
      >
        {toasts.map((toast) => {
          let bg = "#2f3c53";
          let border = "#334155";
          let icon = <Info size={20} color="#38BDF8" />;

          if (toast.type === "success") {
            bg = "#064E3B";
            border = "#059669";
            icon = <CheckCircle2 size={20} color="#34D399" />;
          } else if (toast.type === "error") {
            bg = "#7F1D1D";
            border = "#DC2626";
            icon = <XCircle size={20} color="#F87171" />;
          } else if (toast.type === "warning") {
            bg = "#78350F";
            border = "#D97706";
            icon = <AlertTriangle size={20} color="#FBBF24" />;
          }

          return (
            <div
              key={toast.id}
              style={{
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: "10px",
                padding: "14px 16px",
                color: "#FFFFFF",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                pointerEvents: "auto",
                animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                fontSize: "0.9rem",
                lineHeight: "1.4"
              }}
            >
              <div style={{ flexShrink: 0, marginTop: "1px" }}>{icon}</div>
              <div style={{ flex: 1, wordBreak: "break-word" }}>{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
