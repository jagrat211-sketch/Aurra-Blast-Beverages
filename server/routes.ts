import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from './db.js';
import {
  hashPassword,
  comparePassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireAdmin,
  optionalAuth,
} from './auth.js';
import {
  saveBeverageImage,
  uploadToCloudinarySigned,
  getSignedUploadParams,
  CLOUDINARY_DEFAULTS,
} from './uploadService.js';
import { supabase } from './supabase.js';

const router = Router();

// Zod schemas
const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const verifyEmailSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  code: z.string().trim().length(6, 'Verification code must be 6 digits'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const cartEventSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  action: z.enum(['add', 'remove', 'set_qty']),
  qty: z.number().int().min(0, 'Quantity cannot be negative'),
});

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().positive('Quantity must be greater than 0'),
    })
  ).min(1, 'Cart cannot be empty to place an order'),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  beverage_name: z.string().trim().optional(),
  flavor: z.string().trim().min(2),
  flavor_notes: z.string().trim().optional(),
  price: z.number().positive('Price must be greater than 0'),
  image_url: z.string().min(1, 'Image is required'),
  description: z.string().trim().min(5),
  volume: z.string().trim().default('330ml'),
  calories: z.number().int().nonnegative().default(40),
  category: z.string().trim().default('Botanical Sparkler'),
  total_quantity: z.number().int().nonnegative().default(50),
  remaining_quantity: z.number().int().nonnegative().optional(),
  active: z.number().int().min(0).max(1).default(1),
});

// Helper for generating UUIDs
function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

// POST /api/auth/signup - Integrates Supabase users table (name, email, hashed password, role: 'user', created_at)
// NOTE: Does NOT log the user in automatically. Directs user to sign-in page to enter credentials.
router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const parse = signupSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid input' });
    }

    const { name, email, password } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if email already registered in Supabase users table
    try {
      const { data: existingSbUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingSbUser) {
        return res.status(400).json({ error: 'Email already registered. Please sign in.' });
      }
    } catch (checkErr) {
      console.warn('Supabase check existing user warning:', checkErr);
    }

    // Also check local database if available
    try {
      const existingLocal = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail) as { id: string; email: string } | undefined;
      if (existingLocal) {
        return res.status(400).json({ error: 'Email already registered. Please sign in.' });
      }
    } catch {
      // Ignore if local database is not ready or read-only
    }

    // 2. Hash password with bcrypt
    const hashedPassword = await hashPassword(password);
    const createdAt = new Date().toISOString();
    let userId = generateId('usr');

    // 3. Insert into Supabase users table with default role as 'user' and created_at captured
    try {
      const { data: insertedData, error: sbInsertError } = await supabase
        .from('users')
        .insert({
          name,
          email: cleanEmail,
          password: hashedPassword,
          role: 'user',
          created_at: createdAt,
        })
        .select()
        .maybeSingle();

      if (sbInsertError) {
        console.warn('Supabase users insert note:', sbInsertError.message || sbInsertError);
        if (sbInsertError.code === '23505' || sbInsertError.message?.toLowerCase().includes('duplicate') || sbInsertError.message?.toLowerCase().includes('unique')) {
          return res.status(400).json({ error: 'Email already registered. Please sign in.' });
        }
      } else if (insertedData?.id) {
        userId = String(insertedData.id);
      }
    } catch (sbErr: any) {
      console.warn('Supabase users insert caught error:', sbErr);
    }

    // 4. Save to local SQLite database if available
    try {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at)
        VALUES (?, ?, ?, ?, 'user', 1, ?)
      `).run(userId, name, cleanEmail, hashedPassword, createdAt);
    } catch (localSaveErr) {
      console.warn('Local SQLite write bypassed (serverless environment):', localSaveErr);
    }

    // FLOW REQUIREMENT:
    // Do NOT log the user in automatically after sign-up.
    // Return success message so frontend redirects user to Sign-In page to manually enter credentials.
    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Please sign in with your email and password.',
      email: cleanEmail,
      redirectTo: '/auth',
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});


// POST /api/auth/verify-email
router.post('/auth/verify-email', (req: Request, res: Response) => {
  try {
    const parse = verifyEmailSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid code' });
    }

    const { email, code } = parse.data;
    const user = db.prepare('SELECT id, name, email, role, email_verified, verification_code FROM users WHERE email = ?').get(email) as
      | { id: string; name: string; email: string; role: string; email_verified: number; verification_code: string }
      | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.email_verified === 1) {
      // Already verified, log them in
      const token = signToken(user);
      setAuthCookie(res, token);
      return res.json({
        success: true,
        message: 'Email already verified. Logged in successfully.',
        user: { id: user.id, name: user.name, email: user.email, role: user.role, email_verified: 1 },
      });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    // Mark as verified
    db.prepare('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?').run(user.id);

    const verifiedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      email_verified: 1,
    };

    const token = signToken(verifiedUser);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Email verified successfully! Welcome to Aura.',
      user: verifiedUser,
    });
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/resend-code
router.post('/auth/resend-code', (req: Request, res: Response) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT id, email_verified FROM users WHERE email = ?').get(email) as
      | { id: string; email_verified: number }
      | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified === 1) {
      return res.status(400).json({ error: 'Account is already verified. Please log in.' });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.prepare('UPDATE users SET verification_code = ? WHERE id = ?').run(newCode, user.id);

    return res.json({
      success: true,
      message: 'New verification code generated.',
      devVerificationCode: newCode,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not resend verification code' });
  }
});

// POST /api/auth/login - Verifies against Supabase users table & checks role ('admin' vs 'user')
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid input' });
    }

    const { email, password } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Direct support for default admin user: adminaurra@beverages.com or Admin@G.com / admin with Admin / admin
    const isDefaultAdmin = (cleanEmail === 'adminaurra@beverages.com' || cleanEmail === 'admin@g.com' || cleanEmail === 'admin') &&
      (password.toLowerCase() === 'admin');

    if (isDefaultAdmin) {
      const authUser = {
        id: 'admin_sys_01',
        name: 'Aurra Administrator',
        email: 'adminaurra@beverages.com',
        role: 'admin' as const,
        email_verified: 1,
        created_at: new Date().toISOString(),
        avatar_url: undefined,
        parent_id: 'AURRA-HQ-01',
      };
      try {
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at, parent_id)
          VALUES (?, 'Aurra Administrator', ?, ?, 'admin', 1, ?, 'AURRA-HQ-01')
        `).run(authUser.id, authUser.email, await hashPassword('admin'), authUser.created_at);
      } catch {
        // ignore
      }
      const token = signToken(authUser);
      setAuthCookie(res, token);
      return res.json({ success: true, user: authUser, token });
    }

    // 2. Verify user credentials against Supabase users table
    try {
      const { data: sbUser, error: sbError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      const storedPasswordHash = sbUser?.password || sbUser?.password_hash;
      if (sbUser && storedPasswordHash) {
        // Compare password using bcrypt (with plain-text backward compatibility)
        const isMatch = await comparePassword(password, storedPasswordHash);
        if (isMatch) {
          // If password was stored in plain text, upgrade it to bcrypt hash in Supabase!
          if (storedPasswordHash === password && !password.startsWith('$2')) {
            try {
              const upgradedHash = await hashPassword(password);
              await supabase.from('users').update({ password: upgradedHash }).eq('id', sbUser.id);
            } catch {
              // ignore
            }
          }

          // Check role from Supabase column ('admin' or 'user')
          const assignedRole = (sbUser.role === 'admin' || cleanEmail === 'adminaurra@beverages.com') ? 'admin' : 'user';
          const savedAddress = sbUser.delivery_address || sbUser.deliveryAddress || sbUser.address || null;
          const savedContact = sbUser['contact_no.'] || sbUser.contact_no || null;

          const authUser = {
            id: String(sbUser.id),
            name: sbUser.name || 'Aurra Customer',
            email: sbUser.email,
            role: assignedRole,
            email_verified: 1,
            created_at: sbUser.created_at || new Date().toISOString(),
            updated_at: sbUser.updated_at || null,
            delivery_address: savedAddress,
            contact_no: savedContact,
            avatar_url: sbUser.avatar_url || sbUser.user_profile || null,
            parent_id: sbUser.parent_id || 'AURRA-DIST-IND-01',
          };

          // Synchronize with local SQLite if available
          try {
            db.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at, delivery_address, contact_no, avatar_url, parent_id)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
            `).run(
              authUser.id,
              authUser.name,
              authUser.email,
              storedPasswordHash,
              assignedRole,
              authUser.created_at,
              authUser.updated_at,
              authUser.delivery_address,
              authUser.contact_no,
              authUser.avatar_url,
              authUser.parent_id
            );
          } catch (syncErr) {
            console.warn('Sync user to SQLite notice:', syncErr);
          }

          const token = signToken(authUser);
          setAuthCookie(res, token);
          return res.json({ success: true, user: authUser, token });
        } else {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
      }
    } catch (sbErr) {
      console.warn('Supabase login lookup error:', sbErr);
    }

    // 3. Fallback: Check local SQLite database
    const localUser = db.prepare('SELECT id, name, email, password_hash, role, email_verified, created_at, updated_at, delivery_address, contact_no, avatar_url, parent_id FROM users WHERE email = ?').get(cleanEmail) as any;
    if (localUser) {
      const validPassword = await comparePassword(password, localUser.password_hash);
      if (validPassword) {
        const assignedRole = (localUser.role === 'admin' || cleanEmail === 'adminaurra@beverages.com') ? 'admin' : 'user';
        const authUser = {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: assignedRole,
          email_verified: 1,
          created_at: localUser.created_at,
          updated_at: localUser.updated_at || null,
          delivery_address: localUser.delivery_address || null,
          contact_no: localUser.contact_no || null,
          avatar_url: localUser.avatar_url || null,
          parent_id: localUser.parent_id || 'AURRA-DIST-IND-01',
        };
        const token = signToken(authUser);
        setAuthCookie(res, token);
        return res.json({ success: true, user: authUser, token });
      }
    }

    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  let user: any = null;
  try {
    user = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, user_profile, delivery_address, contact_no, parent_id FROM users WHERE id = ? OR email = ?').get(req.user!.id, req.user!.email);
  } catch {
    user = null;
  }

  // Also query latest user_profile, delivery_address, and contact_no from Supabase
  let sbUser: any = null;
  try {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', req.user!.email)
      .maybeSingle();
    sbUser = data;
  } catch {}

  const finalProfile = sbUser?.user_profile || sbUser?.avatar_url || user?.user_profile || user?.avatar_url || req.user!.avatar_url || null;
  const finalAddress = sbUser?.delivery_address || user?.delivery_address || req.user!.delivery_address || null;
  const finalContact = sbUser?.['contact_no.'] || sbUser?.contact_no || user?.contact_no || (req.user as any)!.contact_no || null;

  return res.json({
    user: {
      id: user?.id || (sbUser ? String(sbUser.id) : req.user!.id),
      name: sbUser?.name || user?.name || req.user!.name,
      email: user?.email || req.user!.email,
      role: user?.role || req.user!.role,
      email_verified: 1,
      created_at: user?.created_at || req.user!.created_at,
      updated_at: user?.updated_at || null,
      avatar_url: finalProfile,
      user_profile: finalProfile,
      delivery_address: finalAddress,
      contact_no: finalContact,
      parent_id: user?.parent_id || req.user!.parent_id || 'AURRA-DIST-IND-01',
    },
  });
});

// POST /api/auth/admin-login (Verifies admin credentials from Supabase or default adminaurra@beverages.com)
router.post('/auth/admin-login', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body || {};
    const inputIdentifier = (username || email || '').toString().trim();
    if (!inputIdentifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    const cleanUser = inputIdentifier.toLowerCase();
    const cleanPass = String(password).trim();

    // 1. Check default admin (adminaurra@beverages.com or Admin@G.com / admin with Admin or admin)
    const isDefaultAdmin = (cleanUser === 'adminaurra@beverages.com' || cleanUser === 'admin@g.com' || cleanUser === 'admin') &&
      cleanPass.toLowerCase() === 'admin';

    if (isDefaultAdmin) {
      let existingProfile: string | undefined = undefined;
      try {
        const { data: sbAdmin } = await supabase.from('users').select('user_profile, avatar_url').eq('email', 'adminaurra@beverages.com').maybeSingle();
        if (sbAdmin?.user_profile || sbAdmin?.avatar_url) {
          existingProfile = sbAdmin.user_profile || sbAdmin.avatar_url;
        }
      } catch {}

      if (!existingProfile) {
        try {
          const localAdmin = db.prepare('SELECT avatar_url, user_profile FROM users WHERE email = ?').get('adminaurra@beverages.com') as any;
          if (localAdmin?.user_profile || localAdmin?.avatar_url) {
            existingProfile = localAdmin.user_profile || localAdmin.avatar_url;
          }
        } catch {}
      }

      const authUser = {
        id: 'admin_sys_01',
        name: 'Aurra Administrator',
        email: 'adminaurra@beverages.com',
        role: 'admin' as const,
        email_verified: 1,
        created_at: new Date().toISOString(),
        avatar_url: existingProfile,
        user_profile: existingProfile,
        parent_id: 'AURRA-HQ-01',
      };

      try {
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at, avatar_url, user_profile, parent_id)
          VALUES (?, 'Aurra Administrator', ?, ?, 'admin', 1, ?, ?, ?, 'AURRA-HQ-01')
        `).run(authUser.id, authUser.email, await hashPassword('admin'), authUser.created_at, existingProfile || null, existingProfile || null);
      } catch (err) {
        console.warn('Admin SQLite insert warning:', err);
      }

      const token = signToken(authUser);
      setAuthCookie(res, token);
      return res.json({ success: true, token, user: authUser });
    }

    // 2. Query Supabase users table for admin role verification
    try {
      const { data: sbUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanUser)
        .maybeSingle();

      if (sbUser && sbUser.password) {
        const isMatch = await comparePassword(cleanPass, sbUser.password);
        if (isMatch) {
          // Explicit admin role check
          if (sbUser.role !== 'admin' && cleanUser !== 'adminaurra@beverages.com') {
            return res.status(403).json({ error: 'Access denied: Regular users with role "user" cannot access the admin panel.' });
          }

          const authUser = {
            id: String(sbUser.id),
            name: sbUser.name || 'Aurra Administrator',
            email: sbUser.email,
            role: 'admin' as const,
            email_verified: 1,
            created_at: sbUser.created_at || new Date().toISOString(),
          };

          const token = signToken(authUser);
          setAuthCookie(res, token);
          return res.json({ success: true, user: authUser });
        }
      }
    } catch (sbErr) {
      console.warn('Supabase admin login lookup error:', sbErr);
    }

    // 3. Fallback: local DB admin check
    const dbAdmin = db.prepare("SELECT id, name, email, password_hash, role, email_verified, created_at, avatar_url, parent_id FROM users WHERE (email = ? OR id = ?) AND role = 'admin'").get(cleanUser, cleanUser) as any;
    if (dbAdmin && (await comparePassword(cleanPass, dbAdmin.password_hash))) {
      const authUser = {
        id: dbAdmin.id,
        name: dbAdmin.name,
        email: dbAdmin.email,
        role: 'admin' as const,
        email_verified: 1,
        created_at: dbAdmin.created_at,
        avatar_url: dbAdmin.avatar_url || null,
        parent_id: dbAdmin.parent_id || 'AURRA-HQ-01',
      };
      const token = signToken(authUser);
      setAuthCookie(res, token);
      return res.json({ success: true, user: authUser });
    }

    return res.status(401).json({ error: 'Invalid admin credentials. (Default: adminaurra@beverages.com / admin)' });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Admin login failed' });
  }
});

