'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

interface UseSocketOptions {
  onLog?: (log: Record<string, unknown>) => void;
  onGasAlert?: (alert: Record<string, unknown>) => void;
  onMealReset?: () => void;
  onDeviceStatus?: (event: { deviceId: string; status: string }) => void;
}

export function useAdminSocket({ onLog, onGasAlert, onMealReset, onDeviceStatus }: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    const s = getSocket();
    socketRef.current = s;

    if (!s.connected) s.connect();

    if (onLog) s.on('log:new', onLog);
    if (onGasAlert) s.on('alert:gas', onGasAlert);
    if (onMealReset) s.on('meal:reset', onMealReset);
    if (onDeviceStatus) s.on('device:status', onDeviceStatus);
  }, [onLog, onGasAlert, onMealReset, onDeviceStatus]);

  const disconnect = useCallback(() => {
    const s = socketRef.current;
    if (s) {
      if (onLog) s.off('log:new', onLog);
      if (onGasAlert) s.off('alert:gas', onGasAlert);
      if (onMealReset) s.off('meal:reset', onMealReset);
      if (onDeviceStatus) s.off('device:status', onDeviceStatus);
    }
  }, [onLog, onGasAlert, onMealReset, onDeviceStatus]);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);
}
