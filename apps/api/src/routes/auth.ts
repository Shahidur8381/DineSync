import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@dinesync/db';
import { validate } from '../middleware/validate';
import { LoginRequestSchema } from '@dinesync/types';
import { requireAuth } from '../middleware/auth';

const router: Router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password, role, studentId } = req.body;

  try {
    let user: { id: string; name: string; email: string; passwordHash: string; role: string } | null = null;

    if (role === 'admin') {
      const { data: admin } = await supabase.from('Admin').select('*').eq('email', email).single();
      if (admin) {
        user = { ...admin, role: admin.role };
      }
    } else {
      // Student simple login: just studentId
      const { data: student } = await supabase.from('Student').select('*').eq('studentId', studentId).single();
      if (student) {
        user = { ...student, role: 'student' };
      }
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (role === 'admin') {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', requireAuth(), (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth(), (req: Request, res: Response) => {
  const user = (req as Request & { user: { sub: string; role: string; email: string; name: string } }).user;
  res.json({ id: user.sub, role: user.role, email: user.email, name: user.name });
});

export default router;
