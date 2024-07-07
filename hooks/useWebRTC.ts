import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { toast } from 'react-toastify';
import { database } from '../lib/firebaseConfig';
import { ref, set, get, remove } from 'firebase/database';

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
}

export default function useWebRTC(mode: 'start' | 'join' | null) {
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
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

      peer.on('connect', () => {
        toast.success('Connected to peer!');
        setIsConnected(true);
      });

      peer.on('error', (err) => {
        toast.error(`Error: ${err.message}`);
      });

      peer.on('close', () => {
        toast.info('Connection closed');
        setIsConnected(false);
      });

      peerRef.current = peer;

      return () => {
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
      };
    }
  }, [mode]);

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
          // Handle non-JSON messages (like text messages or acknowledgments)
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
        toast.success('Message sent');
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
        return;
      }

      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = await file.slice(start, end).arrayBuffer();

      try {
        peerRef.current?.send(JSON.stringify({
          type: 'file-chunk',
          fileId,
          chunkIndex,
          chunk: Array.from(new Uint8Array(chunk))
        }));

        chunkIndex++;
        setSendProgress((chunkIndex / totalChunks) * 100);

        // Flow control: wait for acknowledgment before sending the next chunk
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

        setTimeout(() => sendChunk(), 10); // Schedule next chunk
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

    // Send acknowledgment
    peerRef.current?.send(`ack:${chunkData.fileId}:${chunkData.chunkIndex}`);

    if (receivedSizeRef.current === fileSizeRef.current) {
      const receivedBlob = new Blob(fileChunksRef.current.filter(Boolean));
      const url = URL.createObjectURL(receivedBlob);
      setReceivedMessages((prev) => [...prev, `Friend: Sent file - ${fileNameRef.current}`]);
      setReceivedFiles((prev) => [...prev, { name: fileNameRef.current, url }]);
      toast.success(`Received file - ${fileNameRef.current}`);
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
    handleConnect,
    handleSend,
    handleSendFile,
    sendProgress,
    receiveProgress,
    receivedFiles,
  };
}