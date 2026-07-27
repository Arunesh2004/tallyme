import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";

export function useEnterpriseEvents() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Note: in a real production app with authentication, you would pass token in auth or headers
    const socketInstance = io(WS_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle incoming events and invalidate relevant React Query caches
    socketInstance.on('APPROVAL_REQUIRED', () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    });

    socketInstance.on('SYNC_STARTED', () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    });

    socketInstance.on('SYNC_COMPLETED', () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    });

    socketInstance.on('SYNC_FAILED', () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    });

    socketInstance.on('MIGRATION_COMPLETED', () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    socketInstance.on('ROLLBACK_STARTED', () => {
      // invalidate related caches
    });

    socketInstance.on('ROLLBACK_COMPLETED', () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  return { socket, isConnected };
}
