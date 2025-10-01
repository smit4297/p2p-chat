"use client";

import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { X, FileIcon, AlertCircle } from "lucide-react";
import { formatFileSize } from "@/lib/utils/file-utils";
import type { FileTransfer } from "@/lib/types";

interface FileTransferItemProps {
  transfer: FileTransfer;
  onCancel: (fileId: string) => void;
}

export function FileTransferItem({ transfer, onCancel }: FileTransferItemProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide completed or cancelled transfers immediately
  useEffect(() => {
    if (transfer.status === "completed" || transfer.status === "cancelled") {
      setIsVisible(false);
    }
  }, [transfer.status]);

  // Auto-hide failed transfers after 5 seconds
  useEffect(() => {
    if (transfer.status === "failed") {
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Also trigger removal from parent state
        onCancel(transfer.fileId);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [transfer.status, transfer.fileId, onCancel]);

  if (!isVisible) {
    return null;
  }

  const isFailed = transfer.status === "failed";
  const canCancel = transfer.status === "pending" || transfer.status === "in-progress" || transfer.status === "failed";

  return (
    <div className={`rounded-lg p-3 space-y-2 animate-fade-in ${
      isFailed ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded ${
          isFailed ? "bg-destructive/10" : "bg-primary/10"
        }`}>
          {isFailed ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <FileIcon className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={transfer.originalName}>
            {transfer.originalName}
          </p>
          <p className={`text-xs ${isFailed ? "text-destructive" : "text-muted-foreground"}`}>
            {formatFileSize(transfer.fileSize)} • {
              isFailed
                ? "Transfer failed"
                : (transfer.direction === "send" ? "Sending" : "Receiving")
            }
          </p>
        </div>
        {canCancel && (
          <Button
            onClick={() => onCancel(transfer.fileId)}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={isFailed ? "Remove" : "Cancel"}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isFailed && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="capitalize">{transfer.status}</span>
            <span>{Math.round(transfer.progress)}%</span>
          </div>
          <Progress value={transfer.progress} className="h-2" />
        </div>
      )}

      {isFailed && (
        <p className="text-xs text-destructive">
          Auto-removing in 5 seconds...
        </p>
      )}
    </div>
  );
}

export function FileTransferList({
  transfers,
  onCancel,
}: {
  transfers: Map<string, FileTransfer>;
  onCancel: (fileId: string) => void;
}) {
  const activeTransfers = Array.from(transfers.values()).filter(
    (t) => t.status !== "cancelled" && t.status !== "completed"
  );

  if (activeTransfers.length === 0) return null;

  return (
    <div className="space-y-2 px-4 pb-2">
      {activeTransfers.map((transfer) => (
        <FileTransferItem
          key={transfer.fileId}
          transfer={transfer}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
