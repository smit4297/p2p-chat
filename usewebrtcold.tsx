'use client'

import React from 'react';
import { ToastContainer } from 'react-toastify';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Send, PaperclipIcon } from 'lucide-react'

interface ChatUIProps {
  mode: 'start' | 'join' | null;
  peerId: string;
  remotePeerId: string;
  setRemotePeerId: (id: string) => void;
  message: string;
  setMessage: (msg: string) => void;
  receivedMessages: string[];
  isConnected: boolean;
  handleConnect: () => void;
  handleSend: () => void;
  handleSendFile: (file: File) => void;
  sendProgress: number;
  receiveProgress: number;
  receivedFiles: { name: string, url: string }[];
  setMode: (mode: 'start' | 'join' | null) => void;
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
  handleConnect,
  handleSend,
  handleSendFile,
  sendProgress,
  receiveProgress,
  receivedFiles,
  setMode,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSendFile(file);
    }
  };

  if (!mode) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>WebRTC Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <Button onClick={() => setMode('start')}>Start Chat</Button>
            <Button onClick={() => setMode('join')} variant="outline">Join Chat</Button>
          </CardContent>
        </Card>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-green-600 text-white p-4">
        <h1 className="text-xl font-bold">WebRTC Chat</h1>
        {isConnected && <p className="text-sm">Connected to: {remotePeerId}</p>}
      </header>

      <main className="flex-1 overflow-hidden">
        {!isConnected ? (
          <Card className="m-4">
            <CardHeader>
              <CardTitle>{mode === 'start' ? 'Your code' : 'Enter peer code'}</CardTitle>
            </CardHeader>
            <CardContent>
              {mode === 'start' ? (
                <p className="bg-gray-100 p-2 rounded break-all">{peerId}</p>
              ) : (
                <Input
                  value={remotePeerId}
                  onChange={(e) => setRemotePeerId(e.target.value)}
                  placeholder="Enter peer ID"
                />
              )}
              <Button className="mt-4 w-full" onClick={handleConnect}>Connect</Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-full p-4">
            {receivedMessages.map((msg, index) => (
              <div key={index} className={`mb-4 flex ${msg.startsWith('Me:') ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-lg p-2 max-w-[70%] ${msg.startsWith('Me:') ? 'bg-green-500 text-white' : 'bg-white'}`}>
                  {msg}
                </div>
              </div>
            ))}
            {(sendProgress > 0 || receiveProgress > 0) && (
              <div className="mb-4">
                <Progress value={sendProgress > 0 ? sendProgress : receiveProgress} className="w-full" />
                <p className="text-sm text-gray-500 mt-1">
                  {sendProgress > 0 ? 'Sending file...' : 'Receiving file...'}
                </p>
              </div>
            )}
          </ScrollArea>
        )}
      </main>

      {isConnected && (
        <footer className="bg-white p-4 flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={() => document.getElementById('file-input')?.click()}>
            <PaperclipIcon className="h-4 w-4" />
          </Button>
          <input
            id="file-input"
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
            className="flex-1"
          />
          <Button onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </footer>
      )}

      {receivedFiles.length > 0 && (
        <div className="bg-white p-4 border-t">
          <h3 className="font-bold mb-2">Received Files:</h3>
          {receivedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded mt-2">
              <span className="truncate flex-1">{file.name}</span>
              <Button variant="outline" size="sm" asChild>
                <a href={file.url} download={file.name}>Download</a>
              </Button>
            </div>
          ))}
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default ChatUI;