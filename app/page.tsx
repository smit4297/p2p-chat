'use client'

import React, { useState } from 'react';
import useWebRTC from '../hooks/useWebRTC';
import ChatUI from '../components/ChatUI';
import 'react-toastify/dist/ReactToastify.css';

export default function Home() {
  const [mode, setMode] = useState<'start' | 'join' | null>(null);
  const {
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
  } = useWebRTC(mode);

  return (
    <ChatUI
      mode={mode}
      peerId={peerId}
      remotePeerId={remotePeerId}
      setRemotePeerId={setRemotePeerId}
      message={message}
      setMessage={setMessage}
      receivedMessages={receivedMessages}
      isConnected={isConnected}
      handleConnect={handleConnect}
      handleSend={handleSend}
      handleSendFile={handleSendFile}
      sendProgress={sendProgress}
      receiveProgress={receiveProgress}
      receivedFiles={receivedFiles}
      setMode={setMode}
    />
  );
}
