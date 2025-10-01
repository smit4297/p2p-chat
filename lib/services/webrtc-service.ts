// Core WebRTC connection service

import SimplePeer from "simple-peer";
import { ICE_SERVERS } from "../constants";

export type PeerEventHandler = {
  onSignal?: (data: SimplePeer.SignalData) => void;
  onConnect?: () => void;
  onData?: (data: Uint8Array) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
};

/**
 * Create a new SimplePeer instance
 * @param isInitiator - Whether this peer initiates the connection
 * @param handlers - Event handlers for peer events
 * @returns SimplePeer instance
 */
export function createPeer(
  isInitiator: boolean,
  handlers: PeerEventHandler = {}
): SimplePeer.Instance {
  const peer = new SimplePeer({
    initiator: isInitiator,
    trickle: false,
    config: { iceServers: ICE_SERVERS },
  });

  // Set up event handlers
  if (handlers.onSignal) {
    peer.on("signal", handlers.onSignal);
  }

  if (handlers.onConnect) {
    peer.on("connect", handlers.onConnect);
  }

  if (handlers.onData) {
    peer.on("data", handlers.onData);
  }

  if (handlers.onError) {
    peer.on("error", handlers.onError);
  }

  if (handlers.onClose) {
    peer.on("close", handlers.onClose);
  }

  return peer;
}

/**
 * Signal the peer with remote signal data
 * @param peer - SimplePeer instance
 * @param signalData - Remote peer's signal data
 */
export function signalPeer(
  peer: SimplePeer.Instance,
  signalData: SimplePeer.SignalData
): void {
  peer.signal(signalData);
}

/**
 * Send data through peer connection
 * @param peer - SimplePeer instance
 * @param data - Data to send (string or buffer)
 * @returns Success status
 */
export function sendData(
  peer: SimplePeer.Instance | null,
  data: string | Uint8Array
): boolean {
  if (!peer || !peer.connected) {
    return false;
  }

  try {
    peer.send(data);
    return true;
  } catch (error) {
    console.error("Error sending data:", error);
    return false;
  }
}

/**
 * Check if peer is connected
 * @param peer - SimplePeer instance
 * @returns Connection status
 */
export function isPeerConnected(peer: SimplePeer.Instance | null): boolean {
  return peer?.connected === true;
}

/**
 * Destroy peer connection
 * @param peer - SimplePeer instance
 */
export function destroyPeer(peer: SimplePeer.Instance | null): void {
  if (peer) {
    try {
      peer.destroy();
    } catch (error) {
      console.error("Error destroying peer:", error);
    }
  }
}

/**
 * Get connection statistics (if available)
 * @param peer - SimplePeer instance
 * @returns Promise with connection stats
 */
export async function getConnectionStats(
  peer: SimplePeer.Instance
): Promise<RTCStatsReport | null> {
  try {
    // Access the internal RTCPeerConnection
    const pc = (peer as any)._pc as RTCPeerConnection;
    if (pc && pc.getStats) {
      return await pc.getStats();
    }
  } catch (error) {
    console.error("Error getting connection stats:", error);
  }
  return null;
}

/**
 * Wait for peer to be ready with timeout
 * @param peer - SimplePeer instance
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves when peer is connected
 */
export function waitForConnection(
  peer: SimplePeer.Instance,
  timeout: number = 30000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (peer.connected) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("Connection timeout"));
    }, timeout);

    peer.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });

    peer.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
