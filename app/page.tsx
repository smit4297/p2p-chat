'use client'

import React, { useState } from 'react';
import useWebRTC from '../hooks/useWebRTC';
import ChatUI from '../components/ChatUI';
import 'react-toastify/dist/ReactToastify.css';
import { ConnectionProvider } from '../context/ConnectionContext';

export default function Home() {
  const [mode, setMode] = useState<'start' | 'join' | null>(null);

  return (
    <ConnectionProvider>
      <WebRTCWrapper mode={mode} setMode={setMode} />
    </ConnectionProvider>
  );
}

const WebRTCWrapper = ({ mode, setMode }: { mode: 'start' | 'join' | null, setMode: (mode: 'start' | 'join' | null) => void }) => {
  const {
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
    receivedFiles,
    handleDisconnect,
    resetState,
    fileTransfers,
    cancelFileTransfer
  } = useWebRTC({ mode, setMode });

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
      isPeerConnected={isPeerConnected}
      handleConnect={handleConnect}
      handleSend={handleSend}
      handleSendFile={handleSendFile}
      receivedFiles={receivedFiles}
      setMode={setMode}
      handleDisconnect={handleDisconnect}
      resetState={resetState}
      fileTransfers={fileTransfers}
      cancelFileTransfer={cancelFileTransfer}
    />
  );
};