// useWebRTC.ts

import { useState, useEffect, useRef, useCallback } from "react";
import SimplePeer from "simple-peer";
import { toast } from "react-toastify";
import { database } from "../lib/firebaseConfig";
import { ref, set, get, remove, onValue } from "firebase/database";
import { useConnection } from "../context/ConnectionContext";
import { v4 as uuidv4 } from "uuid";

function generateRandomCode(length = 6) {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

interface UseWebRTCProps {
  mode: "start" | "join" | null;
  setMode: (mode: "start" | "join" | null) => void;
}

export interface FileTransfer {
  fileId: string;
  fileName: string;
  originalName: string; // Added for original filename
  fileSize: number;
  progress: number;
  chunks: Uint8Array[];
  totalChunks: number;
  direction: "send" | "receive";
  status: "pending" | "in-progress" | "completed" | "failed" | "cancelled";
  retries: number;
  abortController?: AbortController;
}

export default function useWebRTC({ mode, setMode }: UseWebRTCProps) {
  const { isConnected, setIsConnected, isPeerConnected, setIsPeerConnected } =
    useConnection();
  const [peerId, setPeerId] = useState<string>("");
  const [remotePeerId, setRemotePeerId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<
    { id: string; name: string; url: string }[]
  >([]);
  const [fileTransfers, setFileTransfers] = useState<Map<string, FileTransfer>>(
    new Map()
  );
  const peerRef = useRef<SimplePeer.Instance | null>(null);

  const chunkSize = 64 * 1024; // 64 KB chunk size
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  const fileTransferQueue: {
    fileId: string;
    originalName: string;
    uniqueName: string;
    file: File;
  }[] = [];

  const resetState = () => {
    setPeerId("");
    setRemotePeerId("");
    setMessage("");
    setReceivedMessages([]);
    setIsConnected(false);
    setReceivedFiles([]);
    setFileTransfers(new Map());
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setMode(null);
    setIsPeerConnected(false);
  };

  useEffect(() => {
    if (mode) {
      const peer = new SimplePeer({
        initiator: mode === "start",
        trickle: false,
      });

      peer.on("signal", async (data: SimplePeer.SignalData) => {
        const signalData = JSON.stringify(data);
        if (mode === "start") {
          const randomCode = generateRandomCode();
          await set(ref(database, `peers/${randomCode}`), {
            signalData,
            expiry: Date.now() + 300000,
          });
          setPeerId(randomCode);
        } else if (mode === "join" && !isConnected) {
          const randomCode = generateRandomCode();
          await set(ref(database, `peers/${randomCode}`), {
            signalData,
            expiry: Date.now() + 300000,
          });
          setPeerId(randomCode);
        }
      });

      peer.on("connect", async () => {
        toast.success("Connected to peer!");
        setIsConnected(true);
      });

      peer.on("error", async (err) => {
        console.error("Peer error:", err);
        resetState();
      });

      peer.on("close", async () => {
        toast.info("Connection closed");
        resetState();
      });

      peerRef.current = peer;

      return () => {
        resetState();
      };
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "start" && peerId) {
      const statusRef = ref(database, `peers/${peerId}/status`);
      const unsubscribe = onValue(statusRef, (snapshot) => {
        if (snapshot.exists() && snapshot.val() === "connected") {
          setIsPeerConnected(true);
        }
      });

      return () => unsubscribe();
    }
  }, [mode, peerId]);

  useEffect(() => {
    if (peerRef.current) {
      peerRef.current.on("data", (data: Uint8Array) => {
        const decodedMessage = new TextDecoder().decode(data);
        try {
          const parsedData = JSON.parse(decodedMessage);
          if (parsedData.type === "file-info") {
            receiveFile(parsedData);
          } else if (parsedData.type === "file-chunk") {
            appendChunk(parsedData);
          } else if (parsedData.type === "cancel-transfer") {
            handleCancelledTransfer(parsedData.fileId);
          } else if (parsedData.type === "file-transfer-complete") {
            handleFileTransferComplete(parsedData.fileId);
          } else {
            setReceivedMessages((prev) => [
              ...prev,
              `Friend: ${decodedMessage}`,
            ]);
          }
        } catch (error) {
          if (!decodedMessage.startsWith("ack:")) {
            setReceivedMessages((prev) => [
              ...prev,
              `Friend: ${decodedMessage}`,
            ]);
          }
        }
      });
    }
  }, [peerRef.current]);

  const handleCancelledTransfer = (fileId: string) => {
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      const transfer = newTransfers.get(fileId);
      if (transfer) {
        transfer.status = "cancelled";
        // Optionally, you can remove the transfer from the map here
        newTransfers.delete(fileId);
      }
      return newTransfers;
    });
  };

  const handleConnect = async () => {
    try {
      if (peerRef.current && remotePeerId) {
        const snapshot = await get(ref(database, `peers/${remotePeerId}`));
        if (snapshot.exists()) {
          const { signalData, expiry } = snapshot.val();
          if (Date.now() > expiry) {
            toast.error("Code has expired");
            await remove(ref(database, `peers/${remotePeerId}`));
          } else {
            const parsedRemotePeerId = JSON.parse(signalData);
            peerRef.current.signal(parsedRemotePeerId);
            await updatePeerStatus(remotePeerId, "connected");
          }
        } else {
          toast.error("Invalid peer code");
        }
      } else {
        toast.error("Invalid remote peer ID");
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect to peer");
    }
  };

  const handleSend = useCallback(() => {
    try {
      if (peerRef.current && peerRef.current.connected && message) {
        peerRef.current.send(message);
        setReceivedMessages((prev) => [...prev, `Me: ${message}`]);
        setMessage("");
      } else {
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Error sending message");
    }
  }, [message, setReceivedMessages, setMessage]);

  const sendFileInChunks = async (fileInfo: {
    fileId: string;
    originalName: string;
    uniqueName: string;
    file: File;
  }) => {
    if (!peerRef.current || !peerRef.current.connected) {
      toast.error("No peer connection established");
      return;
    }

    const { fileId, file } = fileInfo;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const abortController = new AbortController();
    const signal = abortController.signal;

    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      newTransfers.set(fileId, {
        fileId,
        fileName: fileInfo.uniqueName,
        originalName: fileInfo.originalName,
        fileSize: file.size,
        progress: 0,
        chunks: [],
        totalChunks,
        direction: "send",
        status: "pending",
        retries: 0,
        abortController,
      });
      return newTransfers;
    });

    // Send file info to receiver
    peerRef.current.send(
      JSON.stringify({
        type: "file-info",
        fileId: fileInfo.fileId,
        name: fileInfo.uniqueName,
        originalName: fileInfo.originalName,
        size: fileInfo.file.size,
        totalChunks,
      })
    );

    // Wait for acknowledgment from receiver
    await new Promise<void>((resolve) => {
      const onAck = (data: Uint8Array) => {
        const message = new TextDecoder().decode(data);
        if (message === `ack:file-info:${fileId}`) {
          peerRef.current?.removeListener("data", onAck);
          resolve();
        }
      };
      peerRef.current?.on("data", onAck);
    });

    // Start sending chunks
    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = new Uint8Array(
          await file.slice(start, end).arrayBuffer()
        );

        if (signal.aborted) {
          throw new Error("Transfer aborted");
        }

        let retries = 0;
        while (retries < maxRetries) {
          try {
            peerRef.current?.send(
              JSON.stringify({
                type: "file-chunk",
                fileId,
                chunkIndex,
                chunk: Array.from(chunk),
              })
            );

            // Wait for acknowledgment
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(
                () => reject(new Error("Ack timeout")),
                5000
              );
              const onAck = (data: Uint8Array) => {
                const message = new TextDecoder().decode(data);
                if (message === `ack:${fileId}:${chunkIndex}`) {
                  clearTimeout(timeout);
                  peerRef.current?.removeListener("data", onAck);
                  resolve();
                }
              };
              peerRef.current?.on("data", onAck);
            });

            // Update progress
            setFileTransfers((prev) => {
              const newTransfers = new Map(prev);
              const transfer = newTransfers.get(fileId);
              if (transfer) {
                transfer.progress = ((chunkIndex + 1) / totalChunks) * 100;
                transfer.status = "in-progress";
              }
              return newTransfers;
            });

            break; // Chunk sent successfully, move to next chunk
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(
                `Failed to send file ${fileInfo.originalName} after multiple retries`
              );
            }
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      // Send completion message
      peerRef.current.send(
        JSON.stringify({
          type: "file-transfer-complete",
          fileId,
        })
      );

      setFileTransfers((prev) => {
        const newTransfers = new Map(prev);
        const transfer = newTransfers.get(fileId);
        if (transfer) {
          transfer.status = "completed";
          transfer.progress = 100; // Ensure progress is set to 100%
        }
        return newTransfers;
      });

      // Only add the message if the transfer completes successfully
      setReceivedMessages((prev) => [
        ...prev,
        `Me: Sent file - ${fileInfo.originalName} (${fileId})`,
      ]);
      toast.success("File sent successfully");
    } catch (error) {
      setFileTransfers((prev) => {
        const newTransfers = new Map(prev);
        const transfer = newTransfers.get(fileId);

        if (transfer) {
          transfer.status = "cancelled";
        }
        return newTransfers;
      });

      toast.error(`Failed to send file ${fileInfo.originalName}`);
    } finally {
      // Clean up code here
      setFileTransfers((prev) => {
        const newTransfers = new Map(prev);
        const transfer = newTransfers.get(fileId);
        if (transfer && transfer.status !== "completed") {
          newTransfers.delete(fileId);
        }
        return newTransfers;
      });
    }
  };

  const handleSendFile = (file: File) => {
    const fileId = uuidv4();

    const existingFileNames = Array.from(fileTransfers.values()).map(
      (transfer) => transfer.originalName
    );

    let uniqueName = file.name;
    let counter = 1;

    while (existingFileNames.includes(uniqueName)) {
      const nameParts = file.name.split(".");
      const extension = nameParts.pop();
      const name = nameParts.join(".");
      uniqueName = `${name} (${counter}).${extension}`;
      counter++;
    }

    const fileInfo = {
      fileId,
      originalName: file.name,
      uniqueName: uniqueName,
      file,
    };

    fileTransferQueue.push(fileInfo);

    if (fileTransferQueue.length === 1) {
      processFileQueue();
    }
  };

  const processFileQueue = async () => {
    while (fileTransferQueue.length > 0) {
      const fileInfo = fileTransferQueue.shift();
      if (fileInfo) {
        await sendFileInChunks(fileInfo);
      }
    }
  };

  const receiveFile = (fileInfo: {
    fileId: string;
    name: string;
    originalName: string;
    size: number;
    totalChunks: number;
  }) => {
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      newTransfers.set(fileInfo.fileId, {
        fileId: fileInfo.fileId,
        fileName: fileInfo.name,
        originalName: fileInfo.originalName,
        fileSize: fileInfo.size,
        progress: 0,
        chunks: new Array(fileInfo.totalChunks),
        totalChunks: fileInfo.totalChunks,
        direction: "receive",
        status: "pending",
        retries: 0,
      });
      return newTransfers;
    });

    // Send acknowledgment
    peerRef.current?.send(`ack:file-info:${fileInfo.fileId}`);
  };

  const appendChunk = (chunkData: {
    fileId: string;
    chunkIndex: number;
    chunk: number[];
  }) => {
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      const transfer = newTransfers.get(chunkData.fileId);
      if (transfer) {
        transfer.chunks[chunkData.chunkIndex] = new Uint8Array(chunkData.chunk);
        transfer.progress =
          (transfer.chunks.filter(Boolean).length / transfer.totalChunks) * 100;
        transfer.status = "in-progress";
      }
      return newTransfers;
    });

    peerRef.current?.send(`ack:${chunkData.fileId}:${chunkData.chunkIndex}`);

    const transfer = fileTransfers.get(chunkData.fileId);
    if (
      transfer &&
      transfer.chunks.filter(Boolean).length === transfer.totalChunks
    ) {
      handleFileTransferComplete(chunkData.fileId);
    }
  };

  const handleFileTransferComplete = (fileId: string) => {
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      const transfer = newTransfers.get(fileId);
      if (transfer) {
        const receivedBlob = new Blob(transfer.chunks);
        const url = URL.createObjectURL(receivedBlob);
        setReceivedMessages((prev) => [
          ...prev,
          `Friend: File received - ${transfer.originalName} (${fileId})`,
        ]);
        setReceivedFiles((prev) => [
          ...prev,
          { id: fileId, name: transfer.originalName, url },
        ]);
        transfer.status = "completed";
        transfer.progress = 100;
      }
      return newTransfers;
    });
  };

  const cancelFileTransfer = (fileId: string) => {
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      const transfer = newTransfers.get(fileId);
      if (transfer) {
        transfer.status = "cancelled";
        transfer.abortController?.abort();
        newTransfers.delete(fileId);

        // Remove the file message from receivedMessages
        setReceivedMessages((prevMessages) =>
          prevMessages.filter(
            (msg) =>
              !(
                msg.includes(`File received - ${transfer.originalName}`) ||
                msg.includes(`Sent file - ${transfer.originalName}`)
              )
          )
        );
      }
      return newTransfers;
    });

    peerRef.current?.send(
      JSON.stringify({
        type: "cancel-transfer",
        fileId,
      })
    );
  };

  const handleDisconnect = () => {
    if (peerRef.current) {
      peerRef.current.send(JSON.stringify({ type: "disconnect" }));
    }
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      Array.from(newTransfers.entries()).forEach(([fileId, transfer]) => {
        if (transfer.status !== "completed") {
          newTransfers.delete(fileId);
          // Remove the file message from receivedMessages
          setReceivedMessages((prevMessages) =>
            prevMessages.filter(
              (msg) => !msg.includes(`File received - ${transfer.fileName}`)
            )
          );
          setReceivedMessages((prevMessages) =>
            prevMessages.filter(
              (msg) => !msg.includes(`Sent file - ${transfer.fileName}`)
            )
          );
        }
      });
      return newTransfers;
    });
    resetState();
  };

  const updatePeerStatus = async (remotePeerId: string, status: string) => {
    try {
      await set(ref(database, `peers/${remotePeerId}/status`), status);
    } catch (error) {
      console.error("Error updating peer status:", error);
    }
  };

  return {
    peerId,
    remotePeerId,
    setRemotePeerId,
    message,
    setMessage,
    receivedMessages,
    isConnected,
    isPeerConnected,
    handleConnect,
    handleSend,
    handleSendFile,
    receivedFiles,
    handleDisconnect,
    resetState,
    fileTransfers,
    cancelFileTransfer,
  };
}
