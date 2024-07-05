import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { toast } from 'react-toastify';

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

      peer.on('signal', (data: SimplePeer.SignalData) => {
        setPeerId(JSON.stringify(data));
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

  const handleConnect = () => {
    try {
      if (peerRef.current && remotePeerId) {
        const parsedRemotePeerId = JSON.parse(remotePeerId);
        peerRef.current.signal(parsedRemotePeerId);
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
