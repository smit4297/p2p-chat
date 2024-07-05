// ChatUI.tsx
'use client';

import React from 'react';
import { ToastContainer } from 'react-toastify';

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
  setMode,
}) => {
  if (!mode) {
    return (
      <div className="flex justify-center space-x-4">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => setMode('start')}>Start Chat</button>
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={() => setMode('join')}>Join Chat</button>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      {!isConnected && (
        <div>
          <h2 className="text-xl font-bold mb-4">Your code (share with peer):</h2>
          <p className="bg-gray-100 p-2 rounded break-all">{peerId}</p>
          <p className="mt-4">Share this code with the other party.</p>
          <h2 className="text-xl font-bold mb-4">Enter peer code:</h2>
          <input
            className="w-full p-2 border rounded"
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value)}
            placeholder="Enter peer ID"
          />
          <button className="mt-4 bg-blue-500 text-white p-2 rounded w-full" onClick={handleConnect}>Connect</button>
        </div>
      )}
      {isConnected && (
        <div className="mt-6">
          <h3 className="font-bold">Messaging Console:</h3>
          <input
            className="w-full p-2 border rounded"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
          />
          <button className="mt-2 bg-green-500 text-white p-2 rounded w-full" onClick={handleSend}>Send</button>
          <div className="mt-6">
            <h3 className="font-bold">Messages:</h3>
            {receivedMessages.map((msg, index) => (
              <p key={index} className="bg-gray-100 p-2 rounded mt-2">{msg}</p>
            ))}
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default ChatUI;
