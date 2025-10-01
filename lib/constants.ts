// Application-wide constants

// WebRTC Configuration
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// File Transfer Configuration
export const FILE_TRANSFER = {
  CHUNK_SIZE: 64 * 1024, // 64 KB
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  ACK_TIMEOUT: 5000, // 5 seconds
} as const;

// Peer Code Configuration
export const PEER_CODE = {
  LENGTH: 6,
  CHARACTERS: "0123456789",
  EXPIRY_TIME: 300000, // 5 minutes
} as const;

// UI Configuration
export const UI = {
  SCROLL_THRESHOLD: 20, // pixels from bottom to trigger auto-scroll
  SCROLL_BOTTOM_BUTTON_THRESHOLD: 100, // pixels from bottom to show scroll button
  TOAST_DURATION: 3000, // milliseconds
  MAX_MESSAGE_LENGTH: 10000,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB
} as const;

// Animation Durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Message Types
export const MESSAGE_TYPE = {
  TEXT: "text",
  FILE: "file",
  FILE_INFO: "file-info",
  FILE_CHUNK: "file-chunk",
  FILE_COMPLETE: "file-transfer-complete",
  CANCEL_TRANSFER: "cancel-transfer",
  DISCONNECT: "disconnect",
} as const;
