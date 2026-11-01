import { Router, Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { db } from './db.js';
import {
  hashPassword,
  comparePassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireAdmin,
} from './auth.js';
import { saveBeverageImage } from './uploadService.js';
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

    // Also check local SQLite
    const existingLocal = db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail) as { id: string; email: string } | undefined;
    if (existingLocal) {
      return res.status(400).json({ error: 'Email already registered. Please sign in.' });
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
        console.warn('Supabase users insert note (RLS/policy):', sbInsertError.message || sbInsertError);
      } else if (insertedData?.id) {
        userId = String(insertedData.id);
      }
    } catch (sbErr) {
      console.warn('Supabase users insert caught error:', sbErr);
    }

    // 4. Save to local SQLite database so relational keys (orders, cart events) remain consistent
    db.prepare(`
      INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at)
      VALUES (?, ?, ?, ?, 'user', 1, ?)
    `).run(userId, name, cleanEmail, hashedPassword, createdAt);

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
      let adminRecord = db.prepare("SELECT id, name, email, role, email_verified, created_at, avatar_url, parent_id FROM users WHERE role = 'admin' OR email = ?").get(cleanEmail) as any;
      if (!adminRecord) {
        const adminId = 'admin_sys_01';
        const now = new Date().toISOString();
        const hash = await hashPassword('admin');
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at, parent_id)
          VALUES (?, 'Aurra Administrator', ?, ?, 'admin', 1, ?, 'AURRA-HQ-01')
        `).run(adminId, cleanEmail, hash, now);
        adminRecord = {
          id: adminId,
          name: 'Aurra Administrator',
          email: cleanEmail,
          role: 'admin',
          email_verified: 1,
          created_at: now,
          avatar_url: null,
          parent_id: 'AURRA-HQ-01',
        };
      }
      const authUser = {
        id: adminRecord.id,
        name: adminRecord.name,
        email: adminRecord.email,
        role: 'admin' as const,
        email_verified: 1,
        created_at: adminRecord.created_at,
        avatar_url: adminRecord.avatar_url || null,
        parent_id: adminRecord.parent_id || 'AURRA-HQ-01',
      };
      const token = signToken(authUser);
      setAuthCookie(res, token);
      return res.json({ success: true, user: authUser });
    }

    // 2. Verify user credentials against Supabase users table
    try {
      const { data: sbUser, error: sbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      const storedPasswordHash = sbUser?.password || sbUser?.password_hash;
      if (sbUser && storedPasswordHash) {
        // Compare password using bcrypt
        const isMatch = await comparePassword(password, storedPasswordHash);
        if (isMatch) {
          // Check role from Supabase column ('admin' or 'user')
          const assignedRole = (sbUser.role === 'admin' || cleanEmail === 'adminaurra@beverages.com') ? 'admin' : 'user';

          const authUser = {
            id: String(sbUser.id),
            name: sbUser.name || 'Aurra Customer',
            email: sbUser.email,
            role: assignedRole,
            email_verified: 1,
            created_at: sbUser.created_at || new Date().toISOString(),
            updated_at: sbUser.updated_at || null,
            delivery_address: sbUser.delivery_address || null,
            avatar_url: sbUser.avatar_url || null,
            parent_id: sbUser.parent_id || 'AURRA-DIST-IND-01',
          };

          // Synchronize with local SQLite so relational foreign keys (cart events, orders) work smoothly
          try {
            db.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at, updated_at, delivery_address, avatar_url, parent_id)
              VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
            `).run(
              authUser.id,
              authUser.name,
              authUser.email,
              storedPasswordHash,
              assignedRole,
              authUser.created_at,
              authUser.updated_at,
              authUser.delivery_address,
              authUser.avatar_url,
              authUser.parent_id
            );
          } catch (syncErr) {
            console.warn('Sync user to SQLite warning:', syncErr);
          }

          const token = signToken(authUser);
          setAuthCookie(res, token);
          return res.json({ success: true, user: authUser });
        } else {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
      }
    } catch (sbErr) {
      console.warn('Supabase login lookup error:', sbErr);
    }

    // 3. Fallback: Check local SQLite database
    const localUser = db.prepare('SELECT id, name, email, password_hash, role, email_verified, created_at, updated_at, delivery_address, avatar_url, parent_id FROM users WHERE email = ?').get(cleanEmail) as any;
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
          avatar_url: localUser.avatar_url || null,
          parent_id: localUser.parent_id || 'AURRA-DIST-IND-01',
        };
        const token = signToken(authUser);
        setAuthCookie(res, token);
        return res.json({ success: true, user: authUser });
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
router.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, delivery_address, parent_id FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) {
    return res.json({ user: req.user });
  }
  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      email_verified: user.email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at || null,
      avatar_url: user.avatar_url || null,
      delivery_address: user.delivery_address || null,
      parent_id: user.parent_id || 'AURRA-DIST-IND-01',
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
      let adminRecord = db.prepare("SELECT id, name, email, role, email_verified, created_at, avatar_url, parent_id FROM users WHERE role = 'admin' OR email = ?").get(cleanUser) as any;
      if (!adminRecord) {
        const adminId = 'admin_sys_01';
        const now = new Date().toISOString();
        const hash = await hashPassword('admin');
        db.prepare(`
          INSERT OR REPLACE INTO users (id, name, email, password_hash, role, email_verified, created_at, parent_id)
          VALUES (?, 'Aurra Administrator', ?, ?, 'admin', 1, ?, 'AURRA-HQ-01')
        `).run(adminId, cleanUser, hash, now);
        adminRecord = {
          id: adminId,
          name: 'Aurra Administrator',
          email: cleanUser,
          role: 'admin',
          email_verified: 1,
          created_at: now,
          avatar_url: null,
          parent_id: 'AURRA-HQ-01',
        };
      }

      const authUser = {
        id: adminRecord.id,
        name: adminRecord.name,
        email: adminRecord.email,
        role: 'admin' as const,
        email_verified: 1,
        created_at: adminRecord.created_at,
        avatar_url: adminRecord.avatar_url || null,
        parent_id: adminRecord.parent_id || 'AURRA-HQ-01',
      };

      const token = signToken(authUser);
      setAuthCookie(res, token);
      return res.json({ success: true, user: authUser });
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

    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE id = ?').get(req.user!.id) as
      | { id: string; email: string; password_hash: string }
      | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    const now = new Date().toISOString();

    // 1. Update SQLite
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, user.id);

    // 2. Update Supabase users table (capturing updated_at; created_at remains unchanged)
    try {
      await supabase
        .from('users')
        .update({ password: newHash, updated_at: now })
        .eq('email', user.email);
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

// POST /api/auth/avatar
router.post('/auth/avatar', requireAuth, async (req: Request, res: Response) => {
  try {
    const { avatarUrl } = req.body || {};
    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return res.status(400).json({ error: 'Avatar image URL or data is required' });
    }

    const now = new Date().toISOString();

    // 1. Update SQLite
    db.prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?').run(avatarUrl, now, req.user!.id);

    // 2. Update Supabase users table (capturing updated_at)
    try {
      await supabase
        .from('users')
        .update({ avatar_url: avatarUrl, updated_at: now })
        .eq('email', req.user!.email);
    } catch (sbErr) {
      console.warn('Supabase avatar update error:', sbErr);
    }

    const updated = db.prepare('SELECT id, name, email, role, email_verified, created_at, updated_at, avatar_url, delivery_address, parent_id FROM users WHERE id = ?').get(req.user!.id);

    return res.json({
      success: true,
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

// GET /api/products
router.get('/products', async (_req: Request, res: Response) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY created_at ASC').all() as any[];

    // Attempt to merge real-time inventory from Supabase products table if exists
    try {
      const { data: sbProds } = await supabase.from('products').select('*');
      if (sbProds && sbProds.length > 0) {
        for (const sbP of sbProds) {
          const match = products.find(
            (p) => p.name === sbP.beverage_name || p.id === String(sbP.id) || p.beverage_name === sbP.beverage_name
          );
          if (match && typeof sbP.remaining_quantity === 'number') {
            match.remaining_quantity = sbP.remaining_quantity;
            if (typeof sbP.total_quantity === 'number') {
              match.total_quantity = sbP.total_quantity;
            }
          }
        }
      }
    } catch {
      // Use local SQLite values
    }

    return res.json({ products });
  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ error: 'Failed to retrieve products' });
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

    const existing = db.prepare('SELECT id, created_at, remaining_quantity FROM products WHERE id = ?').get(id) as any;

    if (existing) {
      // EDIT: updated_at captures date and time; created_at remains unchanged!
      const remainQty = typeof remaining_quantity === 'number'
        ? remaining_quantity
        : (typeof existing.remaining_quantity === 'number' ? existing.remaining_quantity : totalQty);

      db.prepare(`
        UPDATE products
        SET name = ?, beverage_name = ?, flavor = ?, flavor_notes = ?, price = ?, image_url = ?, description = ?,
            volume = ?, calories = ?, category = ?, total_quantity = ?, remaining_quantity = ?, active = ?, updated_at = ?
        WHERE id = ?
      `).run(bevName, bevName, flavNotes, flavNotes, price, image_url, description, volume, calories, cat, totalQty, remainQty, active, now, id);

      // Update in Supabase products table
      try {
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
            image_url,
            updated_at: now,
          })
          .or(`beverage_name.eq.${bevName},id.eq.${id}`);
      } catch (sbErr) {
        console.warn('Supabase product update warning (RLS/policy):', sbErr);
      }
    } else {
      // ADD: created_at captures date and time; remaining_quantity defaults to total_quantity
      const remainQty = typeof remaining_quantity === 'number' ? remaining_quantity : totalQty;

      db.prepare(`
        INSERT INTO products (id, name, beverage_name, flavor, flavor_notes, price, image_url, description, volume, calories, category, total_quantity, remaining_quantity, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, bevName, bevName, flavNotes, flavNotes, price, image_url, description, volume, calories, cat, totalQty, remainQty, active, now);

      // Insert into Supabase products table
      try {
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
            image_url,
            created_at: now,
          });
      } catch (sbErr) {
        console.warn('Supabase product insert warning (RLS/policy):', sbErr);
      }
    }

    const saved = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.status(201).json({ success: true, product: saved });
  } catch (err) {
    console.error('Save product error:', err);
    return res.status(500).json({ error: 'Failed to save product' });
  }
});

// POST /api/products/upload-image (Admin only: upload beverage image file/base64)
router.post('/products/upload-image', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { imageBase64, filename, productId, cloudinaryConfig } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 string is required' });
    }

    // Save image via uploadService (Cloudinary if configured, else local storage)
    const result = await saveBeverageImage(imageBase64, filename, cloudinaryConfig);

    // If productId is provided, associate this image with the product in database
    let updatedProduct = null;
    if (productId) {
      const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
      if (existing) {
        db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(result.url, productId);
        updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      }
    }

    return res.status(201).json({
      success: true,
      url: result.url,
      filename: result.filename,
      sizeBytes: result.sizeBytes,
      provider: result.provider,
      product: updatedProduct,
    });
  } catch (err: any) {
    console.error('Image upload failed:', err);
    return res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

// PUT /api/products/:id/image (Admin only: direct association of image URL)
router.put('/products/:id/image', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl string is required' });
    }

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(imageUrl, productId);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

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
router.post('/cart/events', requireAuth, (req: Request, res: Response) => {
  try {
    const parse = cartEventSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid cart event payload' });
    }

    const { productId, action, qty } = parse.data;
    const userId = req.user!.id;
    const eventId = generateId('cev');
    const serverTimestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO cart_events (id, user_id, product_id, action, qty, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(eventId, userId, productId, action, qty, serverTimestamp);

    return res.status(201).json({
      success: true,
      eventId,
      timestamp: serverTimestamp,
    });
  } catch (err) {
    console.error('Cart event logging error:', err);
    return res.status(500).json({ error: 'Failed to record cart event' });
  }
});

// -------------------------------------------------------------
// ORDERS ROUTES
// -------------------------------------------------------------

// POST /api/orders (Creates order and deducts inventory from remaining_quantity in SQLite & Supabase)
router.post('/orders', requireAuth, async (req: Request, res: Response) => {
  try {
    const parse = createOrderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues[0]?.message || 'Invalid order format' });
    }

    const { items } = parse.data;
    const userId = req.user!.id;
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
      const product = productStmt.get(item.productId) as
        | { id: string; name: string; beverage_name?: string; price: number; active: number; total_quantity: number; remaining_quantity: number }
        | undefined;

      if (!product) {
        return res.status(400).json({ error: `Product with ID '${item.productId}' was not found.` });
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

// GET /api/orders (Logged in user's orders with items)
router.get('/orders', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orders = db.prepare(`
      SELECT id, user_id, total, status, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as any[];

    const itemStmt = db.prepare(`
      SELECT id, product_id, name_snapshot, price_snapshot, qty
      FROM order_items
      WHERE order_id = ?
    `);

    const ordersWithItems = orders.map((o) => {
      const items = itemStmt.all(o.id);
      return {
        ...o,
        items,
      };
    });

    return res.json({ orders: ordersWithItems });
  } catch (err) {
    console.error('Fetch orders error:', err);
    return res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// PATCH /api/orders/:id/status (Allows user to mark order as delivered or advance status)
router.patch('/orders/:id/status', requireAuth, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }
    const order = db.prepare('SELECT id, user_id FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this order' });
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    return res.json({ success: true, status });
  } catch (err) {
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

// -------------------------------------------------------------
// ADMIN ANALYTICS & QUERIES
// -------------------------------------------------------------

// GET /api/admin/overview
router.get('/admin/overview', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  try {
    const userCount = (db.prepare('SELECT count(*) as count FROM users').get() as any).count;
    const orderCount = (db.prepare('SELECT count(*) as count FROM orders').get() as any).count;
    const totalRevenue = (db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM orders').get() as any).sum;
    const cartEventCount = (db.prepare('SELECT count(*) as count FROM cart_events').get() as any).count;

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
router.get('/api/admin/users', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  try {
    const users = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, u.email_verified, u.created_at,
             COUNT(DISTINCT o.id) as order_count,
             COALESCE(SUM(o.total), 0) as total_spent,
             COUNT(DISTINCT ce.id) as cart_events_count
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      LEFT JOIN cart_events ce ON ce.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

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
