import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { toast } from 'react-toastify';
import { database } from '../lib/firebaseConfig';
import { ref, set, get, remove, onValue } from 'firebase/database';
import { useConnection } from '../context/ConnectionContext'; // Import the useConnection hook

function generateRandomCode(length = 6) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

interface UseWebRTCProps {
  mode: 'start' | 'join' | null;
  setMode: (mode: 'start' | 'join' | null) => void;
}

export default function useWebRTC({ mode, setMode }: UseWebRTCProps) {
  const { isConnected, setIsConnected, isPeerConnected, setIsPeerConnected } = useConnection(); // Use the connection context
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [sendProgress, setSendProgress] = useState<number>(0);
  const [receiveProgress, setReceiveProgress] = useState<number>(0);
  const [receivedFiles, setReceivedFiles] = useState<{ name: string, url: string }[]>([]);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const fileChunksRef = useRef<Uint8Array[]>([]);
  const fileNameRef = useRef<string>('');
  const fileSizeRef = useRef<number>(0);
  const receivedSizeRef = useRef<number>(0);

  const chunkSize = 64 * 1024; // 64 KB chunk size
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  const resetState = () => {
    setPeerId('');
    setRemotePeerId('');
    setMessage('');
    setReceivedMessages([]);
    setIsConnected(false);
    setSendProgress(0);
    setReceiveProgress(0);
    setReceivedFiles([]);
    fileChunksRef.current = [];
    fileNameRef.current = '';
    fileSizeRef.current = 0;
    receivedSizeRef.current = 0;
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
        initiator: mode === 'start',
        trickle: false,
      });
  
      peer.on('signal', async (data: SimplePeer.SignalData) => {
        const signalData = JSON.stringify(data);
        if (mode === 'start') {
          const randomCode = generateRandomCode();
          await set(ref(database, `peers/${randomCode}`), { signalData, expiry: Date.now() + 300000 });
          setPeerId(randomCode);
        } else if (mode === 'join' && !isConnected) {
          const randomCode = generateRandomCode();
          await set(ref(database, `peers/${randomCode}`), { signalData, expiry: Date.now() + 300000 });
          setPeerId(randomCode);
        }
      });
  
      peer.on('connect', async () => {
        toast.success('Connected to peer!');
        setIsConnected(true);
      });
  
      peer.on('error', async (err) => {
        // toast.error(`Error: ${err.message}`);
        resetState();
      });
  
      peer.on('close', async () => {
        toast.info('Connection closed');
        resetState();
      });
  
      peerRef.current = peer;
  
      return () => {
        resetState();
      };
    }
  }, [mode]);
  

  useEffect( () => {
    if (mode === 'start' && peerId) {
      const statusRef = ref(database, `peers/${peerId}/status`);
      const unsubscribe = onValue(statusRef, (snapshot) => {
        if (snapshot.exists() && snapshot.val() === 'connected') {
          setIsPeerConnected(true);
        }
      });

      return () => unsubscribe();
    }
  }, [mode, peerId]);

  useEffect(() => {
    if (peerRef.current) {
      peerRef.current.on('data', (data: Uint8Array) => {
        const decodedMessage = new TextDecoder().decode(data);
        try {
          const parsedData = JSON.parse(decodedMessage);
          if (parsedData.type === 'file-info') {
            receiveFile(parsedData);
          } else if (parsedData.type === 'file-chunk') {
            appendChunk(parsedData);
          } else {
            setReceivedMessages((prev) => [...prev, `Friend: ${decodedMessage}`]);
          }
        } catch (error) {
          if (!decodedMessage.startsWith('ack:')) {
            setReceivedMessages((prev) => [...prev, `Friend: ${decodedMessage}`]);
          }
        }
      });
    }
  }, [peerRef.current]);

  const handleConnect = async () => {
    try {
      if (peerRef.current && remotePeerId) {
        const snapshot = await get(ref(database, `peers/${remotePeerId}`));
        if (snapshot.exists()) {
          const { signalData, expiry } = snapshot.val();
          if (Date.now() > expiry) {
            toast.error('Code has expired');
            await remove(ref(database, `peers/${remotePeerId}`));
          } else {
            const parsedRemotePeerId = JSON.parse(signalData);
            peerRef.current.signal(parsedRemotePeerId);
            await updatePeerStatus(remotePeerId, 'connected');
          }
        } else {
          toast.error('Invalid peer code');
        }
      } else {
        toast.error('Invalid remote peer ID');
      }
    } catch (error) {
      toast.error('Failed to connect to peer');
    }
  };

  const handleSend = () => {
    try {
      if (peerRef.current && peerRef.current.connected && message) {
        peerRef.current.send(message);
        setReceivedMessages((prev) => [...prev, `Me: ${message}`]);
        setMessage('');
        setSendProgress(0);
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Error sending message');
    }
  };

  const sendFileInChunks = async (file: File) => {
    if (!peerRef.current || !peerRef.current.connected) {
      toast.error('No peer connection established');
      return;
    }

    const fileId = Date.now().toString();
    const totalChunks = Math.ceil(file.size / chunkSize);
    let chunkIndex = 0;

    peerRef.current.send(JSON.stringify({
      type: 'file-info',
      fileId,
      name: file.name,
      size: file.size,
      totalChunks
    }));

    const sendChunk = async (retry = 0) => {
      if (chunkIndex >= totalChunks) {
        setReceivedMessages((prev) => [...prev, `Me: Sent file - ${file.name}`]);
        toast.success('File sent successfully');
        setSendProgress(0);
        return;
      }

      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = new Uint8Array(await file.slice(start, end).arrayBuffer());

      try {
        peerRef.current?.send(JSON.stringify({
          type: 'file-chunk',
          fileId,
          chunkIndex,
          chunk: Array.from(chunk)
        }));

        chunkIndex++;
        setSendProgress((chunkIndex / totalChunks) * 100);

        await new Promise<void>((resolve) => {
          const onAck = (data: Uint8Array) => {
            const message = new TextDecoder().decode(data);
            if (message === `ack:${fileId}:${chunkIndex - 1}`) {
              peerRef.current?.removeListener('data', onAck);
              resolve();
            }
          };
          peerRef.current?.on('data', onAck);
        });

        setTimeout(() => sendChunk(), 10);
      } catch (error) {
        console.error('Error sending chunk:', error);
        if (retry < maxRetries) {
          setTimeout(() => sendChunk(retry + 1), retryDelay);
        } else {
          toast.error('Failed to send file chunk after multiple retries');
        }
      }
    };

    sendChunk();
  };

  const handleSendFile = (file: File) => {
    sendFileInChunks(file);
  };

  const updatePeerStatus = async (remotePeerId: string, status: string) => {
    try {
      await set(ref(database, `peers/${remotePeerId}/status`), status);
    } catch (error) {
    }
  };

  const receiveFile = (fileInfo: { fileId: string, name: string, size: number, totalChunks: number }) => {
    fileNameRef.current = fileInfo.name;
    fileSizeRef.current = fileInfo.size;
    receivedSizeRef.current = 0;
    fileChunksRef.current = new Array(fileInfo.totalChunks);
  };

  const appendChunk = (chunkData: { fileId: string, chunkIndex: number, chunk: number[] }) => {
    const chunk = new Uint8Array(chunkData.chunk);
    fileChunksRef.current[chunkData.chunkIndex] = chunk;
    receivedSizeRef.current += chunk.byteLength;
    setReceiveProgress((receivedSizeRef.current / fileSizeRef.current) * 100);

    peerRef.current?.send(`ack:${chunkData.fileId}:${chunkData.chunkIndex}`);

    if (receivedSizeRef.current === fileSizeRef.current) {
      const receivedBlob = new Blob(fileChunksRef.current.filter(Boolean));
      const url = URL.createObjectURL(receivedBlob);
      setReceivedMessages((prev) => [...prev, `Friend: File received - ${fileNameRef.current}`]);
      setReceivedFiles((prev) => [...prev, { name: fileNameRef.current, url }]);
      setReceiveProgress(0);
    }
  };

  const handleDisconnect = () => {
    if (peerRef.current) {
      peerRef.current.send(JSON.stringify({ type: 'disconnect' }));
    }
    resetState();
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
    sendProgress,
    receiveProgress,
    receivedFiles,
    handleDisconnect,
    resetState,
  };
}
