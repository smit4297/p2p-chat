// File transfer management hook

import { useState, useCallback, useRef } from "react";
import SimplePeer from "simple-peer";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "./useToast";
import type { FileTransfer, ReceivedFile, FileTransferMessage } from "../lib/types";
import { FILE_TRANSFER } from "../lib/constants";
import {
  sendFileInfo,
  sendFileChunk,
  sendFileComplete,
  sendCancelTransfer,
  sendAck,
  waitForAck,
  readFileInChunks,
  assembleFile,
  createDownloadLink,
  generateUniqueTransferName,
} from "../lib/services/file-transfer-service";
import { validateFile } from "../lib/utils/file-utils";

interface UseFileTransferProps {
  peer: SimplePeer.Instance | null;
  onFileReceived?: (fileName: string, fileId: string) => void;
  onFileSent?: (fileName: string, fileId: string) => void;
}

export function useFileTransfer({ peer, onFileReceived, onFileSent }: UseFileTransferProps) {
  const { toast } = useToast();
  const [fileTransfers, setFileTransfers] = useState<Map<string, FileTransfer>>(
    new Map()
  );
  const [receivedFiles, setReceivedFiles] = useState<ReceivedFile[]>([]);
  const transferQueueRef = useRef<
    Array<{
      fileId: string;
      originalName: string;
      uniqueName: string;
      file: File;
    }>
  >([]);
  const isProcessingRef = useRef(false);
  const completedFilesRef = useRef<Set<string>>(new Set()); // Track completed files

  // Process file send queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || transferQueueRef.current.length === 0 || !peer) {
      return;
    }

    isProcessingRef.current = true;

    while (transferQueueRef.current.length > 0) {
      const fileInfo = transferQueueRef.current.shift();
      if (fileInfo) {
        await sendFileWithChunks(fileInfo);
      }
    }

    isProcessingRef.current = false;
  }, [peer]);

  // Send file in chunks
  const sendFileWithChunks = async (fileInfo: {
    fileId: string;
    originalName: string;
    uniqueName: string;
    file: File;
  }) => {
    if (!peer || !peer.connected) {
      toast.error("No peer connection");
      return;
    }

    const { fileId, file, uniqueName, originalName } = fileInfo;
    const totalChunks = Math.ceil(file.size / FILE_TRANSFER.CHUNK_SIZE);
    const abortController = new AbortController();

    // Initialize transfer state
    setFileTransfers((prev) => {
      const newMap = new Map(prev);
      newMap.set(fileId, {
        fileId,
        fileName: uniqueName,
        originalName,
        fileSize: file.size,
        progress: 0,
        chunks: [],
        totalChunks,
        direction: "send",
        status: "pending",
        retries: 0,
        abortController,
      });
      return newMap;
    });

    try {
      // Send file info
      console.log(`[FileTransfer] Sending file info for: ${originalName}`);
      sendFileInfo(peer, fileId, uniqueName, originalName, file.size, totalChunks);

      // Wait for acknowledgment with timeout handling
      console.log(`[FileTransfer] Waiting for file-info ack...`);
      await waitForAck(peer, `ack:file-info:${fileId}`);
      console.log(`[FileTransfer] File-info acknowledged, starting chunk transfer`);

      // Update status to in-progress
      setFileTransfers((prev) => {
        const newMap = new Map(prev);
        const transfer = newMap.get(fileId);
        if (transfer) {
          transfer.status = "in-progress";
        }
        return newMap;
      });

      // Send chunks
      const chunkIterator = readFileInChunks(file, FILE_TRANSFER.CHUNK_SIZE);

      for await (const { chunk, index } of chunkIterator) {
        if (abortController.signal.aborted) {
          throw new Error("Transfer cancelled");
        }

        let retries = 0;
        let success = false;

        while (retries < FILE_TRANSFER.MAX_RETRIES && !success) {
          try {
            sendFileChunk(peer, fileId, index, chunk);
            await waitForAck(peer, `ack:${fileId}:${index}`);
            success = true;

            // Update progress
            setFileTransfers((prev) => {
              const newMap = new Map(prev);
              const transfer = newMap.get(fileId);
              if (transfer) {
                transfer.progress = ((index + 1) / totalChunks) * 100;
                transfer.status = "in-progress";
              }
              return newMap;
            });
          } catch (error) {
            retries++;
            console.warn(`[FileTransfer] Chunk ${index} failed, retry ${retries}/${FILE_TRANSFER.MAX_RETRIES}`);
            if (retries >= FILE_TRANSFER.MAX_RETRIES) {
              throw new Error(`Failed to send chunk ${index} after ${retries} retries`);
            }
            await new Promise((resolve) =>
              setTimeout(resolve, FILE_TRANSFER.RETRY_DELAY)
            );
          }
        }
      }

      // Send completion message
      console.log(`[FileTransfer] All chunks sent, sending completion message`);
      sendFileComplete(peer, fileId);

      // Mark as completed
      setFileTransfers((prev) => {
        const newMap = new Map(prev);
        const transfer = newMap.get(fileId);
        if (transfer) {
          transfer.status = "completed";
          transfer.progress = 100;
        }
        return newMap;
      });

      // Remove completed transfer from UI after a brief moment
      setTimeout(() => {
        setFileTransfers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }, 500); // Half second delay to show completion before removing

      console.log(`[FileTransfer] File transfer completed: ${originalName}`);

      // Add to sender's chat history
      onFileSent?.(originalName, fileId);

      toast.success(`File sent: ${originalName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[FileTransfer] File transfer error:", errorMessage, error);

      setFileTransfers((prev) => {
        const newMap = new Map(prev);
        const transfer = newMap.get(fileId);
        if (transfer) {
          transfer.status = "failed";
        }
        return newMap;
      });

      // Provide more specific error messages
      if (errorMessage.includes("timeout") || errorMessage.includes("Acknowledgment timeout")) {
        toast.error(`Connection timeout: ${originalName}`);
      } else if (errorMessage.includes("cancelled")) {
        toast.info(`Transfer cancelled: ${originalName}`);
      } else {
        toast.error(`Failed to send: ${originalName}`);
      }
    }
  };

  // Handle file send
  const handleSendFile = useCallback(
    (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(validation.error || "Invalid file");
        return;
      }

      const fileId = uuidv4();
      const uniqueName = generateUniqueTransferName(file.name, fileTransfers);

      transferQueueRef.current.push({
        fileId,
        originalName: file.name,
        uniqueName,
        file,
      });

      if (transferQueueRef.current.length === 1) {
        processQueue();
      }
    },
    [fileTransfers, processQueue]
  );

  // Handle received file info
  const handleFileInfo = useCallback(
    (data: FileTransferMessage) => {
      if (!peer) return;

      const { fileId, name, originalName, size, totalChunks } = data;

      setFileTransfers((prev) => {
        const newMap = new Map(prev);
        newMap.set(fileId!, {
          fileId: fileId!,
          fileName: name!,
          originalName: originalName!,
          fileSize: size!,
          progress: 0,
          chunks: new Array(totalChunks!),
          totalChunks: totalChunks!,
          direction: "receive",
          status: "pending",
          retries: 0,
        });
        return newMap;
      });

      sendAck(peer, fileId!);
    },
    [peer]
  );

  // Handle received file chunk
  const handleFileChunk = useCallback(
    (data: FileTransferMessage) => {
      if (!peer) return;

      const { fileId, chunkIndex, chunk } = data;

      setFileTransfers((prev) => {
        const newMap = new Map(prev);
        const transfer = newMap.get(fileId!);

        if (transfer) {
          transfer.chunks[chunkIndex!] = new Uint8Array(chunk!);
          const completedChunks = transfer.chunks.filter(Boolean).length;
          transfer.progress = (completedChunks / transfer.totalChunks) * 100;
          transfer.status = "in-progress";

          // Check if transfer is complete
          if (completedChunks === transfer.totalChunks) {
            completeFileReceive(fileId!, transfer);
          }
        }

        return newMap;
      });

      sendAck(peer, fileId!, chunkIndex!);
    },
    [peer]
  );

  // Complete file receive
  const completeFileReceive = useCallback(
    (fileId: string, transfer: FileTransfer) => {
      // Prevent duplicate completion
      if (completedFilesRef.current.has(fileId)) {
        console.log(`[FileTransfer] File ${fileId} already completed, skipping`);
        return;
      }

      console.log(`[FileTransfer] Completing file receive: ${transfer.originalName}`);
      completedFilesRef.current.add(fileId);

      const blob = assembleFile(transfer.chunks);
      const url = createDownloadLink(blob, transfer.originalName);

      setReceivedFiles((prev) => [
        ...prev,
        { id: fileId, name: transfer.originalName, url },
      ]);

      setFileTransfers((prev) => {
        const newMap = new Map(prev);
        const t = newMap.get(fileId);
        if (t) {
          t.status = "completed";
          t.progress = 100;
        }
        return newMap;
      });

      // Remove completed transfer from UI after a brief moment
      setTimeout(() => {
        setFileTransfers((prev) => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }, 500); // Half second delay to show completion before removing

      onFileReceived?.(transfer.originalName, fileId);
      toast.success(`File received: ${transfer.originalName}`);
    },
    [onFileReceived]
  );

  // Handle file transfer complete message
  const handleFileComplete = useCallback((fileId: string) => {
    setFileTransfers((prev) => {
      const newMap = new Map(prev);
      const transfer = newMap.get(fileId);
      if (transfer && transfer.direction === "receive") {
        completeFileReceive(fileId, transfer);
      }
      return newMap;
    });
  }, [completeFileReceive]);

  // Cancel file transfer
  const cancelFileTransfer = useCallback(
    (fileId: string) => {
      if (peer) {
        sendCancelTransfer(peer, fileId);
      }

      setFileTransfers((prev) => {
        const newMap = new Map(prev);
        const transfer = newMap.get(fileId);

        if (transfer) {
          transfer.abortController?.abort();
          transfer.status = "cancelled";
          newMap.delete(fileId);
        }

        return newMap;
      });
    },
    [peer]
  );

  // Handle cancelled transfer from remote
  const handleCancelledTransfer = useCallback((fileId: string) => {
    setFileTransfers((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  // Clear all transfers
  const clearTransfers = useCallback(() => {
    // Abort all active transfers
    fileTransfers.forEach((transfer) => {
      if (transfer.status === "in-progress" || transfer.status === "pending") {
        transfer.abortController?.abort();
      }
    });

    setFileTransfers(new Map());
    setReceivedFiles([]);
    transferQueueRef.current = [];
  }, [fileTransfers]);

  return {
    fileTransfers,
    receivedFiles,
    handleSendFile,
    handleFileInfo,
    handleFileChunk,
    handleFileComplete,
    cancelFileTransfer,
    handleCancelledTransfer,
    clearTransfers,
  };
}
