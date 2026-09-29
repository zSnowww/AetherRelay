import { useEffect } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  badge?: string;
  badgeType?: "danger" | "warning" | "info" | "success";
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  badge,
  badgeType = "danger",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className={`confirm-dialog ${isDanger ? "danger-mode" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="confirm-dialog-header">
          <div className="confirm-icon-box">
            {isDanger ? (
              <AlertTriangle size={20} />
            ) : badgeType === "warning" ? (
              <AlertCircle size={20} />
            ) : (
              <Info size={20} />
            )}
          </div>
          <div className="confirm-header-content">
            <div className="confirm-title-row">
              <h3>{title}</h3>
              {badge && <span className={`confirm-badge ${badgeType}`}>{badge}</span>}
            </div>
            <p>{description}</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onCancel}
            title={cancelText}
          >
            <X size={15} />
          </button>
        </div>

        <div className="confirm-dialog-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`primary ${isDanger ? "danger" : ""}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
