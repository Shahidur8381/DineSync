import { Server } from 'socket.io';

let io: Server | null = null;

export function setIoInstance(instance: Server): void {
  io = instance;
}

export function getIoInstance(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToAdmins(event: string, data: unknown): void {
  if (io) {
    io.to('admins').emit(event, data);
  }
}
