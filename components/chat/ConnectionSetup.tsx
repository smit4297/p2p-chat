"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Loader2 } from "lucide-react";
import { formatPeerCode } from "@/lib/utils/format-utils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/useToast";
import type { ChatMode } from "@/lib/types";

interface ConnectionSetupProps {
  mode: ChatMode;
  peerId: string;
  remotePeerId: string;
  setRemotePeerId: (id: string) => void;
  isPeerConnected: boolean;
  onConnect: () => void;
}

export function ConnectionSetup({
  mode,
  peerId,
  remotePeerId,
  setRemotePeerId,
  isPeerConnected,
  onConnect,
}: ConnectionSetupProps) {
  const { copy, isCopied } = useCopyToClipboard();
  const { toast } = useToast();

  const handleCopyCode = async () => {
    const success = await copy(peerId);
    if (success) {
      toast.success("Code copied to clipboard!");
    } else {
      toast.error("Failed to copy code");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && remotePeerId) {
      e.preventDefault();
      onConnect();
    }
  };

  const isWaitingForPeer = mode === "start" && !isPeerConnected;
  const canConnect = remotePeerId.trim().length > 0 && !isWaitingForPeer;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-4">
      <Card className="w-full max-w-md glass-strong shadow-2xl animate-fade-in">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {mode === "start" ? "Start a Chat" : "Join a Chat"}
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {mode === "start"
              ? "Share your code with a friend to connect"
              : "Enter your friend's code to connect"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Your code section */}
          {peerId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Code</label>
              <div className="relative">
                <div className="flex items-center gap-2 bg-gradient-primary text-white p-4 rounded-lg shadow-md">
                  <span className="text-3xl font-mono font-bold tracking-wider flex-1 text-center">
                    {formatPeerCode(peerId)}
                  </span>
                  <Button
                    onClick={handleCopyCode}
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 5 minutes
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Connect</span>
            </div>
          </div>

          {/* Remote peer code input */}
          <div
            className={`space-y-2 transition-opacity ${
              isWaitingForPeer ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <label className="text-sm font-medium">Friend&apos;s Code</label>
            <div className="space-y-3">
              <Input
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter 6-digit code"
                disabled={isWaitingForPeer}
                maxLength={6}
                className="text-center text-xl font-mono tracking-wider h-12"
              />
              <Button
                onClick={onConnect}
                disabled={!canConnect}
                className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                {isWaitingForPeer ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Waiting for friend...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>

          {isWaitingForPeer && (
            <div className="text-center animate-pulse">
              <p className="text-sm text-muted-foreground">
                Waiting for your friend to join...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
