"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Send, PaperclipIcon, ChevronDown, Copy, Download, FileIcon, Upload } from "lucide-react";
import { FileTransferList } from "./FileTransferItem";
import { formatMessageTime } from "@/lib/utils/format-utils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import type { FileTransfer, ReceivedFile } from "@/lib/types";

interface ChatInterfaceProps {
  message: string;
  setMessage: (msg: string) => void;
  receivedMessages: string[];
  receivedFiles: ReceivedFile[];
  onSend: () => void;
  onSendFile: (file: File) => void;
  onDisconnect: () => void;
  fileTransfers: Map<string, FileTransfer>;
  onCancelTransfer: (fileId: string) => void;
}

export function ChatInterface({
  message,
  setMessage,
  receivedMessages,
  receivedFiles,
  onSend,
  onSendFile,
  onDisconnect,
  fileTransfers,
  onCancelTransfer,
}: ChatInterfaceProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const { copy } = useCopyToClipboard();

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [receivedMessages, scrollToBottom]);

  // Handle scroll button visibility
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );

    const handleScroll = () => {
      if (scrollElement) {
        const isNearBottom =
          scrollElement.scrollHeight -
            scrollElement.scrollTop -
            scrollElement.clientHeight <
          100;
        setShowScrollButton(!isNearBottom);
      }
    };

    scrollElement?.addEventListener("scroll", handleScroll);
    return () => scrollElement?.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSend();
      scrollToBottom();
    }
  }, [message, onSend, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach((file) => onSendFile(file));
      }
      e.target.value = "";
    },
    [onSendFile]
  );

  const handleCopy = async (text: string) => {
    const success = await copy(text);
    if (success) {
      toast.success("Copied to clipboard");
    }
  };

  const handleDisconnect = () => {
    setIsDialogOpen(false);
    onDisconnect();
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        toast.info(`Sending ${files.length} file${files.length > 1 ? "s" : ""}...`);
        files.forEach((file) => onSendFile(file));
      }
    },
    [onSendFile]
  );

  // Show drag overlay when files are being dragged
  useEffect(() => {
    if (dragCounter > 0) {
      setIsDragging(true);
    }
  }, [dragCounter]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 p-4">
      <Card
        className="w-full max-w-4xl flex flex-col glass-strong shadow-2xl animate-fade-in relative"
        style={{ height: "90vh" }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <CardHeader className="flex-row items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarFallback className="bg-gradient-primary text-white">
                F
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">Friend</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsDialogOpen(true)}
            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          >
            Disconnect
          </Button>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
          <ScrollArea className="flex-1 px-4 custom-scrollbar" ref={scrollAreaRef}>
            <div className="space-y-4 py-4">
              {receivedMessages.map((msg, index) => {
                const isMe = msg.startsWith("Me:");
                const [sender, ...contentParts] = msg.split(": ");
                const content = contentParts.join(": ");
                const fileMatch = content.match(
                  /File (received|sent) - (.*) \((.*)\)/
                );
                const isFile = !!fileMatch;
                const fileName = fileMatch ? fileMatch[2] : "";
                const fileId = fileMatch ? fileMatch[3] : "";
                const file = receivedFiles.find((f) => f.id === fileId);

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-end gap-2 animate-fade-in",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isMe && (
                      <Avatar className="h-8 w-8 border-2 border-muted">
                        <AvatarFallback>F</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "group relative max-w-[70%]",
                        isMe ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2 shadow-sm",
                          isMe
                            ? "bg-gradient-primary text-white"
                            : "bg-muted"
                        )}
                      >
                        {isFile && file ? (
                          <a
                            href={file.url}
                            download={file.name}
                            onClick={() => {
                              toast.success(`Downloading ${file.name}`);
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group"
                          >
                            <Download className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-sm">{file.name}</span>
                              <span className="text-xs text-muted-foreground">Click to download</span>
                            </div>
                          </a>
                        ) : isFile && !file ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileIcon className="h-4 w-4" />
                            <span className="text-sm">{fileName}</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {content}
                            </p>
                            {!isMe && !isFile && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleCopy(content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-2xs text-muted-foreground mt-1 px-1">
                        {formatMessageTime(Date.now())}
                      </p>
                    </div>
                    {isMe && (
                      <Avatar className="h-8 w-8 border-2 border-primary">
                        <AvatarFallback className="bg-gradient-primary text-white">
                          U
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* File transfers */}
          <FileTransferList transfers={fileTransfers} onCancel={onCancelTransfer} />

          {/* Input */}
          <div className="p-4 border-t flex items-end gap-2">
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => document.getElementById("file-input")?.click()}
              className="shrink-0"
            >
              <PaperclipIcon className="h-5 w-5" />
            </Button>
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 min-h-[44px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="bg-gradient-primary hover:opacity-90 shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            className="fixed bottom-24 right-8 rounded-full p-3 shadow-lg animate-bounce-in"
            onClick={scrollToBottom}
            size="icon"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        )}

        {/* Drag & Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-md border-4 border-dashed border-primary rounded-lg flex items-center justify-center z-50 animate-fade-in">
            <div className="text-center pointer-events-none">
              <Upload className="h-20 w-20 text-primary mx-auto mb-4 animate-bounce" />
              <p className="text-2xl font-bold text-primary mb-2">Drop files here</p>
              <p className="text-sm text-muted-foreground">
                Release to send files to your friend
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Disconnect Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect from chat?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            This will end the current session and close the connection with your friend.
          </p>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