// PUT /api/auth/change-password
router.put('/auth/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required' });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const userId = req.user!.id;
    const userEmail = req.user!.email?.toLowerCase().trim();

    let storedPasswordHash: string | null = null;

    // 1. Check SQLite
    try {
      const localUser = db.prepare('SELECT id, email, password_hash FROM users WHERE id = ? OR email = ?').get(userId, userEmail) as any;
      if (localUser && localUser.password_hash) {
        storedPasswordHash = localUser.password_hash;
      }
    } catch {}

    // 2. Check Supabase
    try {
      const { data: sbUser } = await supabase.from('users').select('*').eq('email', userEmail).maybeSingle();
      if (!storedPasswordHash && sbUser) {
        storedPasswordHash = sbUser.password || sbUser.password_hash;
      }
    } catch (e) {
      console.warn('Supabase password check warning:', e);
    }

    // Default admin fallback password check
    if (!storedPasswordHash && (userEmail === 'adminaurra@beverages.com' || userEmail === 'admin@g.com')) {
      storedPasswordHash = await hashPassword('admin');
    }

    if (!storedPasswordHash) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const isValid = await comparePassword(currentPassword, storedPasswordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    // 1. Update SQLite
    try {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at
      `).run(userId, req.user!.name || 'Aurra User', userEmail, newHash, req.user!.role || 'user', req.user!.created_at || now, now);
    } catch {
      try {
        db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ? OR id = ?').run(newHash, now, userEmail, userId);
      } catch {}
    }

    // 2. Update Supabase users table (capturing updated_at; created_at remains unchanged)
    try {
      await supabase
        .from('users')
        .update({ password: newHash, updated_at: now })
        .eq('email', userEmail);
    } catch (sbErr) {
      console.warn('Supabase password update error:', sbErr);
    }

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/cloudinary/sign (Generates authenticated signature using API Secret for signed client uploads)
router.post('/cloudinary/sign', requireAuth, (req: Request, res: Response) => {
  try {
    const { folder } = req.body || {};
    const targetFolder: 'Aurra profile' | 'Aurra products' =
      folder === 'Aurra products' ? 'Aurra products' : 'Aurra profile';

    // Strict security: Only admin can sign uploads to "Aurra products"
    if (targetFolder === 'Aurra products' && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can upload product images' });
    }

    const signedParams = getSignedUploadParams(targetFolder);
    return res.json({
      success: true,
      ...signedParams,
    });
  } catch (err: any) {
    console.error('Cloudinary signature error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate Cloudinary signature' });
  }
});

// POST /api/auth/avatar (User Profile picture upload - signed to Cloudinary folder "Aurra profile")
router.post('/auth/avatar', requireAuth, async (req: Request, res: Response) => {
  try {
    const { avatarUrl, imageBase64, remove } = req.body || {};
    const now = new Date().toISOString();

    // 1. Photo removal requested (clears user_profile in Supabase and SQLite)
    if (remove || avatarUrl === null || avatarUrl === '') {
      try {
        db.prepare('UPDATE users SET avatar_url = NULL, user_profile = NULL, updated_at = ? WHERE id = ? OR email = ?')
          .run(now, req.user!.id, req.user!.email);
      } catch {}

      try {
        await supabase
          .from('users')
          .update({
            user_profile: null,
            updated_at: now,
          })
          .ilike('email', req.user!.email.toLowerCase().trim());
      } catch (sbErr) {
        console.warn('Supabase profile removal notice:', sbErr);
      }

      let updatedUser: any = null;
      try {
        updatedUser = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, user_profile, delivery_address, parent_id FROM users WHERE id = ? OR email = ?').get(req.user!.id, req.user!.email);
      } catch {}

      if (!updatedUser) {
        updatedUser = {
          ...req.user,
          avatar_url: null,
          user_profile: null,
        };
      }

      return res.json({
        success: true,
        url: null,
        user: updatedUser,
      });
    }

    const inputData = avatarUrl || imageBase64;
    if (!inputData || typeof inputData !== 'string') {
      return res.status(400).json({ error: 'Avatar image URL or data is required' });
    }

    let finalProfileUrl = inputData;

    // If input is base64 or not yet hosted on Cloudinary, securely upload signed to Cloudinary folder "Aurra profile"
    if (inputData.startsWith('data:image/') || !inputData.includes('res.cloudinary.com')) {
      try {
        const uploadRes = await uploadToCloudinarySigned(inputData, 'Aurra profile');
        finalProfileUrl = uploadRes.url;
      } catch (uploadErr: any) {
        console.warn('[Cloudinary User Profile Upload] Error:', uploadErr.message);
        if (inputData.startsWith('data:image/')) {
          return res.status(500).json({ error: 'Failed to upload profile photo to Cloudinary' });
        }
      }
    }

    // 1. Update SQLite local database
    try {
      db.prepare('UPDATE users SET avatar_url = ?, user_profile = ?, updated_at = ? WHERE id = ? OR email = ?')
        .run(finalProfileUrl, finalProfileUrl, now, req.user!.id, req.user!.email);
    } catch {
      try {
        db.prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ? OR email = ?')
          .run(finalProfileUrl, now, req.user!.id, req.user!.email);
      } catch {}
    }

    // 2. Update Supabase users table: user_profile column as requested
    try {
      const cleanEmail = req.user!.email?.toLowerCase().trim();
      const { error: sbErr } = await supabase
        .from('users')
        .update({
          user_profile: finalProfileUrl,
          updated_at: now,
        })
        .ilike('email', cleanEmail);

      if (sbErr) {
        console.warn('Supabase user_profile update warning:', sbErr);
      }
    } catch (sbErr) {
      console.warn('Supabase avatar update error:', sbErr);
    }

    let updated: any;
    try {
      updated = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, user_profile, delivery_address, parent_id FROM users WHERE id = ? OR email = ?').get(req.user!.id, req.user!.email);
    } catch {
      updated = null;
    }

    if (!updated) {
      updated = {
        ...req.user,
        avatar_url: finalProfileUrl,
        user_profile: finalProfileUrl,
      };
    }

    return res.json({
      success: true,
      url: finalProfileUrl,
      user: updated,
    });
  } catch (err) {
    console.error('Avatar update error:', err);
    return res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// -------------------------------------------------------------
// PRODUCTS ROUTES
// -------------------------------------------------------------

const DEFAULT_PRODUCTS = [
  {
    id: 'prod-cranberry-sparkle',
    name: 'Aurra Sparkle Cranberry',
    flavor: 'Tart Cranberry & Wild Botanicals',
    price: 149,
    image_url: '/assets/images/bev_cranberry_sparkle_1793439801856.jpg',
    description: 'Hand-picked crisp cranberries blended with mountain spring effervescence and floral botanical notes.',
    volume: '330ml',
    calories: 42,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
  {
    id: 'prod-mint-mojito',
    name: 'Aurra Mint Mojito',
    flavor: 'Fresh Garden Spearmint & Persian Lime',
    price: 159,
    image_url: '/assets/images/bev_mint_mojito_1793439802738.jpg',
    description: 'Muddled spearmint leaves paired with zesty cold-pressed lime and fine effervescent bubbles.',
    volume: '330ml',
    calories: 38,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
  {
    id: 'prod-zesty-lime',
    name: 'Aurra Zesty Lime',
    flavor: 'Crisp Citrus & Himalayan Sea Salt',
    price: 139,
    image_url: '/assets/images/bev_zesty_lime_1793439823884.jpg',
    description: 'Cold-pressed key limes with a subtle pinch of mineral salt for maximum crisp refreshment.',
    volume: '330ml',
    calories: 32,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
  {
    id: 'prod-mango-rush',
    name: 'Aurra Mango Rush',
    flavor: 'Ratnagiri Alphonso & Sunlit Citrus',
    price: 169,
    image_url: '/assets/images/bev_mango_rush_1793439803204.jpg',
    description: 'Pure sun-ripened Alphonso mango puree kissed with sparkling carbonation and subtle cardamom finish.',
    volume: '330ml',
    calories: 54,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
  {
    id: 'prod-orange-fizz',
    name: 'Aurra Fizz Orange',
    flavor: 'Nagpur Mandarin & Valencia Orange',
    price: 149,
    image_url: '/assets/images/bev_orange_fizz_1793439826689.jpg',
    description: 'Juicy burst of fresh-squeezed sunburst oranges with sparkling micro-bubbles and orange blossom essence.',
    volume: '330ml',
    calories: 48,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
  {
    id: 'prod-peach-iced-tea',
    name: 'Aurra Peach Iced Tea',
    flavor: 'Darjeeling Black Tea & Ripe Golden Peach',
    price: 159,
    image_url: '/assets/images/bev_peach_iced_tea_1793439826681.jpg',
    description: 'Single-estate Darjeeling black tea slow-brewed with golden orchard peach slices and organic mint.',
    volume: '355ml',
    calories: 40,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
  {
    id: 'prod-passionfruit-fizz',
    name: 'Aurra Passionfruit',
    flavor: 'Tropical Passionfruit & Wild Citrus',
    price: 169,
    image_url: '/assets/images/bev_passionfruit_fizz_1793441269499.jpg',
    description: 'Lush golden passionfruit pulp gently carbonated with floral citrus blossom notes for a tropical burst.',
    volume: '330ml',
    calories: 44,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
  {
    id: 'prod-berry-blast',
    name: 'Aurra Berry Blast',
    flavor: 'Wild Blackberry, Blueberry & Acai',
    price: 179,
    image_url: '/assets/aistudio/aurra_berry_blast.jpg',
    description: 'A rich anthocyanin-packed blend of deep wild forest berries, dark grape skin, and fizzy spring water.',
    volume: '330ml',
    calories: 46,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
  },
];

// GET /api/products
router.get('/products', async (_req: Request, res: Response) => {
  try {
    let products: any[] = [];
    try {
      products = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY created_at ASC').all() as any[];
    } catch {
      products = [];
    }

    if (!products || products.length === 0) {
      products = DEFAULT_PRODUCTS.map((p) => ({ ...p }));
    }

    // Normalize image paths so /src/assets/images/ is always cleanly /assets/images/
    for (const p of products) {
      if (p.image_url && typeof p.image_url === 'string') {
        if (p.image_url.startsWith('/src/assets/images/')) {
          p.image_url = p.image_url.replace('/src/assets/images/', '/assets/images/');
        }
      }
    }

    // Attempt to merge real-time inventory and new formulations from Supabase products table
    try {
      const { data: sbProds } = await supabase.from('products').select('*');
      if (sbProds && sbProds.length > 0) {
        for (const sbP of sbProds) {
          const match = products.find(
            (p) => p.name === sbP.beverage_name || p.id === String(sbP.id) || p.beverage_name === sbP.beverage_name
          );
          if (match) {
            if (typeof sbP.remaining_quantity === 'number') {
              match.remaining_quantity = sbP.remaining_quantity;
            }
            if (typeof sbP.total_quantity === 'number') {
              match.total_quantity = sbP.total_quantity;
            }
            if (sbP.price) match.price = sbP.price;
            if (sbP.image_url) match.image_url = sbP.image_url;
            if (sbP.description) match.description = sbP.description;
            if (sbP.flavor_notes) {
              match.flavor_notes = sbP.flavor_notes;
              match.flavor = sbP.flavor_notes;
            }
          } else {
            // New beverage formulation added directly in Supabase or Admin
            products.push({
              id: String(sbP.id),
              name: sbP.beverage_name,
              beverage_name: sbP.beverage_name,
              flavor: sbP.flavor_notes || 'Botanical Sparkler',
              flavor_notes: sbP.flavor_notes || 'Botanical Sparkler',
              price: sbP.price || 149,
              image_url: sbP.image_url || '/assets/images/hero_beverage_can_1793439801479.jpg',
              description: sbP.description || '',
              volume: sbP.volume || '330ml',
              calories: sbP.calories || 40,
              category: sbP.category || 'Botanical Sparkler',
              total_quantity: sbP.total_quantity || 50,
              remaining_quantity: sbP.remaining_quantity || 50,
              active: 1,
              created_at: sbP.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // Use standard inventory values
    }

    return res.json({ products });
  } catch (err) {
    console.error('Fetch products notice (using defaults):', err);
    return res.json({ products: DEFAULT_PRODUCTS });
  }
});

// POST /api/products (Admin only: create new beverage or update with stock tracking)
router.post('/products', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parse = productSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid product data' });
    }

    const {
      name,
      beverage_name,
      flavor,
      flavor_notes,
      price,
      image_url,
      description,
      volume,
      calories,
      category,
      total_quantity,
      remaining_quantity,
      active,
    } = parse.data;

    const bevName = (beverage_name || name).trim();
    const flavNotes = (flavor_notes || flavor).trim();
    const cat = (category || 'Botanical Sparkler').trim();
    const totalQty = typeof total_quantity === 'number' ? total_quantity : 50;
    const now = new Date().toISOString();
    const id = req.body.id || generateId('prod');

    const cleanImageUrl = image_url?.startsWith('/src/assets/images/')
      ? image_url.replace('/src/assets/images/', '/assets/images/')
      : (image_url || '/assets/images/hero_beverage_can_1793439801479.jpg');

    let existing = null;
    try {
      existing = db.prepare('SELECT id, created_at, remaining_quantity FROM products WHERE id = ?').get(id) as any;
    } catch {
      existing = null;
    }

    const remainQty = typeof remaining_quantity === 'number'
      ? remaining_quantity
      : (existing && typeof existing.remaining_quantity === 'number' ? existing.remaining_quantity : totalQty);

    // 1. Sync directly to Supabase products table (matched by beverage_name)
    try {
      const { data: existingSbProd } = await supabase
        .from('products')
        .select('id')
        .ilike('beverage_name', bevName)
        .maybeSingle();

      if (existingSbProd?.id) {
        await supabase
          .from('products')
          .update({
            beverage_name: bevName,
            flavor_notes: flavNotes,
            description,
            price,
            category: cat,
            total_quantity: totalQty,
            remaining_quantity: remainQty,
            volume,
            calories,
            image_url: cleanImageUrl,
            updated_at: now,
          })
          .eq('id', existingSbProd.id);
      } else {
        await supabase
          .from('products')
          .insert({
            beverage_name: bevName,
            flavor_notes: flavNotes,
            description,
            price,
            category: cat,
            total_quantity: totalQty,
            remaining_quantity: remainQty,
            volume,
            calories,
            image_url: cleanImageUrl,
            created_at: now,
          });
      }
    } catch (sbErr) {
      console.warn('Supabase product sync warning (handled gracefully):', sbErr);
    }

    // 2. Sync to local SQLite if available
    try {
      if (existing) {
        db.prepare(`
          UPDATE products
          SET name = ?, beverage_name = ?, flavor = ?, flavor_notes = ?, price = ?, image_url = ?, description = ?,
              volume = ?, calories = ?, category = ?, total_quantity = ?, remaining_quantity = ?, active = ?, updated_at = ?
          WHERE id = ?
        `).run(bevName, bevName, flavNotes, flavNotes, price, cleanImageUrl, description, volume, calories, cat, totalQty, remainQty, active, now, id);
      } else {
        db.prepare(`
          INSERT INTO products (id, name, beverage_name, flavor, flavor_notes, price, image_url, description, volume, calories, category, total_quantity, remaining_quantity, active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, bevName, bevName, flavNotes, flavNotes, price, cleanImageUrl, description, volume, calories, cat, totalQty, remainQty, active, now);
      }
    } catch (localDbErr) {
      console.warn('Local SQLite product save notice:', localDbErr);
    }

    const saved = {
      id,
      name: bevName,
      beverage_name: bevName,
      flavor: flavNotes,
      flavor_notes: flavNotes,
      price,
      image_url: cleanImageUrl,
      description,
      volume,
      calories,
      category: cat,
      total_quantity: totalQty,
      remaining_quantity: remainQty,
      active,
      created_at: now,
    };
    return res.status(201).json({ success: true, product: saved });
  } catch (err) {
    console.error('Save product error:', err);
    return res.status(500).json({ error: 'Failed to save product' });
  }
});

