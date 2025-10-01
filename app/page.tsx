"use client";

import React, { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ConnectionProvider } from "../context/ConnectionContext";
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
      <ConnectionProvider>
        <PeerLinkApp mode={mode} setMode={setMode} />
      </ConnectionProvider>
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
    return (
      <>
        <ModeSelection onSelectMode={setMode} />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </>
    );
  }

  // Connection setup screen
  if (!isConnected) {
    return (
      <>
        <ConnectionSetup
          mode={mode}
          peerId={peerId}
          remotePeerId={remotePeerId}
          setRemotePeerId={setRemotePeerId}
          isPeerConnected={isPeerConnected}
          onConnect={handleConnect}
        />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </>
    );
  }

  // Chat interface
  return (
    <>
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
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}