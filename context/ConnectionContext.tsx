import { createContext, useContext, useState, ReactNode } from 'react';

interface ConnectionContextType {
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
  isPeerConnected: boolean;
  setIsPeerConnected: (value: boolean) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);

  return (
    <ConnectionContext.Provider value={{ isConnected, setIsConnected, isPeerConnected, setIsPeerConnected }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
