// ChatUI.tsx

"use client";

import React, { useRef, useEffect, useState, useCallback, memo } from "react";
import { ToastContainer } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Send, PaperclipIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { FileTransfer } from "../hooks/useWebRTC";
import { ChevronDown } from "lucide-react";
import RandomQuote from "./RandomQuote";

interface ChatUIProps {
  mode: "start" | "join" | null;
  setMode: (mode: "start" | "join" | null) => void;
  peerId: string;
  remotePeerId: string;
  setRemotePeerId: (id: string) => void;
  message: string;
  setMessage: (msg: string) => void;
  receivedMessages: string[];
  isConnected: boolean;
  isPeerConnected: boolean;
  handleConnect: () => void;
  handleSend: () => void;
  handleSendFile: (file: File) => void;
  receivedFiles: { id: string; name: string; url: string }[];
  handleDisconnect: () => void;
  resetState: () => void;
  fileTransfers: Map<string, FileTransfer>;
  cancelFileTransfer: (fileId: string) => void;
}

const FileTransferProgress: React.FC<{
  transfer: FileTransfer;
  onCancel: (fileId: string) => void;
}> = memo(({ transfer, onCancel }) => {
  if (transfer.status === "cancelled" || transfer.progress === 100) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-muted rounded-md">
      <div className="flex justify-between text-sm">
        <span>{transfer.originalName}</span>
        <span>{transfer.progress.toFixed(0)}%</span>
      </div>
      <Progress value={transfer.progress} className="w-full mt-1" />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>
          {transfer.direction === "send" ? "Sending" : "Receiving"} file...
        </span>
        <span>{transfer.status}</span>
      </div>
      {transfer.status !== "completed" && (
        <Button
          variant="default"
          size="sm"
          onClick={() => onCancel(transfer.fileId)}
          className="mt-2"
        >
          Cancel
        </Button>
      )}
    </div>
  );
});
FileTransferProgress.displayName = "FileTransferProgress";