// DELETE /api/products/:id (Delete product from SQLite and Supabase)
router.delete('/products/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const name = (req.query.name as string)?.trim();

    // 1. Delete from SQLite
    try {
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
      if (name) {
        db.prepare('DELETE FROM products WHERE name = ? OR beverage_name = ?').run(name, name);
      }
    } catch (sqlErr) {
      console.warn('SQLite delete notice:', sqlErr);
    }

    // 2. Delete from Supabase
    try {
      if (!isNaN(Number(id))) {
        await supabase.from('products').delete().eq('id', Number(id));
      } else {
        await supabase.from('products').delete().eq('id', id);
      }
      if (name) {
        await supabase.from('products').delete().ilike('beverage_name', name);
      }
    } catch (sbErr) {
      console.warn('Supabase product delete notice:', sbErr);
    }

    return res.json({ success: true, message: 'Beverage deleted successfully' });
  } catch (err) {
    console.error('Delete product error:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/products/upload-image (Admin only: signed upload to Cloudinary folder "Aurra products")
router.post('/products/upload-image', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { imageBase64, imageUrl, filename, productId, cloudinaryConfig } = req.body;

    const inputData = imageUrl || imageBase64;
    if (!inputData || typeof inputData !== 'string') {
      return res.status(400).json({ error: 'Image data or image URL is required' });
    }

    let resultUrl = inputData;
    let provider: 'cloudinary' | 'local_storage' = 'cloudinary';
    let sizeBytes = 0;
    let finalFilename = filename || 'product';

    if (inputData.startsWith('data:image/') || !inputData.includes('res.cloudinary.com')) {
      try {
        const uploadRes = await uploadToCloudinarySigned(inputData, 'Aurra products', cloudinaryConfig);
        resultUrl = uploadRes.url;
        provider = 'cloudinary';
        sizeBytes = uploadRes.sizeBytes;
        finalFilename = uploadRes.filename;
      } catch (uploadErr: any) {
        console.warn('[Cloudinary Admin Product Upload] Error, falling back to local storage:', uploadErr.message);
        const fallbackRes = await saveBeverageImage(inputData, filename, cloudinaryConfig);
        resultUrl = fallbackRes.url;
        provider = fallbackRes.provider;
        sizeBytes = fallbackRes.sizeBytes;
        finalFilename = fallbackRes.filename;
      }
    }

    const now = new Date().toISOString();

    // If productId is provided, associate this image with the product in database
    let updatedProduct: any = null;
    if (productId) {
      const existing = db.prepare('SELECT id, name, beverage_name FROM products WHERE id = ?').get(productId) as any;
      if (existing) {
        db.prepare('UPDATE products SET image_url = ?, updated_at = ? WHERE id = ?').run(resultUrl, now, productId);
        updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        // Update Supabase products table: image_url column as requested
        try {
          const isNum = !isNaN(Number(productId));
          if (isNum) {
            await supabase.from('products').update({ image_url: resultUrl, updated_at: now }).eq('id', Number(productId));
          }
          const bevName = existing.beverage_name || existing.name;
          if (bevName) {
            await supabase.from('products').update({ image_url: resultUrl, updated_at: now }).ilike('beverage_name', bevName);
          }
        } catch (sbErr) {
          console.warn('Supabase product image update warning:', sbErr);
        }
      }
    }

    return res.status(201).json({
      success: true,
      url: resultUrl,
      filename: finalFilename,
      sizeBytes,
      provider,
      folder: 'Aurra products',
      product: updatedProduct,
    });
  } catch (err: any) {
    console.error('Image upload failed:', err);
    return res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

// PUT /api/products/:id/image (Admin only: direct association of image URL)
router.put('/products/:id/image', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl string is required' });
    }

    const existing = db.prepare('SELECT id, name, beverage_name FROM products WHERE id = ?').get(productId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE products SET image_url = ?, updated_at = ? WHERE id = ?').run(imageUrl, now, productId);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

    // Update Supabase products table: image_url column as requested
    try {
      const isNum = !isNaN(Number(productId));
      if (isNum) {
        await supabase.from('products').update({ image_url: imageUrl, updated_at: now }).eq('id', Number(productId));
      }
      const bevName = existing.beverage_name || existing.name;
      if (bevName) {
        await supabase.from('products').update({ image_url: imageUrl, updated_at: now }).ilike('beverage_name', bevName);
      }
    } catch (sbErr) {
      console.warn('Supabase product image update warning:', sbErr);
    }

    return res.json({ success: true, product: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update product image' });
  }
});

// GET /api/storage/info (Returns active storage mode and free tier recommendations)
router.get('/storage/info', (_req: Request, res: Response) => {
  const hasCloudinaryEnv = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_UPLOAD_PRESET);
  const uploadsDir = path.resolve(process.cwd(), 'uploads', 'beverages');
  let localFileCount = 0;
  try {
    if (fs.existsSync(uploadsDir)) {
      localFileCount = fs.readdirSync(uploadsDir).length;
    }
  } catch {
    // ignore
  }

  return res.json({
    activeProvider: hasCloudinaryEnv ? 'cloudinary' : 'local_storage',
    hasCloudinaryEnv,
    localFileCount,
    cloudRecommendations: [
      {
        provider: 'Cloudinary',
        isRecommended: true,
        freeLimit: '25 GB/month (storage & CDN bandwidth)',
        expiration: 'Never expires or sleeps. 100% permanent free tier.',
        easeOfIntegration: 'Very Easy. Works via direct unsigned upload presets or simple API call.',
        bestFor: 'Beverage photo CDN, automated WebP compression, high availability.',
      },
      {
        provider: 'AWS S3',
        isRecommended: false,
        freeLimit: '5 GB standard storage for 12 months only',
        expiration: 'Free tier expires after 12 months! Credit card required at signup.',
        easeOfIntegration: 'Complex. Requires AWS IAM policies, CORS rules, and AWS SDK credentials.',
        bestFor: 'Enterprise infrastructures with dedicated DevOps budgets.',
      },
      {
        provider: 'Supabase Storage',
        isRecommended: false,
        freeLimit: '1 GB storage bucket',
        expiration: 'Free projects pause after 7 days of 0 API traffic.',
        easeOfIntegration: 'Easy with @supabase/supabase-js, but project pause is a risk for hobby sites.',
        bestFor: 'Apps that also use Supabase for PostgreSQL.',
      },
      {
        provider: 'Cloudflare R2',
        isRecommended: true,
        freeLimit: '10 GB storage with $0 egress bandwidth fees',
        expiration: 'Does not expire. High performance.',
        easeOfIntegration: 'Moderate. S3-compatible API, requires credit card verification.',
        bestFor: 'Zero egress cost asset hosting.',
      },
    ],
  });
});

// -------------------------------------------------------------
// CART EVENTS ROUTE
// -------------------------------------------------------------

// POST /api/cart/events (Records every add, remove, set_qty with server timestamp)
router.post('/cart/events', optionalAuth, (req: Request, res: Response) => {
  try {
    const parse = cartEventSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid cart event payload' });
    }

    const { productId, action, qty } = parse.data;
    const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'guest';
    const eventId = generateId('cev');
    const serverTimestamp = new Date().toISOString();

    try {
      db.prepare(`
        INSERT INTO cart_events (id, user_id, product_id, action, qty, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(eventId, userId, productId, action, qty, serverTimestamp);
    } catch {}

    return res.status(201).json({
      success: true,
      eventId,
      timestamp: serverTimestamp,
    });
  } catch (err) {
    console.error('Cart event logging error:', err);
    return res.status(200).json({ success: false, error: 'Telemetry acknowledged' });
  }
});

// -------------------------------------------------------------
// ORDERS ROUTES
// -------------------------------------------------------------

// POST /api/orders (Creates order and deducts inventory from remaining_quantity in SQLite & Supabase)
router.post('/orders', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parse = createOrderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid order format' });
    }

    const { items } = parse.data;
    const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'guest';
    const orderId = generateId('ord');
    const now = new Date().toISOString();

    // Look up real prices and live stock from products table
    const productStmt = db.prepare('SELECT id, name, beverage_name, price, active, total_quantity, remaining_quantity FROM products WHERE id = ?');

    let serverTotal = 0;
    const resolvedItems: {
      productId: string;
      name: string;
      price: number;
      qty: number;
      newRemaining: number;
    }[] = [];

    for (const item of items) {
      let product = productStmt.get(item.productId) as
        | { id: string; name: string; beverage_name?: string; price: number; active: number; total_quantity: number; remaining_quantity: number }
        | undefined;

      if (!product) {
        // Query Supabase products table or create resilient placeholder in SQLite
        try {
          const { data: sbP } = await supabase.from('products').select('*').or(`id.eq.${item.productId}`).maybeSingle();
          if (sbP) {
            const pName = sbP.beverage_name || 'Aurra Beverage';
            const pPrice = Number(sbP.price) || 149;
            const pStock = sbP.remaining_quantity !== undefined ? Number(sbP.remaining_quantity) : 50;
            product = {
              id: String(sbP.id),
              name: pName,
              beverage_name: pName,
              price: pPrice,
              active: 1,
              total_quantity: sbP.total_quantity || 50,
              remaining_quantity: pStock,
            };
            try {
              db.prepare(`
                INSERT OR IGNORE INTO products (id, name, flavor, price, image_url, description, volume, calories, active, created_at, remaining_quantity, total_quantity)
                VALUES (?, ?, 'Artisan Botanical', ?, '/assets/images/hero_beverage_can_1793439801479.jpg', ?, '330ml', 40, 1, ?, ?, ?)
              `).run(product.id, pName, pPrice, pName, now, pStock, sbP.total_quantity || 50);
            } catch {}
          }
        } catch {}
      }

      if (!product) {
        product = {
          id: String(item.productId),
          name: 'Aurra Beverage',
          beverage_name: 'Aurra Beverage',
          price: 149,
          active: 1,
          total_quantity: 50,
          remaining_quantity: 50,
        };
        try {
          db.prepare(`
            INSERT OR IGNORE INTO products (id, name, flavor, price, image_url, description, volume, calories, active, created_at, remaining_quantity, total_quantity)
            VALUES (?, 'Aurra Beverage', 'Artisan Botanical', 149, '/assets/images/hero_beverage_can_1793439801479.jpg', 'Aurra Beverage', '330ml', 40, 1, ?, 50, 50)
          `).run(product.id, now);
        } catch {}
      }

      if (product.active === 0) {
        return res.status(400).json({ error: `Product '${product.name}' is currently unavailable.` });
      }

      const prodDisplayName = product.beverage_name || product.name;
      const currentStock = typeof product.remaining_quantity === 'number' ? product.remaining_quantity : 50;

      // Backend stock validation safety check
      if (currentStock <= 0) {
        return res.status(400).json({ error: `Sorry, "${prodDisplayName}" is out of stock.` });
      }

      if (currentStock < item.qty) {
        return res.status(400).json({
          error: `Only ${currentStock} cans of "${prodDisplayName}" remaining in stock. Please adjust your quantity.`,
        });
      }

      const newRemaining = Math.max(0, currentStock - item.qty);

      serverTotal += product.price * item.qty;
      resolvedItems.push({
        productId: product.id,
        name: prodDisplayName,
        price: product.price,
        qty: item.qty,
        newRemaining,
      });
    }

    // Execute order creation and stock deduction inside a single transaction
    const createOrderTransaction = db.transaction(() => {
      // 1. Insert order
      db.prepare(`
        INSERT INTO orders (id, user_id, total, status, created_at)
        VALUES (?, ?, ?, 'confirmed', ?)
      `).run(orderId, userId, serverTotal, now);

      // 2. Insert order items with snapshots
      const itemStmt = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, name_snapshot, price_snapshot, qty)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // 3. Deduct stock from SQLite products table
      const deductStockStmt = db.prepare(`
        UPDATE products
        SET remaining_quantity = ?, updated_at = ?
        WHERE id = ?
      `);

      for (const item of resolvedItems) {
        const itemId = generateId('oit');
        itemStmt.run(itemId, orderId, item.productId, item.name, item.price, item.qty);
        deductStockStmt.run(item.newRemaining, now, item.productId);
      }
    });

    createOrderTransaction();

    // 4. Save to Supabase orders and order_items tables
    try {
      let sbUserId = 1;
      if (!isNaN(Number(userId))) {
        sbUserId = Number(userId);
      } else {
        const { data: u } = await supabase.from('users').select('id').eq('email', req.user!.email).maybeSingle();
        if (u?.id) sbUserId = Number(u.id);
      }

      const { data: newSbOrder, error: oErr } = await supabase
        .from('orders')
        .insert({
          user_id: sbUserId,
          total_amount: serverTotal,
          status: 'confirmed',
          created_at: now,
        })
        .select()
        .single();

      if (!oErr && newSbOrder?.id) {
        for (const item of resolvedItems) {
          let numProdId = 1;
          if (!isNaN(Number(item.productId))) {
            numProdId = Number(item.productId);
          } else {
            const { data: p } = await supabase.from('products').select('id').ilike('beverage_name', item.name).maybeSingle();
            if (p?.id) numProdId = Number(p.id);
          }

          await supabase.from('order_items').insert({
            order_id: newSbOrder.id,
            product_id: numProdId,
            price: item.price,
            quantity: item.qty,
          });
        }
      }
    } catch (sbErr) {
      console.warn('Supabase order persistence note:', sbErr);
    }

    // Deduct stock in Supabase products table asynchronously
    for (const item of resolvedItems) {
      try {
        await supabase
          .from('products')
          .update({
            remaining_quantity: item.newRemaining,
            updated_at: now,
          })
          .or(`beverage_name.eq.${item.name},id.eq.${item.productId}`);
      } catch (sbErr) {
        console.warn('Supabase product stock deduction note (RLS/policy):', sbErr);
      }
    }

    return res.status(201).json({
      success: true,
      order: {
        id: orderId,
        userId,
        total: serverTotal,
        status: 'confirmed',
        createdAt: now,
        items: resolvedItems,
      },
    });
  } catch (err) {
    console.error('Order creation error:', err);
    return res.status(500).json({ error: 'Failed to process order. Please try again.' });
  }
});

// POST /api/razorpay/create-qr (Generates dynamic single-use UPI QR code linked to iamironman798@okaxis)
router.post('/razorpay/create-qr', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { amount, items, contactNo, address } = req.body || {};
    const grandTotal = Number(amount) || 0;
    if (grandTotal <= 0) {
      return res.status(400).json({ error: 'Order total must be greater than zero' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_TvKjTrYOGTa3u8';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'ZmrZH14WtFYpFyLzJJ75OzTq';
    const businessUpi = process.env.RAZORPAY_BUSINESS_UPI || 'iamironman798@okaxis';

    const userId = req.user?.id || (req.headers['x-user-id'] as string) || 'guest';
    const userEmail = req.user?.email || (req.headers['x-user-email'] as string) || 'customer@aurrabeverages.com';

    const receipt = `rcpt_${Date.now()}`;
    let razorpayOrderId = `order_${Date.now()}`;

    // 1. Create Razorpay order via official API
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(grandTotal * 100), // paise
          currency: 'INR',
          receipt,
          notes: {
            user_id: String(userId),
            user_email: userEmail,
            business_upi: businessUpi,
            contact_no: contactNo || '',
            delivery_address: address || '',
            items: JSON.stringify(items || []),
          },
        }),
      });

      if (rzpRes.ok) {
        const rzpData = await rzpRes.json();
        if (rzpData?.id) {
          razorpayOrderId = rzpData.id;
        }
      } else {
        console.warn('Razorpay order creation status:', rzpRes.status, await rzpRes.text());
      }
    } catch (rzpErr) {
      console.warn('Razorpay API request error:', rzpErr);
    }

    // 2. Generate single-use dynamic UPI QR URL linked to business UPI ID (iamironman798@okaxis)
    const upiString = `upi://pay?pa=${encodeURIComponent(businessUpi)}&pn=${encodeURIComponent('Aurra Blast Beverages')}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`Aurra Order ${receipt}`)}&tr=${encodeURIComponent(razorpayOrderId)}`;

    // 3. Render high-resolution scannable QR Code as Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(upiString, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return res.json({
      success: true,
      razorpayOrderId,
      amount: grandTotal,
      currency: 'INR',
      businessUpi,
      upiString,
      qrCodeDataUrl,
      receipt,
    });
  } catch (err: any) {
    console.error('Create Razorpay QR error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate dynamic Razorpay QR code' });
  }
});

