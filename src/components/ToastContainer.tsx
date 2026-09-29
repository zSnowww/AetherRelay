import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import type { ToastNotification } from "../types";

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <aside className="toast-viewport" aria-live="polite" aria-label="Notificaciones">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </aside>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}) {
  const duration = toast.duration ?? 4500;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration <= 0) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [duration, onDismiss, toast.id]);

  const IconComponent =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
      ? AlertCircle
      : toast.type === "warning"
      ? AlertTriangle
      : Info;

  return (
    <div
      className={`toast-card toast-${toast.type}`}
      role="status"
      onClick={() => onDismiss(toast.id)}
    >
      <div className="toast-icon-wrapper">
        <IconComponent size={17} />
      </div>
      <div className="toast-body">
        <div className="toast-header-row">
          {toast.tag && <span className="toast-tag">{toast.tag}</span>}
          {toast.title && <strong className="toast-title">{toast.title}</strong>}
        </div>
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="toast-close-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(toast.id);
        }}
        title="Descartar"
      >
        <X size={13} />
      </button>

      {duration > 0 && (
        <div className="toast-progress-track">
          <div
            className="toast-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
