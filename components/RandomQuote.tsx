// RandomQuote.tsx
import React, { useEffect, useState } from 'react';

const quotes = [
  "Connect instantly, share seamlessly.",
  "Bridging distances, one peer at a time.",
  "Secure, fast, and direct - the way sharing should be.",
  "Chat and share without boundaries.",
  "Your files, your conversations, your control.",
  "Experience the power of peer-to-peer connection.",
  "Where privacy meets productivity.",
  "Share thoughts and files at the speed of light.",
  "Direct connections for a connected world.",
  "Empowering secure communication and file sharing.",
  "No servers, no limits - just pure peer-to-peer power.",
  "Bringing the future of web communication to your fingertips."
];

const RandomQuote: React.FC = () => {
  const [quote, setQuote] = useState<string>("");

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  return <p className="text-center text-lg">{quote}</p>;
};

export default RandomQuote;