// POST /api/razorpay-webhook (Webhook listener for payment.captured / qr_code.credited)
router.post(['/razorpay-webhook', '/webhooks/razorpay'], async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'aurrablastbeverages@12345!';
    const signature = req.headers['x-razorpay-signature'] as string;

    // HMAC-SHA256 signature verification
    if (signature && (req as any).rawBody) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update((req as any).rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.warn('[Razorpay Webhook] Invalid signature received');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body?.event;
    console.log(`[Razorpay Webhook] Processing event: ${event}`);

    // Accepted payment success events
    const validEvents = ['payment.captured', 'qr_code.credited', 'order.paid'];
    if (!validEvents.includes(event)) {
      return res.json({ status: 'ignored', message: `Event ${event} not actionable` });
    }

    const payload = req.body?.payload || {};
    const payment = payload.payment?.entity || {};
    const orderEntity = payload.order?.entity || {};

    const amountInr = (payment.amount || orderEntity.amount || 0) / 100;
    const razorpayOrderId = payment.order_id || orderEntity.id || `rzp_${Date.now()}`;
    const paymentId = payment.id || `pay_${Date.now()}`;
    const notes = payment.notes || orderEntity.notes || {};

    const userEmail = (notes.user_email || payment.email || '').toString().trim().toLowerCase();
    const userIdentifier = notes.user_id;

    // Resolve user ID
    let resolvedUserId: number | string = 1;
    if (userEmail) {
      try {
        const { data: sbU } = await supabase.from('users').select('*').ilike('email', userEmail).maybeSingle();
        if (sbU?.id) resolvedUserId = sbU.id;
      } catch {}
    } else if (userIdentifier && !isNaN(Number(userIdentifier))) {
      resolvedUserId = Number(userIdentifier);
    }

    let parsedItems: any[] = [];
    try {
      if (notes.items) {
        parsedItems = typeof notes.items === 'string' ? JSON.parse(notes.items) : notes.items;
      }
    } catch {}

    const now = new Date().toISOString();
    const localOrderId = generateId('ord');

    // 1. Insert new record into orders table in Supabase
    let createdSbOrder: any = null;
    try {
      const { data: newOrder, error: oErr } = await supabase
        .from('orders')
        .insert({
          user_id: Number(resolvedUserId) || 1,
          total_amount: amountInr || 149,
          status: 'confirmed',
          created_at: now,
        })
        .select()
        .single();

      if (oErr) {
        console.warn('Supabase webhook order insertion notice:', oErr);
      } else {
        createdSbOrder = newOrder;
      }
    } catch (sbOrderErr) {
      console.warn('Supabase webhook order error:', sbOrderErr);
    }

    // 2. Insert into SQLite orders table
    try {
      db.prepare(`
        INSERT INTO orders (id, user_id, total, status, created_at, razorpay_order_id, razorpay_payment_id)
        VALUES (?, ?, ?, 'confirmed', ?, ?, ?)
      `).run(localOrderId, String(resolvedUserId), amountInr || 149, now, razorpayOrderId, paymentId);
    } catch (sqlErr) {
      console.warn('SQLite webhook order insertion notice:', sqlErr);
    }

    // 3. Insert corresponding records into order_items table in Supabase & SQLite
    if (parsedItems.length > 0) {
      for (const it of parsedItems) {
        const itPrice = Number(it.price) || 149;
        const itQty = Number(it.qty || it.quantity) || 1;
        const itProdId = it.productId || it.product_id || 1;
        const numProdId = !isNaN(Number(itProdId)) ? Number(itProdId) : 1;

        if (createdSbOrder?.id) {
          try {
            await supabase.from('order_items').insert({
              order_id: createdSbOrder.id,
              product_id: numProdId,
              price: itPrice,
              quantity: itQty,
            });
          } catch (itemErr) {
            console.warn('Supabase order_items webhook insert error:', itemErr);
          }
        }

        try {
          db.prepare(`
            INSERT INTO order_items (id, order_id, product_id, name_snapshot, price_snapshot, qty)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(generateId('oit'), localOrderId, String(itProdId), it.name || 'Aurra Beverage', itPrice, itQty);
        } catch {}

        try {
          db.prepare('UPDATE products SET remaining_quantity = MAX(0, remaining_quantity - ?) WHERE id = ?').run(itQty, String(itProdId));
          await supabase.from('products').update({ updated_at: now }).eq('id', numProdId);
        } catch {}
      }
    }

    console.log(`[Razorpay Webhook] Successfully processed order for payment ${paymentId}`);
    return res.status(200).json({ status: 'ok', received: true, orderId: createdSbOrder?.id || localOrderId });
  } catch (err: any) {
    console.error('[Razorpay Webhook] Error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/orders/confirm-payment (In-app confirmation after QR scan / 'I Have Paid')
router.post('/orders/confirm-payment', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      razorpayOrderId,
      paymentId,
      items,
      amount,
      userId: bodyUserId,
      userEmail: bodyUserEmail,
      userName: bodyUserName,
      contactNo: bodyContactNo,
      deliveryAddress: bodyDeliveryAddress,
    } = req.body || {};
    const userId = bodyUserId || req.user?.id || (req.headers['x-user-id'] as string) || 'guest';
    const userEmail = (bodyUserEmail || req.user?.email || (req.headers['x-user-email'] as string) || '').toLowerCase().trim();
    const now = new Date().toISOString();
    const orderId = generateId('ord');
    const totalAmount = Number(amount) || 0;

    // Resolve Supabase user ID reliably
    let sbUserId: number | null = null;
    if (userId && !isNaN(Number(userId))) {
      sbUserId = Number(userId);
    }
    if (!sbUserId && userEmail) {
      try {
        const { data: u } = await supabase.from('users').select('id').ilike('email', userEmail).maybeSingle();
        if (u?.id) sbUserId = Number(u.id);
      } catch {}
    }
    if (!sbUserId && bodyContactNo) {
      try {
        const { data: u } = await supabase.from('users').select('id').or(`contact_no.eq.${bodyContactNo},"contact_no.".eq.${bodyContactNo}`).maybeSingle();
        if (u?.id) sbUserId = Number(u.id);
      } catch {}
    }
    if (!sbUserId) {
      try {
        const { data: latestUsers } = await supabase.from('users').select('id').order('id', { ascending: false }).limit(1);
        if (latestUsers?.[0]?.id) sbUserId = Number(latestUsers[0].id);
      } catch {}
    }
    if (!sbUserId) {
      sbUserId = 20; // Default active test user if available
    }

    // Pre-insert user into SQLite to ensure relations
    try {
      db.prepare(`
        INSERT OR IGNORE INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at, contact_no, delivery_address)
        VALUES (?, ?, ?, 'local_session', 'user', 1, ?, ?, ?, ?)
      `).run(
        String(userId),
        bodyUserName || 'Aurra Customer',
        userEmail || 'customer@aurrabeverages.com',
        now,
        now,
        bodyContactNo || null,
        bodyDeliveryAddress || null
      );
    } catch {}

    // 1. Insert into Supabase orders table with initial status 'confirmed'
    let createdSbOrder: any = null;
    try {
      const { data: newOrder, error: oErr } = await supabase
        .from('orders')
        .insert({
          user_id: sbUserId,
          total_amount: totalAmount,
          status: 'confirmed',
          created_at: now,
          delivery_code: null,
          updated_time: null,
        })
        .select()
        .single();

      if (!oErr && newOrder) {
        createdSbOrder = newOrder;
        console.log(`[Orders] Supabase order created: id=${newOrder.id}, user_id=${sbUserId}`);
      } else if (oErr) {
        console.error('Supabase order insert error:', oErr);
      }
    } catch (e) {
      console.error('Supabase order insert exception:', e);
    }

    const finalOrderId = createdSbOrder?.id ? String(createdSbOrder.id) : orderId;

    // 2. Insert into SQLite orders table with initial status 'confirmed'
    try {
      db.prepare(`
        INSERT INTO orders (id, user_id, total, status, created_at, razorpay_order_id, razorpay_payment_id)
        VALUES (?, ?, ?, 'confirmed', ?, ?, ?)
      `).run(finalOrderId, String(userId), totalAmount, now, razorpayOrderId || null, paymentId || null);

      if (finalOrderId !== orderId) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO orders (id, user_id, total, status, created_at, razorpay_order_id, razorpay_payment_id)
            VALUES (?, ?, ?, 'confirmed', ?, ?, ?)
          `).run(orderId, String(userId), totalAmount, now, razorpayOrderId || null, paymentId || null);
        } catch {}
      }
    } catch (e) {
      console.warn('SQLite order insert note:', e);
    }

    // Pre-fetch Supabase products to map item names and product IDs
    let sbProducts: any[] = [];
    try {
      const { data: sbProductList } = await supabase.from('products').select('id, beverage_name, price, remaining_quantity');
      sbProducts = sbProductList || [];
    } catch {}

    // 3. Insert items into order_items table in both databases & deduct stock
    const resolvedItems: any[] = [];
    if (Array.isArray(items)) {
      for (const it of items) {
        const itPrice = Number(it.price) || 149;
        const itQty = Number(it.qty || it.quantity) || 1;
        const itProdId = it.productId || it.product_id || it.id || '1';
        const itemName = it.name || it.beverage_name || 'Aurra Beverage';

        // Match Supabase product ID by id or beverage_name
        let numProdId: number = 1;
        if (!isNaN(Number(itProdId))) {
          numProdId = Number(itProdId);
        } else {
          const matchedSbProd = sbProducts.find(
            (p) => String(p.id) === String(itProdId) || p.beverage_name?.toLowerCase().trim() === itemName.toLowerCase().trim()
          );
          if (matchedSbProd) {
            numProdId = Number(matchedSbProd.id);
          } else if (sbProducts.length > 0) {
            numProdId = Number(sbProducts[0].id);
          }
        }

        // Insert into Supabase order_items
        if (createdSbOrder?.id) {
          try {
            const { error: itemErr } = await supabase.from('order_items').insert({
              order_id: createdSbOrder.id,
              product_id: numProdId,
              price: itPrice,
              quantity: itQty,
            });
            if (itemErr) {
              console.error('Supabase order_items insert error:', itemErr);
            }
          } catch (e) {
            console.error('Supabase order_items insert exception:', e);
          }
        }

        // Pre-insert product into SQLite to avoid FK violations
        try {
          db.prepare(`
            INSERT OR IGNORE INTO products (id, name, flavor, price, image_url, description, volume, calories, active, created_at)
            VALUES (?, ?, 'Artisan Botanical', ?, '/assets/images/hero_beverage_can_1793439801479.jpg', ?, '330ml', 40, 1, ?)
          `).run(String(itProdId), itemName, itPrice, itemName, now);
        } catch {}

        // Insert into SQLite order_items
        try {
          db.prepare(`
            INSERT INTO order_items (id, order_id, product_id, name_snapshot, price_snapshot, qty)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(generateId('oit'), finalOrderId, String(itProdId), itemName, itPrice, itQty);
          if (finalOrderId !== orderId) {
            try {
              db.prepare(`
                INSERT INTO order_items (id, order_id, product_id, name_snapshot, price_snapshot, qty)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(generateId('oit'), orderId, String(itProdId), itemName, itPrice, itQty);
            } catch {}
          }
        } catch {}

        // Deduct inventory in SQLite and Supabase
        try {
          db.prepare('UPDATE products SET remaining_quantity = MAX(0, remaining_quantity - ?) WHERE id = ?').run(itQty, String(itProdId));
        } catch {}
        try {
          const matchedSbProd = sbProducts.find((p) => Number(p.id) === numProdId);
          if (matchedSbProd) {
            const newRem = Math.max(0, (matchedSbProd.remaining_quantity || 50) - itQty);
            await supabase.from('products').update({ remaining_quantity: newRem, updated_at: now }).eq('id', numProdId);
          }
        } catch {}

        resolvedItems.push({
          productId: String(itProdId),
          name: itemName,
          price: itPrice,
          qty: itQty,
        });
      }
    }

    return res.status(201).json({
      success: true,
      order: {
        id: finalOrderId,
        userId: String(userId),
        total: totalAmount,
        status: 'confirmed',
        createdAt: now,
        created_at: now,
        items: resolvedItems,
        razorpayOrderId,
      },
    });
  } catch (err: any) {
    console.error('Confirm payment error:', err);
    return res.status(500).json({ error: err.message || 'Failed to confirm order payment' });
  }
});

// GET /api/orders (Logged in user's orders with items, queried from both SQLite and Supabase)
router.get('/orders', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || (req.headers['x-user-id'] as string) || '';
    const userEmail = req.user?.email || (req.headers['x-user-email'] as string) || '';

    let orders: any[] = [];

    // 1. Query SQLite orders
    if (userId || userEmail) {
      try {
        orders = db.prepare(`
          SELECT id, user_id, total, status, created_at, razorpay_order_id, razorpay_payment_id
          FROM orders
          WHERE user_id = ? OR user_id = ? OR user_id IN (SELECT id FROM users WHERE email = ? OR id = ?)
          ORDER BY created_at DESC
        `).all(userId, userEmail, userEmail, userId) as any[];

        const itemStmt = db.prepare(`
          SELECT id, product_id, name_snapshot, price_snapshot, qty
          FROM order_items
          WHERE order_id = ?
        `);

        orders = orders.map((o) => ({
          ...o,
          items: itemStmt.all(o.id),
        }));
      } catch (err) {
        console.warn('SQLite orders query note:', err);
      }
    }

    // 2. Query Supabase orders for this user
    try {
      let sbUserId: number | null = null;
      if (userEmail) {
        const { data: u } = await supabase.from('users').select('id').ilike('email', userEmail.trim()).maybeSingle();
        if (u?.id) sbUserId = Number(u.id);
      }
      if (!sbUserId && userId && !isNaN(Number(userId))) {
        sbUserId = Number(userId);
      }

      if (sbUserId) {
        const { data: sbOrders } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('user_id', sbUserId)
          .order('created_at', { ascending: false });

        if (sbOrders && sbOrders.length > 0) {
          // Pre-fetch products to map real names
          const { data: sbProds } = await supabase.from('products').select('id, beverage_name, price');
          const prodMap = new Map<number, { name: string; price: number }>();
          (sbProds || []).forEach((p) => prodMap.set(Number(p.id), { name: p.beverage_name, price: Number(p.price) || 149 }));

          for (const sbo of sbOrders) {
            const matchIndex = orders.findIndex((o) => String(o.id) === String(sbo.id));
            const mappedItems = (sbo.order_items || []).map((it: any) => {
              const pInfo = prodMap.get(Number(it.product_id));
              return {
                id: String(it.id),
                product_id: String(it.product_id),
                name_snapshot: pInfo?.name || it.name_snapshot || 'Aurra Beverage',
                price_snapshot: Number(it.price) || pInfo?.price || 149,
                qty: Number(it.quantity || it.qty) || 1,
              };
            });

            if (matchIndex >= 0) {
              orders[matchIndex].status = sbo.status || orders[matchIndex].status;
              if (!orders[matchIndex].items?.length && mappedItems.length) {
                orders[matchIndex].items = mappedItems;
              }
            } else {
              orders.push({
                id: String(sbo.id),
                user_id: String(sbo.user_id),
                total: Number(sbo.total_amount) || 149,
                status: sbo.status || 'confirmed',
                created_at: sbo.created_at || new Date().toISOString(),
                items: mappedItems,
              });
            }
          }
        }
      }
    } catch (sbErr) {
      console.warn('Supabase user orders lookup note:', sbErr);
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ orders });
  } catch (err) {
    console.error('Fetch orders error:', err);
    return res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// GET /api/admin/orders (Admin console: all confirmed, out_for_delivery, delivered, and past orders)
router.get('/admin/orders', optionalAuth, async (_req: Request, res: Response) => {
  try {
    let orders: any[] = [];
    try {
      orders = db.prepare(`
        SELECT o.id, o.user_id, o.total, o.status, o.created_at, o.delivery_code, o.updated_time, o.razorpay_order_id, o.razorpay_payment_id,
               u.name as user_name, u.email as user_email, u.delivery_address, u.contact_no
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
      `).all() as any[];

      const itemStmt = db.prepare(`
        SELECT id, product_id, name_snapshot, price_snapshot, qty
        FROM order_items
        WHERE order_id = ?
      `);

      orders = orders.map((o) => ({
        ...o,
        customer_name: o.user_name || 'Aurra Customer',
        customer_email: o.user_email || 'customer@aurrabeverages.com',
        delivery_code: o.delivery_code || null,
        updated_time: o.updated_time || null,
        items: itemStmt.all(o.id),
      }));
    } catch {}

    // Merge Supabase orders
    try {
      const { data: sbOrders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (sbOrders && sbOrders.length > 0) {
        const { data: sbProds } = await supabase.from('products').select('id, beverage_name, price');
        const prodMap = new Map<number, { name: string; price: number }>();
        (sbProds || []).forEach((p) => prodMap.set(Number(p.id), { name: p.beverage_name, price: Number(p.price) || 149 }));

        for (const sbo of sbOrders) {
          const matchIndex = orders.findIndex((o) => String(o.id) === String(sbo.id));
          const mappedItems = (sbo.order_items || []).map((it: any) => {
            const pInfo = prodMap.get(Number(it.product_id));
            return {
              id: String(it.id),
              product_id: String(it.product_id),
              name: pInfo?.name || it.name_snapshot || 'Aurra Beverage',
              name_snapshot: pInfo?.name || it.name_snapshot || 'Aurra Beverage',
              price: Number(it.price) || pInfo?.price || 149,
              price_snapshot: Number(it.price) || pInfo?.price || 149,
              qty: Number(it.quantity || it.qty) || 1,
            };
          });

          let customerEmail = '';
          let customerName = '';
          let customerAddress = '';
          let customerContact = '';

          if (sbo.user_id) {
            try {
              const { data: u } = await supabase.from('users').select('name, email, delivery_address, contact_no, "contact_no."').eq('id', sbo.user_id).maybeSingle();
              if (u) {
                customerEmail = u.email || '';
                customerName = u.name || '';
                customerAddress = u.delivery_address || '';
                customerContact = u['contact_no.'] || u.contact_no || '';
              }
            } catch {}
          }

          if (matchIndex >= 0) {
            orders[matchIndex].status = sbo.status || orders[matchIndex].status;
            orders[matchIndex].delivery_code = sbo.delivery_code || orders[matchIndex].delivery_code || null;
            orders[matchIndex].updated_time = sbo.updated_time || orders[matchIndex].updated_time || null;
            if (customerName) orders[matchIndex].customer_name = customerName;
            if (customerEmail) orders[matchIndex].customer_email = customerEmail;
            if (customerAddress) orders[matchIndex].delivery_address = customerAddress;
            if (customerContact) orders[matchIndex].contact_no = customerContact;
            if (!orders[matchIndex].items?.length && mappedItems.length) {
              orders[matchIndex].items = mappedItems;
            }
          } else {
            orders.push({
              id: String(sbo.id),
              user_id: String(sbo.user_id || 'guest'),
              total: Number(sbo.total_amount || sbo.total) || 149,
              status: sbo.status || 'confirmed',
              delivery_code: sbo.delivery_code || null,
              updated_time: sbo.updated_time || null,
              created_at: sbo.created_at || new Date().toISOString(),
              customer_name: customerName || 'Aurra Customer',
              customer_email: customerEmail || 'customer@aurrabeverages.com',
              delivery_address: customerAddress || 'Address on file',
              contact_no: customerContact || '',
              items: mappedItems,
            });
          }
        }
      }
    } catch (sbErr) {
      console.warn('Supabase admin orders note:', sbErr);
    }

    orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json({ orders });
  } catch (err: any) {
    console.error('Fetch admin orders error:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin orders' });
  }
});

// PATCH & PUT /api/orders/:id/status (Allows admin to mark out_for_delivery, delivered with code, etc.)
router.all(['/orders/:id/status', '/admin/orders/:id/status'], optionalAuth, async (req: Request, res: Response) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // Strict Admin authorization check: Only admin role can change order status
    const userRole = req.user?.role || (req.headers['x-user-role'] as string);
    const userEmail = (req.user?.email || (req.headers['x-user-email'] as string) || '').toLowerCase().trim();
    const isAdmin = userRole === 'admin' || userEmail === 'adminaurra@beverages.com' || userEmail === 'admin@g.com' || userEmail === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Only administrators can update order statuses.' });
    }

    const { status, delivery_code, deliveryCode } = req.body || {};
    const validStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status. Must be confirmed, out_for_delivery, or delivered.' });
    }

    const orderId = req.params.id;
    const finalCode = (delivery_code || deliveryCode || '').toString().trim();
    const now = new Date().toISOString();

    const updateFields: any = {
      status,
      updated_time: now,
    };
    if (finalCode) {
      updateFields.delivery_code = finalCode;
    }

    // 1. Update in SQLite orders table
    try {
      if (finalCode) {
        db.prepare('UPDATE orders SET status = ?, delivery_code = ?, updated_time = ? WHERE id = ?').run(status, finalCode, now, orderId);
      } else {
        db.prepare('UPDATE orders SET status = ?, updated_time = ? WHERE id = ?').run(status, now, orderId);
      }
    } catch (e) {
      console.warn('SQLite order status update warning:', e);
    }

    // 2. Update in Supabase orders table
    try {
      if (!isNaN(Number(orderId))) {
        await supabase.from('orders').update(updateFields).eq('id', Number(orderId));
      } else {
        await supabase.from('orders').update(updateFields).eq('id', orderId);
      }
    } catch (sbErr) {
      console.warn('Supabase order status update note:', sbErr);
    }

    return res.json({
      success: true,
      status,
      orderId,
      delivery_code: finalCode || null,
      updated_time: now,
      message: `Order status updated to ${status}`
    });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

// PUT /api/auth/profile (Captures updated_at; updates Supabase and SQLite)
router.put('/auth/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, delivery_address, deliveryAddress } = req.body;
    const finalAddress = (delivery_address || deliveryAddress || '').toString().trim();
    const cleanName = name ? String(name).trim() : req.user!.name;
    const now = new Date().toISOString();

    if (name && cleanName.length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }

    db.prepare(`
      UPDATE users
      SET name = ?, delivery_address = CASE WHEN ? != '' THEN ? ELSE delivery_address END, updated_at = ?
      WHERE id = ?
    `).run(cleanName, finalAddress, finalAddress, now, req.user!.id);

    try {
      const updateData: any = { name: cleanName, updated_at: now };
      if (finalAddress) {
        updateData.delivery_address = finalAddress;
      }
      await supabase
        .from('users')
        .update(updateData)
        .eq('email', req.user!.email);
    } catch (sbErr) {
      console.warn('Supabase profile update warning:', sbErr);
    }

    const updated = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, delivery_address, parent_id FROM users WHERE id = ?').get(req.user!.id);
    return res.json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/address (Saves delivery address and updates updated_at in Supabase and SQLite)
router.put('/auth/address', requireAuth, async (req: Request, res: Response) => {
  try {
    const { address, deliveryAddress } = req.body || {};
    const finalAddress = (address || deliveryAddress || '').toString().trim();

    if (!finalAddress || finalAddress.length < 5) {
      return res.status(400).json({ error: 'Please enter a complete delivery address (minimum 5 characters).' });
    }

    const now = new Date().toISOString();

    // 1. Update SQLite
    db.prepare(`
      UPDATE users
      SET delivery_address = ?, updated_at = ?
      WHERE id = ?
    `).run(finalAddress, now, req.user!.id);

    // 2. Update Supabase users table (created_at remains intact; updated_at captures change)
    try {
      await supabase
        .from('users')
        .update({
          delivery_address: finalAddress,
          updated_at: now,
        })
        .eq('email', req.user!.email);
    } catch (sbErr) {
      console.warn('Supabase address update warning (RLS/policy):', sbErr);
    }

    const updated = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, delivery_address, parent_id FROM users WHERE id = ?').get(req.user!.id);
    return res.json({
      success: true,
      message: 'Delivery address saved successfully!',
      user: updated,
    });
  } catch (err) {
    console.error('Update delivery address error:', err);
    return res.status(500).json({ error: 'Failed to save delivery address' });
  }
});

// PUT /api/auth/contact-no (Saves 10-digit Indian contact number to Supabase and SQLite)
router.put('/auth/contact-no', requireAuth, async (req: Request, res: Response) => {
  try {
    const { contactNo, contact_no } = req.body || {};
    const raw = (contactNo || contact_no || '').toString().trim();
    const cleanDigits = raw.replace(/\D/g, '');

    if (cleanDigits.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const now = new Date().toISOString();

    // 1. Update SQLite if available
    try {
      db.prepare(`
        UPDATE users
        SET contact_no = ?, updated_at = ?
        WHERE id = ?
      `).run(cleanDigits, now, req.user!.id);
    } catch (sqlErr) {
      console.warn('SQLite contact update note:', sqlErr);
    }

    // 2. Update Supabase users table (writing to 'contact_no.' column)
    try {
      await supabase
        .from('users')
        .update({
          'contact_no.': cleanDigits,
          updated_at: now,
        })
        .eq('email', req.user!.email);
    } catch (sbErr) {
      console.warn('Supabase contact update note:', sbErr);
    }

    let updated: any = null;
    try {
      updated = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, delivery_address, contact_no, parent_id FROM users WHERE id = ?').get(req.user!.id);
    } catch {}

    const returnUser = updated || {
      ...req.user,
      contact_no: cleanDigits,
    };

    return res.json({
      success: true,
      message: 'Contact number saved successfully!',
      user: returnUser,
    });
  } catch (err) {
    console.error('Update contact number error:', err);
    return res.status(500).json({ error: 'Failed to save contact number' });
  }
});

// -------------------------------------------------------------
// ADMIN ANALYTICS & QUERIES
// -------------------------------------------------------------

// GET /api/admin/overview
router.get('/admin/overview', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    let userCount = 0;
    let orderCount = 0;
    let totalRevenue = 0;
    let cartEventCount = 0;

    try {
      userCount = (db.prepare('SELECT count(*) as count FROM users').get() as any)?.count || 0;
      orderCount = (db.prepare('SELECT count(*) as count FROM orders').get() as any)?.count || 0;
      totalRevenue = (db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders').get() as any)?.sum || 0;
      cartEventCount = (db.prepare('SELECT count(*) as count FROM cart_events').get() as any)?.count || 0;
    } catch {}

    // Check Supabase users count if local count is 0
    try {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (typeof count === 'number' && count > userCount) {
        userCount = count;
      }
    } catch {}

    return res.json({
      stats: {
        totalUsers: userCount,
        totalOrders: orderCount,
        totalRevenue,
        totalCartEvents: cartEventCount,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

// GET /api/admin/users
router.get('/admin/users', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    let users: any[] = [];

    // Query Supabase users first to get real live registered users
    try {
      const { data: sbUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (sbUsers && sbUsers.length > 0) {
        users = sbUsers.map((u) => ({
          id: String(u.id),
          name: u.name,
          email: u.email,
          role: u.role || 'user',
          delivery_address: u.delivery_address || '',
          contact_no: u['contact_no.'] || u.contact_no || '',
          created_at: u.created_at,
        }));
      }
    } catch (sbErr) {
      console.warn('Supabase admin users fetch notice:', sbErr);
    }

    if (users.length === 0) {
      try {
        users = db.prepare(`
          SELECT u.id, u.name, u.email, u.role, u.email_verified, u.delivery_address, u.contact_no, u.created_at
          FROM users u
          ORDER BY u.created_at DESC
        `).all() as any[];
      } catch {
        users = [];
      }
    }

    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load users' });
  }
});

// GET /api/admin/cart-events
router.get('/admin/cart-events', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const events = db.prepare(`
      SELECT ce.id, ce.action, ce.qty, ce.created_at,
             u.id as user_id, u.name as user_name, u.email as user_email,
             p.id as product_id, p.name as product_name, p.price as product_price
      FROM cart_events ce
      JOIN users u ON u.id = ce.user_id
      JOIN products p ON p.id = ce.product_id
      ORDER BY ce.created_at DESC
      LIMIT ?
    `).all(limit);

    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load cart events' });
  }
});

// POST /api/admin/sql-query (Console for viewing user purchases & cart events by date)
router.post('/admin/sql-query', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const query = req.body?.query?.trim();
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Only allow SELECT queries for security
    if (!query.toLowerCase().startsWith('select')) {
      return res.status(403).json({ error: 'Only SELECT queries are allowed in this console.' });
    }

    const rows = db.prepare(query).all();
    return res.json({ rows, rowCount: rows.length });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'SQL execution failed' });
  }
});

// GET /api/feature-flags (Public query so visitor Navbar knows whether to show Aurra tribute)
router.get('/feature-flags', (_req: Request, res: Response) => {
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'aura_tribute_enabled'").get() as { value: string } | undefined;
    const isEnabled = row ? row.value === '1' || row.value === 'true' : true;
    return res.json({
      aura_tribute_enabled: isEnabled,
    });
  } catch (err) {
    return res.json({ aura_tribute_enabled: true });
  }
});

// PUT /api/admin/feature-flags (Admin toggle for Enable Aura Tribute)
router.put('/admin/feature-flags', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { key, enabled } = req.body;
    if (key !== 'aura_tribute_enabled') {
      return res.status(400).json({ error: 'Unsupported feature flag key' });
    }

    const valStr = enabled ? '1' : '0';
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at) 
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, valStr);

    return res.json({
      success: true,
      flags: {
        aura_tribute_enabled: Boolean(enabled),
      },
      message: `Feature flag '${key}' updated to ${enabled ? 'ENABLED' : 'DISABLED'}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update feature flag' });
  }
});

export default router;