const FileTransferList: React.FC<{
  transfers: Map<string, FileTransfer>;
  onCancel: (fileId: string) => void;
}> = memo(({ transfers, onCancel }) => {
  return (
    <div className="space-y-2">
      {Array.from(transfers.values()).map((transfer) => (
        <FileTransferProgress
          key={transfer.fileId}
          transfer={transfer}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
});
FileTransferList.displayName = "FileTransferList";

const ChatUI: React.FC<ChatUIProps> = ({
  mode,
  setMode,
  peerId,
  remotePeerId,
  setRemotePeerId,
  message,
  setMessage,
  receivedMessages,
  isConnected,
  isPeerConnected,
  handleConnect,
  handleSend: handleSendProp,
  handleSendFile,
  receivedFiles,
  handleDisconnect,
  resetState,
  fileTransfers,
  cancelFileTransfer,
}) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManualScrolling, setIsManualScrolling] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
        // Force a recheck after a short delay
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }, 50);
      }
    }
  }, []);

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
          20;
        setIsManualScrolling(!isNearBottom);
      }
    };

    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (scrollElement && !isManualScrolling) {
      const isNearBottom =
        scrollElement.scrollHeight -
          scrollElement.scrollTop -
          scrollElement.clientHeight <
        20;
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [receivedMessages, fileTransfers, isManualScrolling, scrollToBottom]);

  const ScrollToBottomButton = () => {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
      const scrollElement = scrollAreaRef.current?.querySelector(
        "[data-radix-scroll-area-viewport]"
      );

      const checkScrollPosition = () => {
        if (scrollElement) {
          const isNearBottom =
            scrollElement.scrollHeight -
              scrollElement.scrollTop -
              scrollElement.clientHeight <
            100;
          setShowButton(!isNearBottom);
        }
      };

      if (scrollElement) {
        scrollElement.addEventListener("scroll", checkScrollPosition);
        // Initial check
        checkScrollPosition();
      }

      return () => {
        if (scrollElement) {
          scrollElement.removeEventListener("scroll", checkScrollPosition);
        }
      };
    }, []);

    if (!showButton) return null;

    return (
      <Button
        className="fixed bottom-4 right-4 rounded-full p-3 bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 sm:bottom-6 sm:right-6 sm:p-4"
        onClick={() => {
          setIsManualScrolling(false);
          scrollToBottom();
        }}
        aria-label="Scroll to bottom"
      >
        <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
    );
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach((file) => handleSendFile(file));
      }
      e.target.value = "";
    },
    [handleSendFile]
  );

  const handleSend = useCallback(() => {
    handleSendProp();
    scrollToBottom();
  }, [handleSendProp, scrollToBottom]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleKeyDownPeer = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleConnect();
      }
    },
    [handleConnect]
  );

  if (!mode) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-background">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">PeerLink</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <Button onClick={() => { resetState(); setMode('start'); }} className="text-sm sm:text-base">Start Chat</Button>
            <Button onClick={() => { resetState(); setMode('join'); }} variant="outline" className="text-sm sm:text-base">Join Chat</Button>
          </CardContent>
        </Card>
        <div className="mt-4 text-center">
          <RandomQuote /> 
        </div>
        <ToastContainer />
      </div>
    );
}

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              {mode === "start" ? "Start a chat" : "Join a chat"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {peerId && (
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Your code (share with peer):
                </h3>
                <p className="bg-muted p-2 rounded break-all text-xs sm:text-sm">
                  {peerId}
                </p>
              </div>
            )}
            <div
              className={`border-t pt-4 ${
                mode === "start" && !isPeerConnected ? "opacity-50" : ""
              }`}
            >
              <h3 className="text-sm font-medium mb-2">
                Enter peer&apos;s code:
              </h3>
              <Input
                value={remotePeerId}
                onKeyDown={handleKeyDownPeer}
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Enter peer code"
                disabled={mode === "start" && !isPeerConnected}
                className="text-xs sm:text-sm"
              />
            </div>
            <Button
              className="w-full text-sm sm:text-base"
              onClick={handleConnect}
              disabled={mode === "start" && !isPeerConnected}
            >
              {mode === "start" && !isPeerConnected
                ? "Wait for connection"
                : "Connect"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-background">
      <Card
        className="w-full max-w-3xl mx-auto flex flex-col"
        style={{ height: "90vh" }}
      >
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
              <AvatarImage src="" alt="User" />
              <AvatarFallback>F</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base sm:text-sm">Friend</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
            </div>
          </div>
          {isConnected && (
            <Button
              variant="default"
              onClick={() => setIsDialogOpen(true)}
              className="text-xs sm:text-sm"
            >
              Disconnect
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-2 sm:p-4">
          <ScrollArea className="flex-1 pr-2 sm:pr-4" ref={scrollAreaRef}>
            <div className="space-y-3 sm:space-y-4">
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
                const file = receivedFiles.find((file) => file.id === fileId);

                if (
                  isFile &&
                  index !==
                    receivedMessages.findIndex((m) => m.includes(fileId))
                ) {
                  return null;
                }

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start",
                      isMe ? "justify-end" : "justify-start",
                      "mb-3 sm:mb-4"
                    )}
                  >
                    {!isMe && (
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 mr-1 sm:mr-2 flex-shrink-0">
                        <AvatarImage src="" alt="User" />
                        <AvatarFallback>F</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "flex flex-col max-w-[75%] sm:max-w-[70%]",
                        isMe ? "items-end" : "items-start"
                      )}
                    >
                      {!isMe && (
                        <span className="text-2xs sm:text-xs text-muted-foreground mb-1">
                          {}
                        </span>
                      )}
                      <div
                        className={cn(
                          "rounded-lg py-1 px-2 sm:py-2 sm:px-3 break-words text-xs sm:text-sm",
                          isMe
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                          "whitespace-pre-wrap"
                        )}
                      >
                        {isFile ? (
                          file ? (
                            <a
                              href={file.url}
                              download={file.name}
                              className="text-blue-500 underline"
                            >
                              {file.name}
                            </a>
                          ) : (
                            `File ${isMe ? "sent" : "received"} - ${fileName}`
                          )
                        ) : (
                          content
                        )}
                      </div>
                    </div>
                    {isMe && (
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 ml-1 sm:ml-2 flex-shrink-0">
                        <AvatarImage src="" alt="User" />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
            <FileTransferList
              transfers={fileTransfers}
              onCancel={cancelFileTransfer}
            />
          </ScrollArea>
        </CardContent>
        <div className="p-2 sm:p-4 border-t flex items-start space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <PaperclipIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <Textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 text-sm sm:text-base min-h-[40px] max-h-[120px] resize-none"
            rows={3}
          />
          <Button variant="ghost" size="icon" onClick={handleSend}>
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
        <ScrollToBottomButton />
      </Card>
      <ToastContainer />
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Disconnect</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p>
              Are you sure you want to disconnect? This will end the chat
              session.
            </p>
          </div>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleDisconnect}
              className="text-sm sm:text-base"
            >
              Disconnect
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatUI;
