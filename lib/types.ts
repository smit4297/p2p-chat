// Shared TypeScript types for the application

export type ChatMode = "start" | "join" | null;

export type FileTransferStatus = "pending" | "in-progress" | "completed" | "failed" | "cancelled";

export type FileTransferDirection = "send" | "receive";

export interface FileTransfer {
  fileId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  progress: number;
  chunks: Uint8Array[];
  totalChunks: number;
  direction: FileTransferDirection;
  status: FileTransferStatus;
  retries: number;
  abortController?: AbortController;
}

export interface ReceivedFile {
  id: string;
  name: string;
  url: string;
}

export interface Message {
  id: string;
  sender: "me" | "friend";
  content: string;
  timestamp: number;
  type: "text" | "file";
  fileId?: string;
}

export interface PeerConnectionState {
  isConnected: boolean;
  isPeerConnected: boolean;
  peerId: string;
  remotePeerId: string;
}

export interface FileTransferMessage {
  type: "file-info" | "file-chunk" | "file-transfer-complete" | "cancel-transfer";
  fileId: string;
  name?: string;
  originalName?: string;
  size?: number;
  totalChunks?: number;
  chunkIndex?: number;
  chunk?: number[];
}

export interface SignalData {
  signalData: string;
  expiry: number;
  status?: string;
}

export interface WebRTCHookReturn {
  peerId: string;
  remotePeerId: string;
  setRemotePeerId: (id: string) => void;
  message: string;
  setMessage: (msg: string) => void;
  receivedMessages: string[];
  isConnected: boolean;
  isPeerConnected: boolean;
  handleConnect: () => Promise<void>;
  handleSend: () => void;
  handleSendFile: (file: File) => void;
  receivedFiles: ReceivedFile[];
  handleDisconnect: () => void;
  resetState: () => void;
  fileTransfers: Map<string, FileTransfer>;
  cancelFileTransfer: (fileId: string) => void;
}
