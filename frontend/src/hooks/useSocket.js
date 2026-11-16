import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';

/**
 * Manages a scoped Socket.io connection for the lifetime of a component
 * and re-authenticates automatically whenever the auth token changes.
 */
export default function useSocket(token = '') {
  const socket = useMemo(
    () =>
      io(import.meta.env.VITE_API_URL || '', {
        auth: token ? { token } : undefined
      }),
    [token]
  );

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
}
