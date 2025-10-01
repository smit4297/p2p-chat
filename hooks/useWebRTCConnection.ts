// WebRTC connection management hook

import { useState, useEffect, useRef, useCallback } from "react";
import SimplePeer from "simple-peer";
import { useToast } from "./useToast";
import { useConnection } from "../context/ConnectionContext";
import {
  createPeer,
  destroyPeer,
  signalPeer,
} from "../lib/services/webrtc-service";
import {
  generatePeerCode,
  storeSignalData,
  retrieveSignalData,
  updatePeerStatus,
  listenToPeerStatus,
} from "../lib/services/signaling-service";
import type { ChatMode } from "../lib/types";

export function useWebRTCConnection(
  mode: ChatMode,
  onDataReceived: (data: Uint8Array) => void
) {
  const { toast } = useToast();
  const { isConnected, setIsConnected, isPeerConnected, setIsPeerConnected } =
    useConnection();
  const [peerId, setPeerId] = useState<string>("");
  const [remotePeerId, setRemotePeerId] = useState<string>("");
  const peerRef = useRef<SimplePeer.Instance | null>(null);

  // Initialize peer connection
  useEffect(() => {
    if (!mode) return;

    const peer = createPeer(mode === "start", {
      onSignal: async (data) => {
        const signalData = JSON.stringify(data);
        const code = generatePeerCode();
        await storeSignalData(code, signalData);
        setPeerId(code);
      },

      onConnect: () => {
        toast.success("Connected to peer!");
        setIsConnected(true);
      },

      onData: onDataReceived,

      onError: (error) => {
        console.error("Peer error:", error);
        toast.error("Connection error occurred");
        resetConnection();
      },

      onClose: () => {
        toast.info("Connection closed");
        resetConnection();
      },
    });

    peerRef.current = peer;

    return () => {
      destroyPeer(peer);
    };
  }, [mode]);

  // Listen for peer status (for "start" mode)
  useEffect(() => {
    if (mode === "start" && peerId) {
      const unsubscribe = listenToPeerStatus(peerId, (status) => {
        if (status === "connected") {
          setIsPeerConnected(true);
        }
      });

      return unsubscribe;
    }
  }, [mode, peerId]);

  const handleConnect = useCallback(async () => {
    if (!peerRef.current || !remotePeerId) {
      toast.error("Invalid remote peer ID");
      return;
    }

    try {
      const result = await retrieveSignalData(remotePeerId);

      if (!result) {
        toast.error("Invalid peer code");
        return;
      }

      if (result.expired) {
        toast.error("Code has expired");
        return;
      }

      const parsedSignalData = JSON.parse(result.signalData);
      signalPeer(peerRef.current, parsedSignalData);
      await updatePeerStatus(remotePeerId, "connected");
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect to peer");
    }
  }, [remotePeerId]);

  const resetConnection = useCallback(() => {
    if (peerRef.current) {
      destroyPeer(peerRef.current);
      peerRef.current = null;
    }
    setPeerId("");
    setRemotePeerId("");
    setIsConnected(false);
    setIsPeerConnected(false);
  }, [setIsConnected, setIsPeerConnected]);

  return {
    peer: peerRef.current,
    peerId,
    remotePeerId,
    setRemotePeerId,
    isConnected,
    isPeerConnected,
    handleConnect,
    resetConnection,
  };
}
