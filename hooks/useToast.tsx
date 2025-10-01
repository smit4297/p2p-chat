import { useContext } from "react";
import { ToastContext } from "@/contexts/ToastContext";

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast, removeToast } = context;

  return {
    toast: {
      success: (message: string, duration?: number) =>
        addToast("success", message, duration),
      error: (message: string, duration?: number) =>
        addToast("error", message, duration),
      info: (message: string, duration?: number) =>
        addToast("info", message, duration),
      warning: (message: string, duration?: number) =>
        addToast("warning", message, duration),
    },
    removeToast,
  };
}
