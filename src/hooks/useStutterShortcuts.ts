import { useEffect } from "react";
import { desktopApi, onStutterMarked } from "../api";
import type { MessageKey } from "../i18n";
import type { ToastNotification } from "../types";

/**
 * Toast when a stutter is marked (UI, IPC socket or CLI), and mark one with
 * Ctrl/Cmd+Shift+S while the app has focus.
 */
export function useStutterShortcuts(
  addToast: (toast: Omit<ToastNotification, "id">) => void,
  t: (key: MessageKey) => string,
) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void onStutterMarked(() => {
      addToast({ type: "warning", tag: "STUTTER", title: t("markStutterButton"), message: t("stutterMarkedNotice") });
    }).then((fn) => {
      if (disposed) fn(); else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [addToast, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyS") {
        e.preventDefault();
        void desktopApi.markStutter();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
