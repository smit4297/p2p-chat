"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toast as ToastType } from "@/contexts/ToastContext";

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    borderColor: "border-green-500",
    iconColor: "text-green-500",
    bgGradient: "from-green-500/10 to-green-500/5",
  },
  error: {
    icon: AlertCircle,
    borderColor: "border-red-500",
    iconColor: "text-red-500",
    bgGradient: "from-red-500/10 to-red-500/5",
  },
  info: {
    icon: Info,
    borderColor: "border-blue-500",
    iconColor: "text-blue-500",
    bgGradient: "from-blue-500/10 to-blue-500/5",
  },
  warning: {
    icon: AlertTriangle,
    borderColor: "border-orange-500",
    iconColor: "text-orange-500",
    bgGradient: "from-orange-500/10 to-orange-500/5",
  },
};

export function Toast({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;

    const duration = toast.duration; // Store in const to satisfy TypeScript
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match animation duration
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border-2 backdrop-blur-md shadow-lg transition-all duration-300",
        "bg-gradient-to-br bg-white/80 dark:bg-gray-900/80",
        config.borderColor,
        config.bgGradient,
        isExiting
          ? "animate-out slide-out-to-right fade-out"
          : "animate-in slide-in-from-top fade-in"
      )}
      style={{ minWidth: "320px", maxWidth: "400px" }}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconColor)} />
        <p className="flex-1 text-sm font-medium text-foreground">{toast.message}</p>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="h-1 w-full bg-gray-200/50 dark:bg-gray-700/50">
          <div
            className={cn(
              "h-full transition-all duration-75 ease-linear",
              config.iconColor.replace("text-", "bg-")
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
