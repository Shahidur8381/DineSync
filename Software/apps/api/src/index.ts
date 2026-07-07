import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { supabase } from '@dinesync/db';
import { setIoInstance, emitToAdmins } from './lib/socket';
import authRouter from './routes/auth';
import studentRouter from './routes/student';
import adminRouter from './routes/admin';
import deviceRouter from './routes/device';

const app = express();
const server = http.createServer(app);

const clientUrls = (process.env.CLIENT_URLS || 'http://localhost:3001,http://localhost:3002').split(',');

// ─── Socket.io ────────────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: clientUrls,
    credentials: true,
  },
});

setIoInstance(io);

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token as string | undefined;

  try {
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { role: string };
      if (payload.role === 'admin') {
        socket.join('admins');
        console.log(`[WS] Admin connected: ${socket.id}`);
      }
    }
  } catch {
    // Non-admin connections are fine; they just won't receive admin events
  }

  socket.on('disconnect', () => {
    console.log(`[WS] Disconnected: ${socket.id}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(
  cors({
    origin: clientUrls,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Rate limit device routes aggressively
const deviceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,            // max 120 requests per minute per IP
  message: { error: 'Too many requests from this device' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/device', deviceRateLimit, deviceRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Background Jobs ──────────────────────────────────────────────────────────

const OFFLINE_THRESHOLD_MS = parseInt(process.env.DEVICE_OFFLINE_THRESHOLD_SECONDS || '60') * 1000;

async function checkDeviceHeartbeats() {
  const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS).toISOString();

  const { data: staleDevices } = await supabase
    .from('Device')
    .select('*')
    .eq('status', 'ONLINE')
    .or(`lastHeartbeat.lt.${cutoff},lastHeartbeat.is.null`);

  if (staleDevices) {
    for (const device of staleDevices) {
      await supabase
        .from('Device')
        .update({ status: 'OFFLINE' })
        .eq('id', device.id);
      emitToAdmins('device:status', { deviceId: device.id, status: 'OFFLINE' });
      console.log(`[Jobs] Device ${device.id} marked OFFLINE`);
    }
  }
}

// Run every 30 seconds
setInterval(() => {
  checkDeviceHeartbeats().catch(console.error);
}, 30_000);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '4000');

server.listen(PORT, () => {
  console.log(`🚀 DineSync API running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
