import { useState, useEffect, useRef, useCallback } from "react";
import SimplePeer from "simple-peer";
import { toast } from "react-toastify";
import { database } from "../lib/firebaseConfig";
import { ref, set, get, remove, onValue } from "firebase/database";
import { useConnection } from "../context/ConnectionContext";
import { v4 as uuidv4 } from "uuid";

/**
 * Generates a random numeric code of specified length.
 * @param length - The length of the code (default: 6).
 * @returns A random numeric string.
 */
function generateRandomCode(length = 6) {
  const characters = "0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Props for the useWebRTC hook.
 */
interface UseWebRTCProps {
  mode: "start" | "join" | null;
  setMode: (mode: "start" | "join" | null) => void;
}

/**
 * Interface for file transfer metadata and state.
 */
export interface FileTransfer {
  fileId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  progress: number;
  chunks: Uint8Array[];
  totalChunks: number;
  direction: "send" | "receive";
  status: "pending" | "in-progress" | "completed" | "failed" | "cancelled";
  retries: number;
  abortController?: AbortController;
}

/**
 * Custom WebRTC hook for peer-to-peer communication and file transfer.
 */
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

  // Configuration constants
  const chunkSize = 64 * 1024; // 64 KB chunk size
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second delay between retries

  // File transfer queue
  const fileTransferQueue: {
    fileId: string;
    originalName: string;
    uniqueName: string;
    file: File;
  }[] = [];

  // ICE servers for WebRTC
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    // Add TURN servers here if needed for NAT traversal
  ];

  /**
   * Resets all state and cleans up the peer connection.
   */
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
    if (mode === "start" && peerId) {
      const waitingPeerRef = ref(database, `peers/${peerId}/waitingPeer`);
      const unsubscribe = onValue(waitingPeerRef, (snapshot) => {
        if (snapshot.exists()) {
          setIsPeerConnected(true);
          console.log("isPeerConnected set to true");
          // Optional: Prefill remotePeerId with Person B's code
          setRemotePeerId(snapshot.val());
        }
      });
      return () => unsubscribe();
    }
  }, [mode, peerId]);

  /**
   * Initializes the WebRTC peer connection based on mode.
   */
  useEffect(() => {
      if (mode) {
        const peer = new SimplePeer({
          initiator: mode === "start",
          trickle: false,
          config: { iceServers },
        });
    
        peer.on("signal", async (data: SimplePeer.SignalData) => {
          const signalData = JSON.stringify(data);
          // Only generate peerId immediately for "start" mode (offer)
          if (mode === "start") {
            const randomCode = generateRandomCode();
            await set(ref(database, `peers/${randomCode}`), {
              signalData,
              expiry: Date.now() + 300000,
            });
            setPeerId(randomCode);
          }
          // For "join" mode, defer peerId generation to handleConnect
        });

        peer.on("connect", async () => {
          toast.success("Connected to peer!");
          setIsConnected(true);
          setIsPeerConnected(true);
          if (remotePeerId) {
            await updatePeerStatus(remotePeerId, "connected");
          }
        });

      peer.on("error", (err) => {
        console.error("Peer error:", err);
        toast.error("Peer connection error");
        resetState();
      });

      peer.on("close", () => {
        toast.info("Connection closed");
        resetState();
      });

      peer.on("data", (data: Uint8Array) => {
        const decodedMessage = new TextDecoder().decode(data);
        try {
          const parsedData = JSON.parse(decodedMessage);
          switch (parsedData.type) {
            case "file-info":
              receiveFile(parsedData);
              break;
            case "file-chunk":
              appendChunk(parsedData);
              break;
            case "cancel-transfer":
              handleCancelledTransfer(parsedData.fileId);
              break;
            case "file-transfer-complete":
              handleFileTransferComplete(parsedData.fileId);
              break;
            case "disconnect":
              handleDisconnect();
              break;
            default:
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

      peerRef.current = peer;

      return () => {
        resetState();
      };
    }
  }, [mode]);


  useEffect(() => {
    console.log("remotePeerId: " + remotePeerId);

    if (mode === "start" && remotePeerId) {
      const statusRef = ref(database, `peers/${remotePeerId}/status`);
      const unsubscribe = onValue(statusRef, (snapshot) => {
        if (snapshot.exists() && snapshot.val() === "waiting") {
          setIsPeerConnected(true); // Unblock the field
          console.log("isPeerConnected set to true");
        }
      });
      return () => unsubscribe();
    }
  }, [mode, remotePeerId]);

  /**
   * Listens for remote peer's signal data in real-time.
   */
  useEffect(() => {
    if (remotePeerId && peerRef.current) {
      const signalRef = ref(database, `peers/${remotePeerId}/signalData`);
      const unsubscribe = onValue(signalRef, (snapshot) => {
        if (snapshot.exists()) {
          try {
            const signalData = JSON.parse(snapshot.val());
            peerRef.current?.signal(signalData);
          } catch (error) {
            console.error("Error parsing signal data:", error);
            toast.error("Invalid signal data from peer");
          }
        }
      });
      return () => unsubscribe();
    }
  }, [remotePeerId]);

  /**
   * Handles a cancelled file transfer.
   */
  const handleCancelledTransfer = (fileId: string) => {
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      const transfer = newTransfers.get(fileId);
      if (transfer) {
        transfer.status = "cancelled";
        newTransfers.delete(fileId);
      }
      return newTransfers;
    });
  };

  /**
   * Validates and initiates connection to a remote peer.
   */
  const handleConnect = async () => {
    if (!remotePeerId) {
      toast.error("Please enter a remote peer ID");
      return;
    }
    const snapshot = await get(ref(database, `peers/${remotePeerId}`));
    if (!snapshot.exists()) {
      toast.error("Invalid peer code");
      return;
    }
    const { expiry, signalData } = snapshot.val();
    if (Date.now() > expiry) {
      toast.error("Code has expired");
      await remove(ref(database, `peers/${remotePeerId}`));
      return;
    }
  
    try {
      peerRef.current?.signal(JSON.parse(signalData));
  
      if (mode === "join" && !peerId) {
        await new Promise<void>((resolve) => {
          const onSignal = async (data: any) => {
            const signalData = JSON.stringify(data);
            const randomCode = generateRandomCode(); // e.g., "789012"
            await set(ref(database, `peers/${randomCode}`), {
              signalData,
              expiry: Date.now() + 300000, // 5-minute expiry
              status: "waiting", // Indicate Person B is waiting
            });
            // Update Person A's peer entry with waitingPeer
            await set(ref(database, `peers/${remotePeerId}/waitingPeer`), randomCode);
            setPeerId(randomCode);
            peerRef.current?.off("signal", onSignal);
            resolve();
          };
          peerRef.current?.on("signal", onSignal);
        });
      }
    } catch (error) {
      console.error("Error signaling peer:", error);
      toast.error("Failed to connect to peer");
    }
  };

  /**
   * Sends a text message to the connected peer.
   */
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
  }, [message]);

  /**
   * Sends a file in chunks to the connected peer.
   */
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

    peerRef.current.send(
      JSON.stringify({
        type: "file-info",
        fileId,
        name: fileInfo.uniqueName,
        originalName: fileInfo.originalName,
        size: file.size,
        totalChunks,
      })
    );

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

            setFileTransfers((prev) => {
              const newTransfers = new Map(prev);
              const transfer = newTransfers.get(fileId);
              if (transfer) {
                transfer.progress = ((chunkIndex + 1) / totalChunks) * 100;
                transfer.status = "in-progress";
              }
              return newTransfers;
            });

            break;
          } catch (error) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(
                `Failed to send file ${fileInfo.originalName} after retries`
              );
            }
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

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
          transfer.progress = 100;
        }
        return newTransfers;
      });

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
          transfer.status = "failed";
        }
        return newTransfers;
      });
      toast.error(`Failed to send file ${fileInfo.originalName}`);
    }
  };

  /**
   * Queues a file for sending and ensures unique file names.
   */
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

    const fileInfo = { fileId, originalName: file.name, uniqueName, file };
    fileTransferQueue.push(fileInfo);

    if (fileTransferQueue.length === 1) {
      processFileQueue();
    }
  };

  /**
   * Processes the file transfer queue sequentially.
   */
  const processFileQueue = async () => {
    while (fileTransferQueue.length > 0) {
      const fileInfo = fileTransferQueue.shift();
      if (fileInfo) {
        await sendFileInChunks(fileInfo);
      }
    }
  };

  /**
   * Initializes receiving a file based on file info from the sender.
   */
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

    peerRef.current?.send(`ack:file-info:${fileInfo.fileId}`);
  };

  /**
   * Appends a received file chunk and updates progress.
   */
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
  };

  /**
   * Completes a file transfer and creates a downloadable URL.
   */
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

  /**
   * Cancels an ongoing file transfer.
   */
  const cancelFileTransfer = (fileId: string) => {
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      const transfer = newTransfers.get(fileId);
      if (transfer) {
        transfer.status = "cancelled";
        transfer.abortController?.abort();
        newTransfers.delete(fileId);
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

  /**
   * Disconnects from the peer and cleans up.
   */
  const handleDisconnect = () => {
    if (peerRef.current) {
      peerRef.current.send(JSON.stringify({ type: "disconnect" }));
    }
    setFileTransfers((prev) => {
      const newTransfers = new Map(prev);
      Array.from(newTransfers.entries()).forEach(([fileId, transfer]) => {
        if (transfer.status !== "completed") {
          newTransfers.delete(fileId);
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

  /**
   * Updates the peer's status in Firebase.
   */
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