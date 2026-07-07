import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '@dinesync/db';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  UpdateMealSessionSchema,
} from '@dinesync/types';
import { getIoInstance } from '../lib/socket';

const router: Router = Router();

// All admin routes require admin JWT
router.use(requireAuth('admin'));

// ─── Meal Session Settings ───────────────────────────────────────────────────

router.get('/meal-session', async (_req: Request, res: Response): Promise<void> => {
  const { data: session, error } = await supabase.from('MealSession').select('*').single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(session);
});

router.put('/meal-session', validate(UpdateMealSessionSchema), async (req: Request, res: Response): Promise<void> => {
  // Always update the first row
  const { data: current } = await supabase.from('MealSession').select('id').single();
  
  if (current) {
    const { data: session, error } = await supabase
      .from('MealSession')
      .update(req.body)
      .eq('id', current.id)
      .select()
      .single();
      
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(session);
  } else {
    // If no row exists, create it
    const { data: session, error } = await supabase
      .from('MealSession')
      .insert({ ...req.body, mealType: 'LUNCH' })
      .select()
      .single();
      
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(session);
  }
});

// ─── Logs Feed ────────────────────────────────────────────────────────────────

router.get('/logs', async (_req: Request, res: Response): Promise<void> => {
  const { data: logs, error } = await supabase
    .from('Log')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(50);
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(logs || []);
});

// ─── Students (Simplified) ────────────────────────────────────────────────────

router.get('/students', async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1'));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20')));
  const search = (req.query.search as string) || '';
  const skip = (page - 1) * limit;

  let query = supabase.from('Student').select('*, mealStatus:MealStatus(*), cards:Card(*)', { count: 'exact' });
  
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,studentId.ilike.%${search}%`);
  }

  const { data: students, count: total, error } = await query
    .order('createdAt', { ascending: false })
    .range(skip, skip + limit - 1);

  if (error) { res.status(500).json({ error: error.message }); return; }

  res.json({
    data: (students || []),
    total: total || 0,
    page,
    limit,
    totalPages: Math.ceil((total || 0) / limit),
  });
});

router.post('/students', async (req: Request, res: Response): Promise<void> => {
  const { password, ...rest } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID(); 

  const { data: student, error } = await supabase
    .from('Student')
    .insert({ ...rest, passwordHash, id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Student ID or email already exists' });
      return;
    }
    res.status(500).json({ error: error.message });
    return;
  }
  
  // Create an initial MealStatus for the new student
  await supabase.from('MealStatus').insert({ studentId: student.id, status: 'NOT_CONSUMED' });

  res.status(201).json(student);
});

router.put('/students/:id', async (req: Request, res: Response): Promise<void> => {
  // Only allow updating name and email (status is always ACTIVE)
  const { name, email } = req.body;
  const { data: student, error } = await supabase
    .from('Student')
    .update({ name, email })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !student) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(student);
});

// Update a student's RFID card UID
router.put('/students/:id/rfid', async (req: Request, res: Response): Promise<void> => {
  const { uid } = req.body;
  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ error: 'uid is required' });
    return;
  }

  // Check if card already assigned to this student
  const { data: existing } = await supabase
    .from('Card')
    .select('id')
    .eq('studentId', req.params.id)
    .maybeSingle();

  if (existing) {
    // Update existing card
    const { data, error } = await supabase
      .from('Card')
      .update({ uid })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } else {
    // Insert new card
    const { data, error } = await supabase
      .from('Card')
      .insert({ uid, studentId: req.params.id })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'This RFID card is already assigned to another student' });
        return;
      }
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data);
  }
});

router.delete('/students/:id', async (req: Request, res: Response): Promise<void> => {
  // First delete associated MealStatus manually if needed, but Supabase might handle cascading
  const { error } = await supabase.from('Student').delete().eq('id', req.params.id);
  if (error) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ ok: true });
});

// Update specific student's meal status manually (isAllowed / isConsumed)
router.put('/students/:id/meal-status', async (req: Request, res: Response): Promise<void> => {
  const { isAllowed, isConsumed } = req.body;
  
  const updatePayload: any = {};
  if (isAllowed !== undefined) updatePayload.isAllowed = isAllowed;
  if (isConsumed !== undefined) updatePayload.isConsumed = isConsumed;

  if (Object.keys(updatePayload).length === 0) {
    res.status(400).json({ error: 'No valid fields provided' });
    return;
  }

  const { data, error } = await supabase
    .from('MealStatus')
    .update(updatePayload)
    .eq('studentId', req.params.id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ─── Devices ──────────────────────────────────────────────────────────────────

router.get('/devices', async (_req: Request, res: Response): Promise<void> => {
  const { data: devices, error } = await supabase
    .from('Device')
    .select('id, name, location, firmwareVersion, lastHeartbeat, status')
    .order('name', { ascending: true });
    
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(devices || []);
});

// ─── Analytics (Simplified) ───────────────────────────────────────────────────

router.get('/analytics/summary', async (req: Request, res: Response): Promise<void> => {
  const { data: session } = await supabase.from('MealSession').select('totalMeals').single();
  const totalMeals = session?.totalMeals || 0;

  const { count: consumedCount } = await supabase
    .from('MealStatus')
    .select('*', { count: 'exact', head: true })
    .eq('isConsumed', true);

  const { data: devices } = await supabase.from('Device').select('status');
  const onlineDevices = (devices || []).filter((d: any) => d.status === 'ONLINE').length;
  const offlineDevices = (devices || []).filter((d: any) => d.status === 'OFFLINE').length;

  res.json({
    totalMeals,
    consumedMeals: consumedCount || 0,
    mealsLeft: Math.max(0, totalMeals - (consumedCount || 0)),
    onlineDevices,
    offlineDevices,
  });
});

export { router as adminRouter };
export default router;
