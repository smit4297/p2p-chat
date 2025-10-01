"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Users } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import RandomQuote from "../RandomQuote";
import type { ChatMode } from "@/lib/types";

interface ModeSelectionProps {
  onSelectMode: (mode: ChatMode) => void;
}

export function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 dark:bg-blue-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 dark:bg-pink-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gradient mb-2">PeerLink</h1>
          <p className="text-muted-foreground">Serverless P2P Chat & File Sharing</p>
        </div>

        {/* Mode selection card */}
        <Card className="glass-strong border-2 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Choose how you&apos;d like to connect
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => onSelectMode("start")}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 transition-opacity h-14 text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <MessageSquarePlus className="mr-2 h-5 w-5" />
              Start New Chat
            </Button>
            <Button
              onClick={() => onSelectMode("join")}
              size="lg"
              variant="outline"
              className="h-14 text-base font-medium border-2 hover:bg-muted/50 transform hover:scale-105 transition-all"
            >
              <Users className="mr-2 h-5 w-5" />
              Join Existing Chat
            </Button>
          </CardContent>
        </Card>

        {/* Quote */}
        <div className="mt-8 text-center">
          <RandomQuote />
        </div>
      </div>
    </div>
  );
}
