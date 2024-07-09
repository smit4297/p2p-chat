'use client'

import React, { useRef, useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Send, PaperclipIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface ChatUIProps {
  mode: 'start' | 'join' | null;
  setMode: (mode: 'start' | 'join' | null) => void;
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
  sendProgress: number;
  receiveProgress: number;
  receivedFiles: { name: string, url: string }[];
  handleDisconnect: () => void;
  resetState: () => void;
}

const ChatUI: React.FC<ChatUIProps> = ({
  mode,
  peerId,
  remotePeerId,
  setRemotePeerId,
  message,
  setMessage,
  receivedMessages,
  isConnected,
  isPeerConnected,
  handleConnect,
  handleSend,
  handleSendFile,
  sendProgress,
  receiveProgress,
  receivedFiles,
  setMode,
  handleDisconnect,
  resetState
}) => {  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [receivedMessages, sendProgress, receiveProgress]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSendFile(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!mode) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>WebRTC Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <Button onClick={() => {resetState();setMode('start');}}>Start Chat</Button>
            <Button onClick={() => {resetState();setMode('join');}} variant="outline">Join Chat</Button>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle>{mode === 'start' ? 'Start a chat' : 'Join a chat'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {peerId && (
              <div>
                <h3 className="text-sm font-medium mb-2">Your code (share with peer):</h3>
                <p className="bg-muted p-2 rounded break-all">{peerId}</p>
              </div>
            )}
            <div className={`border-t pt-4 ${mode === 'start' && !isPeerConnected ? 'opacity-50' : ''}`}>
              <h3 className="text-sm font-medium mb-2">Enter peer's code:</h3>
              <Input
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Enter peer code"
                disabled={mode === 'start' && !isPeerConnected}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleConnect}
              disabled={mode === 'start' && !isPeerConnected}
            >
              {mode === 'start' && !isPeerConnected ? 'Wait for connection' : 'Connect'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen bg-background">
      <Card className="w-full max-w-3xl mx-auto flex flex-col" style={{ height: '90vh' }}>
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
              <AvatarImage src="" alt="User" />
              <AvatarFallback>F</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base sm:text-lg">Friend</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">Active</p>
            </div>
          </div>
          {isConnected && (
            <Button variant="destructive" onClick={() => setIsDialogOpen(true)}>
              Disconnect
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-2 sm:p-4">
          <ScrollArea className="flex-1 pr-2 sm:pr-4" ref={scrollAreaRef}>
            <div className="space-y-3 sm:space-y-4">
            {receivedMessages.map((msg, index) => {
                const isMe = msg.startsWith('Me:');
                const [sender, ...contentParts] = msg.split(': ');
                const content = contentParts.join(': '); // Rejoin in case there are colons in the message
                const fileName = content.split('File received - ')[1];
                // Check if the message is a file
                const file = receivedFiles.find(file => file.name === fileName);
                const isFile = !!file;
                return (
                  <div key={index} className={cn("flex items-start", isMe ? "justify-end" : "justify-start", "mb-3 sm:mb-4")}>
                    {!isMe && (
                      <Avatar className="h-6 w-6 sm:h-8 sm:w-8 mr-1 sm:mr-2 flex-shrink-0">
                        <AvatarImage src="" alt="User" />
                        <AvatarFallback>F</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn("flex flex-col max-w-[75%] sm:max-w-[70%]", isMe ? "items-end" : "items-start")}>
                      {!isMe && <span className="text-xs sm:text-sm text-muted-foreground mb-1"></span>}
                      <div className={cn(
                        "rounded-lg py-1 px-2 sm:py-2 sm:px-3 break-words text-sm sm:text-base",
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted",
                        "whitespace-pre-wrap" // Add this class
                      )}>
                        {isFile ? (
                          <a href={file.url} download={file.name} className="text-blue-500 underline">
                            {file.name}
                          </a>
                        ) : (
                          `${content}` // Use backticks here
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
            {(sendProgress > 0 || receiveProgress > 0) && (
              <div className="mt-3 sm:mt-4">
                <Progress value={sendProgress > 0 ? sendProgress : receiveProgress} className="w-full" />
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {sendProgress > 0 ? 'Sending file...' : 'Receiving file...'}
                </p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <div className="p-2 sm:p-4 border-t flex items-start space-x-2">
            <Button variant="ghost" size="icon" onClick={() => document.getElementById('file-input')?.click()}>
              <PaperclipIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 text-sm sm:text-base min-h-[40px] max-h-[120px] resize-none"
              rows={3}
            />
            <Button variant="ghost" size="icon" onClick={handleSend}>
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
        </div>
      </Card>
      <ToastContainer />
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Disconnect</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p>Are you sure you want to disconnect? This will end the chat session.</p>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisconnect}>Disconnect</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatUI;