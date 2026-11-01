import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'aura_artisan_beverage_super_secret_jwt_key_2026';
export const COOKIE_NAME = 'auth_token';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  email_verified: number;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
  delivery_address?: string;
  parent_id?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

import { supabase } from './supabase.js';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash?: string | null): Promise<boolean> {
  if (!hash) return false;
  // Support plain text match if account was created with plain text
  if (password === hash) return true;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    let user: AuthUser | undefined = undefined;
    try {
      user = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, delivery_address, parent_id FROM users WHERE id = ?').get(payload.id) as AuthUser | undefined;
    } catch {
      user = undefined;
    }

    if (!user) {
      try {
        const { data: sbUser } = await supabase.from('users').select('*').eq('id', payload.id).maybeSingle();
        if (sbUser) {
          user = {
            id: String(sbUser.id),
            name: sbUser.name || 'Aurra User',
            email: sbUser.email,
            role: sbUser.role || 'user',
            email_verified: 1,
            created_at: sbUser.created_at,
            updated_at: sbUser.updated_at,
            avatar_url: sbUser.avatar_url || sbUser.user_profile,
            delivery_address: sbUser.delivery_address,
            parent_id: 'AURRA-DIST-IND-01',
          };
        }
      } catch {
        // ignore
      }
    }

    if (!user && (payload.role === 'admin' || payload.email === 'adminaurra@beverages.com')) {
      user = {
        id: payload.id || 'admin_sys_01',
        name: payload.name || 'Aurra Administrator',
        email: payload.email || 'adminaurra@beverages.com',
        role: 'admin',
        email_verified: 1,
      };
    } else if (!user && payload.id && payload.email) {
      user = { ...payload };
    }

    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: 'User account not found. Please log in again.' });
    }
    req.user = user;
    next();
  } catch (err) {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
      const user = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, delivery_address, parent_id FROM users WHERE id = ?').get(payload.id) as AuthUser | undefined;
      if (user) {
        req.user = user;
      }
    } catch {
      // ignore
    }
  }
  next();
}
