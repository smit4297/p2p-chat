// Message handling hook

import { useState, useCallback } from "react";
import SimplePeer from "simple-peer";
import { useToast } from "./useToast";
import { sendData } from "../lib/services/webrtc-service";

export function useMessages(peer: SimplePeer.Instance | null) {
  const { toast } = useToast();
  const [message, setMessage] = useState<string>("");
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;

    const success = sendData(peer, message);

    if (success) {
      setReceivedMessages((prev) => [...prev, `Me: ${message}`]);
      setMessage("");
    } else {
      toast.error("Failed to send message");
    }
  }, [peer, message]);

  const addReceivedMessage = useCallback((msg: string) => {
    setReceivedMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setReceivedMessages([]);
    setMessage("");
  }, []);

  const removeMessageByPattern = useCallback((pattern: string) => {
    setReceivedMessages((prev) => prev.filter((msg) => !msg.includes(pattern)));
  }, []);

  return {
    message,
    setMessage,
    receivedMessages,
    handleSend,
    addReceivedMessage,
    clearMessages,
    removeMessageByPattern,
  };
}
