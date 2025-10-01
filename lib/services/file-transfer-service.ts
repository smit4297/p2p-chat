// File transfer protocol service

import SimplePeer from "simple-peer";
import { FILE_TRANSFER } from "../constants";
import type { FileTransfer, FileTransferMessage } from "../types";
import { getUniqueFileName } from "../utils/file-utils";

/**
 * Send file info message to peer
 * @param peer - SimplePeer instance
 * @param fileId - Unique file ID
 * @param fileName - File name
 * @param originalName - Original file name
 * @param fileSize - File size in bytes
 * @param totalChunks - Total number of chunks
 */
export function sendFileInfo(
  peer: SimplePeer.Instance,
  fileId: string,
  fileName: string,
  originalName: string,
  fileSize: number,
  totalChunks: number
): void {
  const message: FileTransferMessage = {
    type: "file-info",
    fileId,
    name: fileName,
    originalName,
    size: fileSize,
    totalChunks,
  };

  peer.send(JSON.stringify(message));
}

/**
 * Send file chunk to peer
 * @param peer - SimplePeer instance
 * @param fileId - File ID
 * @param chunkIndex - Chunk index
 * @param chunk - Chunk data
 */
export function sendFileChunk(
  peer: SimplePeer.Instance,
  fileId: string,
  chunkIndex: number,
  chunk: Uint8Array
): void {
  const message: FileTransferMessage = {
    type: "file-chunk",
    fileId,
    chunkIndex,
    chunk: Array.from(chunk),
  };

  peer.send(JSON.stringify(message));
}

/**
 * Send file transfer complete message
 * @param peer - SimplePeer instance
 * @param fileId - File ID
 */
export function sendFileComplete(
  peer: SimplePeer.Instance,
  fileId: string
): void {
  const message: FileTransferMessage = {
    type: "file-transfer-complete",
    fileId,
  };

  peer.send(JSON.stringify(message));
}

/**
 * Send cancel transfer message
 * @param peer - SimplePeer instance
 * @param fileId - File ID
 */
export function sendCancelTransfer(
  peer: SimplePeer.Instance,
  fileId: string
): void {
  const message: FileTransferMessage = {
    type: "cancel-transfer",
    fileId,
  };

  peer.send(JSON.stringify(message));
}

/**
 * Send acknowledgment for file info or chunk
 * @param peer - SimplePeer instance
 * @param fileId - File ID
 * @param chunkIndex - Chunk index (optional, for chunk acks)
 */
export function sendAck(
  peer: SimplePeer.Instance,
  fileId: string,
  chunkIndex?: number
): void {
  const ackMessage =
    chunkIndex !== undefined
      ? `ack:${fileId}:${chunkIndex}`
      : `ack:file-info:${fileId}`;

  peer.send(ackMessage);
}

/**
 * Wait for acknowledgment
 * @param peer - SimplePeer instance
 * @param expectedAck - Expected acknowledgment message
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves when ack is received
 */
export function waitForAck(
  peer: SimplePeer.Instance,
  expectedAck: string,
  timeout: number = FILE_TRANSFER.ACK_TIMEOUT
): Promise<void> {
  return new Promise((resolve, reject) => {
    let isResolved = false;

    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        peer.removeListener("data", onData);
        reject(new Error(`Acknowledgment timeout waiting for: ${expectedAck}`));
      }
    }, timeout);

    const onData = (data: Uint8Array) => {
      try {
        const message = new TextDecoder().decode(data);
        if (message === expectedAck && !isResolved) {
          isResolved = true;
          clearTimeout(timer);
          peer.removeListener("data", onData);
          resolve();
        }
      } catch (error) {
        // Ignore decode errors for non-text messages
        console.warn("[waitForAck] Error decoding message:", error);
      }
    };

    // Use regular listener with manual cleanup instead of 'once'
    // to ensure we can properly remove it on timeout
    peer.on("data", onData);

    // Safety cleanup in case of peer disconnection
    const onClose = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timer);
        peer.removeListener("data", onData);
        peer.removeListener("close", onClose);
        reject(new Error("Peer connection closed while waiting for ack"));
      }
    };

    peer.once("close", onClose);
  });
}

/**
 * Read file in chunks
 * @param file - File to read
 * @param chunkSize - Chunk size in bytes
 * @returns Array of chunks
 */
export async function* readFileInChunks(
  file: File,
  chunkSize: number = FILE_TRANSFER.CHUNK_SIZE
): AsyncGenerator<{ chunk: Uint8Array; index: number; total: number }> {
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);
    const arrayBuffer = await blob.arrayBuffer();
    const chunk = new Uint8Array(arrayBuffer);

    yield { chunk, index: i, total: totalChunks };
  }
}

/**
 * Assemble file from chunks
 * @param chunks - Array of chunks
 * @returns Blob containing assembled file
 */
export function assembleFile(chunks: Uint8Array[]): Blob {
  return new Blob(chunks);
}

/**
 * Create download link for file
 * @param blob - File blob
 * @param fileName - File name
 * @returns Object URL
 */
export function createDownloadLink(blob: Blob, fileName: string): string {
  return URL.createObjectURL(blob);
}

/**
 * Calculate transfer progress
 * @param completedChunks - Number of completed chunks
 * @param totalChunks - Total number of chunks
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(
  completedChunks: number,
  totalChunks: number
): number {
  if (totalChunks === 0) return 0;
  return Math.min(100, (completedChunks / totalChunks) * 100);
}

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param delay - Initial delay in milliseconds
 * @returns Promise with function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = FILE_TRANSFER.MAX_RETRIES,
  delay: number = FILE_TRANSFER.RETRY_DELAY
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        // Wait with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Generate unique file name for transfer
 * @param originalName - Original file name
 * @param existingTransfers - Map of existing file transfers
 * @returns Unique file name
 */
export function generateUniqueTransferName(
  originalName: string,
  existingTransfers: Map<string, FileTransfer>
): string {
  const existingNames = Array.from(existingTransfers.values()).map(
    (transfer) => transfer.originalName
  );

  return getUniqueFileName(originalName, existingNames);
}
