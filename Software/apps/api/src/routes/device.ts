import { Router, Request, Response } from 'express';
import { supabase } from '@dinesync/db';
import { requireDeviceKey } from '../middleware/deviceAuth';
import { validate } from '../middleware/validate';
import {
  VerifyRequestSchema,
  ConsumeRequestSchema,
  SensorRequestSchema,
  HeartbeatRequestSchema,
} from '@dinesync/types';
import { emitToAdmins } from '../lib/socket';

const router: Router = Router();

// Apply device auth to all device routes
router.use(requireDeviceKey());

// Gas sensor sliding window: deviceId → array of consecutive high readings
const gasWindowMap = new Map<string, number[]>();
const GAS_THRESHOLD = parseInt(process.env.GAS_ALERT_THRESHOLD || '400');
const GAS_CONSECUTIVE = parseInt(process.env.GAS_ALERT_CONSECUTIVE_READINGS || '3');

// ─── POST /api/device/meals-left ────────────────────────────────────────────

router.post('/meals-left', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Get total meals
    const { data: session } = await supabase.from('MealSession').select('totalMeals').single();
    const totalMeals = session?.totalMeals || 0;

    // 2. Count consumed
    const { count: consumed } = await supabase
      .from('MealStatus')
      .select('*', { count: 'exact', head: true })
      .eq('isConsumed', true);

    const mealsLeft = totalMeals - (consumed || 0);

    res.json({ mealsLeft: Math.max(0, mealsLeft) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/device/reset-meals ───────────────────────────────────────────

router.post('/reset-meals', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Reset all to isConsumed = false
    await supabase.from('MealStatus').update({ isConsumed: false }).eq('isConsumed', true);

    // 2. Log event
    const logId = crypto.randomUUID();
    const { data: log } = await supabase.from('Log').insert({
      id: logId,
      type: 'INFO',
      message: 'All meal statuses were reset to NOT_CONSUMED by hardware button.',
    }).select().single();

    if (log) {
      emitToAdmins('log:new', { log });
      emitToAdmins('meal:reset', {});
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/device/verify ──────────────────────────────────────────────────

router.post('/verify', validate(VerifyRequestSchema), async (req: Request, res: Response): Promise<void> => {
  const { deviceId, cardUid } = req.body;

  const deny = (reason: string, studentName: string = "") => {
    res.json({ allowed: false, reason, displayMessage: reason, studentName });
  };

  try {
    // 1. Check if Meal Session is active
    const { data: session } = await supabase.from('MealSession').select('*').single();
    if (!session || !session.isActive) {
      deny('Meal is currently OFF');
      return;
    }

    // Determine Lunch/Dinner by current time (just for display logic)
    const now = new Date();
    const currentMeal = now.getHours() < 17 ? 'Lunch' : 'Dinner';

    // 2. Look up card and student
    const { data: card } = await supabase
      .from('Card')
      .select('*, student:Student(*)')
      .eq('uid', cardUid)
      .single();

    if (!card || card.status !== 'ACTIVE' || !card.student || Array.isArray(card.student)) {
      deny('Unknown or blocked card');
      return;
    }
    const student = card.student;

    // 3. Check MealStatus
    const { data: statusRow } = await supabase
      .from('MealStatus')
      .select('*')
      .eq('studentId', student.id)
      .single();

    if (!statusRow) {
      deny('Student not in meal list', student.name);
      return;
    }
    
    if (statusRow.isAllowed === false) {
      deny('Meal is turned OFF', student.name);
      return;
    }

    if (statusRow.isConsumed === true) {
      deny('Meal already consumed', student.name);
      return;
    }

    // ALLOW
    res.json({
      allowed: true,
      studentName: student.name,
      displayMessage: `Enjoy your ${currentMeal}, ${student.name}!`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/device/consume ───────────────────────────────────────────────

router.post('/consume', validate(ConsumeRequestSchema), async (req: Request, res: Response): Promise<void> => {
  const { deviceId, cardUid } = req.body;

  try {
    // 1. Look up card -> student
    const { data: card } = await supabase
      .from('Card')
      .select('studentId, student:Student(name)')
      .eq('uid', cardUid)
      .single();

    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    // 2. Update status to isConsumed = true
    await supabase
      .from('MealStatus')
      .update({ isConsumed: true })
      .eq('studentId', card.studentId);

    // 3. Create log
    const studentName = card.student && !Array.isArray(card.student) ? card.student.name : 'Unknown';
    const logId = crypto.randomUUID();
    const { data: log } = await supabase.from('Log').insert({
      id: logId,
      deviceId,
      type: 'INFO',
      message: `${studentName} entered the dining and consumed a meal.`,
    }).select().single();

    if (log) {
      emitToAdmins('log:new', { log });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/device/sensor ──────────────────────────────────────────────────

router.post('/sensor', validate(SensorRequestSchema), async (req: Request, res: Response): Promise<void> => {
  const { deviceId, type, value } = req.body;

  try {
    if (type === 'GAS') {
      const window = gasWindowMap.get(deviceId) || [];

      if (value >= GAS_THRESHOLD) {
        window.push(value);
      } else {
        window.length = 0; // reset on non-threshold reading
      }

      gasWindowMap.set(deviceId, window.slice(-GAS_CONSECUTIVE));

      if (window.length >= GAS_CONSECUTIVE) {
        // All consecutive readings exceeded threshold — create alert
        const logId = crypto.randomUUID();
        const { data: log } = await supabase
          .from('Log')
          .insert({
            id: logId,
            deviceId,
            type: value > GAS_THRESHOLD * 1.5 ? 'CRITICAL' : 'WARNING',
            message: `GAS LEAKAGE DETECTED! (${Math.round(value)} ppm) at device ${deviceId}.`,
          })
          .select()
          .single();
          
        if (log) {
          emitToAdmins('log:new', { log });
          emitToAdmins('alert:gas', { deviceId, value });
        }
        gasWindowMap.set(deviceId, []); // reset after alert
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/device/heartbeat ───────────────────────────────────────────────

router.post('/heartbeat', validate(HeartbeatRequestSchema), async (req: Request, res: Response): Promise<void> => {
  const { deviceId, firmwareVersion, uptime } = req.body;

  try {
    await supabase
      .from('Device')
      .update({
        lastHeartbeat: new Date().toISOString(),
        status: 'ONLINE',
        firmwareVersion: firmwareVersion || undefined,
      })
      .eq('id', deviceId);

    emitToAdmins('device:status', { deviceId, status: 'ONLINE' });

    res.json({ ok: true, serverTime: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Device not found or internal error' });
  }
});

export default router;
