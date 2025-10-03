// Integrated WebRTC hook that combines connection, messages, and file transfer

import { useCallback, useRef, useEffect } from "react";
import type { ChatMode } from "../lib/types";
import { useWebRTCConnection } from "./useWebRTCConnection";
import { useMessages } from "./useMessages";
import { useFileTransfer } from "./useFileTransfer";
import type { FileTransferMessage } from "../lib/types";

interface UseWebRTCIntegratedProps {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
}

export function useWebRTCIntegrated({ mode, setMode }: UseWebRTCIntegratedProps) {
  // Use refs to store handler references
  const messageHandlerRef = useRef<((msg: string) => void) | null>(null);
  const fileHandlersRef = useRef<{
    handleFileInfo: ((data: FileTransferMessage) => void) | null;
    handleFileChunk: ((data: FileTransferMessage) => void) | null;
    handleCancelledTransfer: ((fileId: string) => void) | null;
    handleFileComplete: ((fileId: string) => void) | null;
  }>({
    handleFileInfo: null,
    handleFileChunk: null,
    handleCancelledTransfer: null,
    handleFileComplete: null,
  });

  // Handle incoming data - now using refs
  const handleDataReceived = useCallback((data: Uint8Array) => {
    const decodedMessage = new TextDecoder().decode(data);

    try {
      const parsedData: FileTransferMessage = JSON.parse(decodedMessage);

      // Handle file transfer messages using refs
      if (parsedData.type === "file-info" && fileHandlersRef.current.handleFileInfo) {
        fileHandlersRef.current.handleFileInfo(parsedData);
      } else if (parsedData.type === "file-chunk" && fileHandlersRef.current.handleFileChunk) {
        fileHandlersRef.current.handleFileChunk(parsedData);
      } else if (parsedData.type === "cancel-transfer" && fileHandlersRef.current.handleCancelledTransfer) {
        fileHandlersRef.current.handleCancelledTransfer(parsedData.fileId!);
      } else if (parsedData.type === "file-transfer-complete" && fileHandlersRef.current.handleFileComplete) {
        fileHandlersRef.current.handleFileComplete(parsedData.fileId!);
      }
    } catch (error) {
      // Not a JSON message, treat as regular text message
      if (!decodedMessage.startsWith("ack:") && messageHandlerRef.current) {
        messageHandlerRef.current(`Friend: ${decodedMessage}`);
      }
    }
  }, []);

  // Initialize connection
  const connection = useWebRTCConnection(mode, handleDataReceived);

  // Initialize messages
  const messages = useMessages(connection.peer);

  // Initialize file transfer
  const fileTransfer = useFileTransfer({
    peer: connection.peer,
    onFileReceived: (fileName, fileId) => {
      messages.addReceivedMessage(`Friend: File received - ${fileName} (${fileId})`);
    },
    onFileSent: (fileName, fileId) => {
      messages.addReceivedMessage(`Me: Sent file - ${fileName} (${fileId})`);
    },
  });

  // Update refs when handlers change
  useEffect(() => {
    messageHandlerRef.current = messages.addReceivedMessage;
    fileHandlersRef.current = {
      handleFileInfo: fileTransfer.handleFileInfo,
      handleFileChunk: fileTransfer.handleFileChunk,
      handleCancelledTransfer: fileTransfer.handleCancelledTransfer,
      handleFileComplete: fileTransfer.handleFileComplete,
    };
  }, [messages.addReceivedMessage, fileTransfer.handleFileInfo, fileTransfer.handleFileChunk, fileTransfer.handleCancelledTransfer, fileTransfer.handleFileComplete]);

  // Reset all state
  const resetState = useCallback(() => {
    connection.resetConnection();
    messages.clearMessages();
    fileTransfer.clearTransfers();
    setMode(null);
  }, [connection, messages, fileTransfer, setMode]);

  return {
    // Connection
    peerId: connection.peerId,
    remotePeerId: connection.remotePeerId,
    setRemotePeerId: connection.setRemotePeerId,
    isConnected: connection.isConnected,
    isPeerConnected: connection.isPeerConnected,
    isConnecting: connection.isConnecting,
    handleConnect: connection.handleConnect,

    // Messages
    message: messages.message,
    setMessage: messages.setMessage,
    receivedMessages: messages.receivedMessages,
    handleSend: messages.handleSend,

    // File Transfer
    handleSendFile: fileTransfer.handleSendFile,
    receivedFiles: fileTransfer.receivedFiles,
    fileTransfers: fileTransfer.fileTransfers,
    cancelFileTransfer: fileTransfer.cancelFileTransfer,

    // General
    resetState,
  };
}
