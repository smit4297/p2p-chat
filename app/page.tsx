"use client";

import React, { useState } from "react";
import { ConnectionProvider } from "../context/ConnectionContext";
import { ToastProvider } from "../contexts/ToastContext";
import { Toaster } from "../components/Toaster";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useWebRTCIntegrated } from "../hooks/useWebRTCIntegrated";
import { ModeSelection } from "../components/chat/ModeSelection";
import { ConnectionSetup } from "../components/chat/ConnectionSetup";
import { ChatInterface } from "../components/chat/ChatInterface";
import type { ChatMode } from "../lib/types";

export default function Home() {
  const [mode, setMode] = useState<ChatMode>(null);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConnectionProvider>
          <PeerLinkApp mode={mode} setMode={setMode} />
          <Toaster />
        </ConnectionProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

function PeerLinkApp({
  mode,
  setMode,
}: {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}) {
  const {
    peerId,
    remotePeerId,
    setRemotePeerId,
    isConnected,
    isPeerConnected,
    isConnecting,
    handleConnect,
    message,
    setMessage,
    receivedMessages,
    handleSend,
    handleSendFile,
    receivedFiles,
    fileTransfers,
    cancelFileTransfer,
    resetState,
  } = useWebRTCIntegrated({ mode, setMode });

  // Mode selection screen
  if (!mode) {
    return <ModeSelection onSelectMode={setMode} />;
  }

  // Connection setup screen
  if (!isConnected) {
    return (
      <ConnectionSetup
        mode={mode}
        peerId={peerId}
        remotePeerId={remotePeerId}
        setRemotePeerId={setRemotePeerId}
        isPeerConnected={isPeerConnected}
        isConnecting={isConnecting}
        onConnect={handleConnect}
      />
    );
  }

  // Chat interface
  return (
    <ChatInterface
      message={message}
      setMessage={setMessage}
      receivedMessages={receivedMessages}
      receivedFiles={receivedFiles}
      onSend={handleSend}
      onSendFile={handleSendFile}
      onDisconnect={resetState}
      fileTransfers={fileTransfers}
      onCancelTransfer={cancelFileTransfer}
    />
  );
}