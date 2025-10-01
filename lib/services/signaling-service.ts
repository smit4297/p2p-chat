// Firebase signaling service for WebRTC peer discovery

import { database } from "../firebaseConfig";
import { ref, set, get, remove, onValue, Unsubscribe } from "firebase/database";
import { PEER_CODE } from "../constants";
import type { SignalData } from "../types";

/**
 * Generate random peer code
 * @param length - Code length (default: 6)
 * @returns Random numeric code
 */
export function generatePeerCode(length: number = PEER_CODE.LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(
      Math.random() * PEER_CODE.CHARACTERS.length
    );
    result += PEER_CODE.CHARACTERS.charAt(randomIndex);
  }
  return result;
}

/**
 * Store signal data in Firebase
 * @param code - Peer code
 * @param signalData - WebRTC signal data (stringified)
 * @returns Promise
 */
export async function storeSignalData(
  code: string,
  signalData: string
): Promise<void> {
  const data: SignalData = {
    signalData,
    expiry: Date.now() + PEER_CODE.EXPIRY_TIME,
  };

  await set(ref(database, `peers/${code}`), data);
}

/**
 * Retrieve signal data from Firebase
 * @param code - Peer code
 * @returns Signal data or null if not found/expired
 */
export async function retrieveSignalData(
  code: string
): Promise<{ signalData: string; expired: boolean } | null> {
  const snapshot = await get(ref(database, `peers/${code}`));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.val() as SignalData;
  const expired = Date.now() > data.expiry;

  if (expired) {
    // Clean up expired code
    await removeSignalData(code);
    return { signalData: data.signalData, expired: true };
  }

  return { signalData: data.signalData, expired: false };
}

/**
 * Remove signal data from Firebase
 * @param code - Peer code
 * @returns Promise
 */
export async function removeSignalData(code: string): Promise<void> {
  await remove(ref(database, `peers/${code}`));
}

/**
 * Update peer connection status
 * @param code - Peer code
 * @param status - Connection status
 * @returns Promise
 */
export async function updatePeerStatus(
  code: string,
  status: string
): Promise<void> {
  await set(ref(database, `peers/${code}/status`), status);
}

/**
 * Listen for peer status changes
 * @param code - Peer code
 * @param callback - Callback function with status
 * @returns Unsubscribe function
 */
export function listenToPeerStatus(
  code: string,
  callback: (status: string | null) => void
): Unsubscribe {
  const statusRef = ref(database, `peers/${code}/status`);
  return onValue(statusRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
}

/**
 * Clean up expired peer codes (maintenance function)
 * @returns Number of codes cleaned up
 */
export async function cleanupExpiredCodes(): Promise<number> {
  const peersRef = ref(database, "peers");
  const snapshot = await get(peersRef);

  if (!snapshot.exists()) {
    return 0;
  }

  const peers = snapshot.val() as Record<string, SignalData>;
  const now = Date.now();
  let cleanedCount = 0;

  for (const [code, data] of Object.entries(peers)) {
    if (data.expiry && now > data.expiry) {
      await removeSignalData(code);
      cleanedCount++;
    }
  }

  return cleanedCount;
}
