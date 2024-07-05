import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { toast } from 'react-toastify';
import { database } from '../utils/firebaseConfig';
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

export default function useWebRTC(mode: 'start' | 'join' | null) {
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const peerRef = useRef<SimplePeer.Instance | null>(null);

  useEffect(() => {
    if (mode) {
      const peer = new SimplePeer({
        initiator: mode === 'start',
        trickle: false,
      });
      console.log(isConnected)
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

      peer.on('data', (data: Uint8Array) => {
        const decodedMessage = new TextDecoder().decode(data);
        setReceivedMessages((prev) => [...prev, `Friend: ${decodedMessage}`]);
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
  };
}
