import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  role: 'student' | 'admin';
  email: string;
  name: string;
}

export function requireAuth(role?: 'student' | 'admin') {
  return (req: Request, res: Response, next: NextFunction): void => {
    let token = req.cookies?.token as string | undefined;
    if (role === 'admin' && req.cookies?.admin_token) {
      token = req.cookies.admin_token;
    } else if (!role && req.cookies?.admin_token) {
      // If no specific role requested but admin_token exists, try it
      token = req.cookies.admin_token;
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      if (role && payload.role !== role) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      (req as Request & { user: JwtPayload }).user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}
