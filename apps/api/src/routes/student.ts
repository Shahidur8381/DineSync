import { Router, Request, Response } from 'express';
import { supabase } from '@dinesync/db';
import { requireAuth, getUser } from '../middleware/auth';

const router: Router = Router();

// Apply auth to all student routes
router.use(requireAuth('student'));

// GET /api/student/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const { sub } = getUser(req);

  try {
    const { data: student, error } = await supabase
      .from('Student')
      .select('*, cards:Card(*), mealStatus:MealStatus(*)')
      .eq('id', sub)
      .single();

    if (error || !student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    const mealStatus = student.mealStatus && Array.isArray(student.mealStatus) && student.mealStatus.length > 0 
      ? student.mealStatus[0] 
      : student.mealStatus;

    res.json({
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      status: student.status,
      isAllowed: mealStatus ? mealStatus.isAllowed : true,
      isConsumed: mealStatus ? mealStatus.isConsumed : false,
      cards: (student.cards || []).map((c: any) => ({
        uid: c.uid,
        status: c.status,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/student/meal-status
router.put('/meal-status', async (req: Request, res: Response): Promise<void> => {
  const { sub } = getUser(req);
  const { isAllowed } = req.body;

  try {
    const { data, error } = await supabase
      .from('MealStatus')
      .update({ isAllowed })
      .eq('studentId', sub)
      .select()
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student/search
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q as string;
  const { sub } = getUser(req); // current student ID

  if (!q || q.length < 2) {
    res.json([]);
    return;
  }

  try {
    const { data: students, error } = await supabase
      .from('Student')
      .select('id, studentId, name, mealStatus:MealStatus(isAllowed)')
      .neq('id', sub) // don't suggest themselves
      .or(`studentId.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(20);

    if (error) { res.status(500).json({ error: error.message }); return; }
    
    // Filter out students who already have their meal turned on
    const availableStudents = (students || [])
      .filter(s => {
        const mealStatus = Array.isArray(s.mealStatus) ? s.mealStatus[0] : s.mealStatus;
        return !mealStatus || !mealStatus.isAllowed;
      })
      .slice(0, 5)
      .map(s => ({ id: s.id, studentId: s.studentId, name: s.name }));

    res.json(availableStudents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/student/transfer
router.post('/transfer', async (req: Request, res: Response): Promise<void> => {
  const { sub } = getUser(req);
  const { targetStudentId } = req.body; // This is the UUID of the target student

  if (!targetStudentId) {
    res.status(400).json({ error: 'Target student ID is required' });
    return;
  }

  try {
    // 1. Verify current student can transfer (isAllowed = true, isConsumed = false)
    const { data: myStatus, error: myError } = await supabase
      .from('MealStatus')
      .select('*')
      .eq('studentId', sub)
      .single();

    if (myError || !myStatus || !myStatus.isAllowed || myStatus.isConsumed) {
      res.status(400).json({ error: 'You cannot transfer your meal right now' });
      return;
    }

    // 2. Verify target student does NOT already have their meal turned on
    const { data: targetStatus, error: targetError } = await supabase
      .from('MealStatus')
      .select('*')
      .eq('studentId', targetStudentId)
      .maybeSingle();

    if (targetStatus && targetStatus.isAllowed) {
      res.status(400).json({ error: 'This student already has their meal turned on' });
      return;
    }

    // 3. Turn off my meal
    const { error: updateMyError } = await supabase
      .from('MealStatus')
      .update({ isAllowed: false })
      .eq('studentId', sub);

    if (updateMyError) {
      res.status(500).json({ error: 'Failed to update your meal status' });
      return;
    }

    // 4. Turn on target student's meal (upsert or update)
    if (targetStatus) {
      await supabase
        .from('MealStatus')
        .update({ isAllowed: true })
        .eq('studentId', targetStudentId);
    } else {
      await supabase
        .from('MealStatus')
        .insert({ studentId: targetStudentId, isAllowed: true, isConsumed: false });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
