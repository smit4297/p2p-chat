// WebRTC connection management hook

import { useState, useEffect, useRef, useCallback } from "react";
import SimplePeer from "simple-peer";
import { ref, set, onValue } from "firebase/database";
import { database } from "../lib/firebaseConfig";
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
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
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

  // Listen for answer signal (for "start" mode - initiator)
  useEffect(() => {
    if (mode === "start" && peerId && peerRef.current) {
      const answerRef = ref(database, `peers/${peerId}/answer`);
      const unsubscribe = onValue(answerRef, async (snapshot) => {
        if (snapshot.exists() && peerRef.current) {
          try {
            const answerData = snapshot.val();
            const parsedAnswer = JSON.parse(answerData);
            signalPeer(peerRef.current, parsedAnswer);
            setIsPeerConnected(true);
            setIsConnecting(false);
          } catch (error) {
            console.error("Error processing answer signal:", error);
          }
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

    setIsConnecting(true);

    try {
      const result = await retrieveSignalData(remotePeerId);

      if (!result) {
        toast.error("Invalid peer code");
        setIsConnecting(false);
        return;
      }

      if (result.expired) {
        toast.error("Code has expired");
        setIsConnecting(false);
        return;
      }

      const parsedSignalData = JSON.parse(result.signalData);

      // For join mode: signal the peer and listen for answer to store
      if (mode === "join") {
        // Store a one-time listener for the answer signal
        peerRef.current.once("signal", async (answerSignal) => {
          try {
            const answerData = JSON.stringify(answerSignal);
            // Store answer in the initiator's path so they can retrieve it
            await set(ref(database, `peers/${remotePeerId}/answer`), answerData);
          } catch (error) {
            console.error("Error storing answer signal:", error);
          }
        });

        signalPeer(peerRef.current, parsedSignalData);
      } else {
        // For start mode: just signal
        signalPeer(peerRef.current, parsedSignalData);
      }

      await updatePeerStatus(remotePeerId, "connected");
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect to peer");
      setIsConnecting(false);
    }
  }, [remotePeerId, mode]);

  const resetConnection = useCallback(() => {
    if (peerRef.current) {
      destroyPeer(peerRef.current);
      peerRef.current = null;
    }
    setPeerId("");
    setRemotePeerId("");
    setIsConnected(false);
    setIsPeerConnected(false);
    setIsConnecting(false);
  }, [setIsConnected, setIsPeerConnected]);

  return {
    peer: peerRef.current,
    peerId,
    remotePeerId,
    setRemotePeerId,
    isConnected,
    isPeerConnected,
    isConnecting,
    handleConnect,
    resetConnection,
  };
}
