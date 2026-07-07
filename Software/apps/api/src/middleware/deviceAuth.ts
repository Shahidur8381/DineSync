import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '@dinesync/db';

export function requireDeviceKey() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawKey = req.headers['x-device-key'] as string | undefined;

    if (!rawKey) {
      res.status(401).json({ error: 'Missing X-Device-Key header' });
      return;
    }

    // Try to find device by ID from body
    const deviceId = (req.body?.deviceId as string) || '';

    if (!deviceId) {
      res.status(400).json({ error: 'deviceId required in body' });
      return;
    }

    const { data: device, error } = await supabase.from('Device').select('*').eq('id', deviceId).single();

    if (error || !device) {
      res.status(401).json({ error: 'Unknown device' });
      return;
    }

    const valid = await bcrypt.compare(rawKey, device.apiKeyHash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid device key' });
      return;
    }

    (req as Request & { device: typeof device }).device = device;
    next();
  };
}
