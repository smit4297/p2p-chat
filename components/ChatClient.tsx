'use client'

import { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ChatClient() {
  const [mode, setMode] = useState<'start' | 'join' | null>(null);
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

  if (!mode) {
    return (
      <div className="flex justify-center space-x-4">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => setMode('start')}>Start Chat</button>
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded" onClick={() => setMode('join')}>Join Chat</button>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      {!isConnected && (
        <div>
          <h2 className="text-xl font-bold mb-4">Your code (share with peer):</h2>
          <p className="bg-gray-100 p-2 rounded break-all">{peerId}</p>
          <p className="mt-4">Share this code with the other party.</p>
          <h2 className="text-xl font-bold mb-4">Enter peer code:</h2>
          <input
            className="w-full p-2 border rounded"
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value)}
            placeholder="Enter peer ID"
          />
          <button className="mt-4 bg-blue-500 text-white p-2 rounded w-full" onClick={handleConnect}>Connect</button>
        </div>
      )}
      {isConnected && (
        <div className="mt-6">
          <h3 className="font-bold">Messaging Console:</h3>
          <input
            className="w-full p-2 border rounded"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
          />
          <button className="mt-2 bg-green-500 text-white p-2 rounded w-full" onClick={handleSend}>Send</button>
          <div className="mt-6">
            <h3 className="font-bold">Messages:</h3>
            {receivedMessages.map((msg, index) => (
              <p key={index} className="bg-gray-100 p-2 rounded mt-2">{msg}</p>
            ))}
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
