import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z, type ZodType } from 'zod';
import { config } from './config';
import { User, AdminUser, Business } from './models';

export interface AuthUser { id: string; businessId: string; name: string; email: string; role: 'admin' | 'staff' | 'superadmin'; provider?: string; avatarUrl?: string; isAdmin?: boolean; redirectUrl?: string }
declare global { namespace Express { interface Request { authUser?: AuthUser } } }

export function validate<T>(schema: ZodType<T>, input: unknown): T { return schema.parse(input); }
export function objectIdSchema() { return z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record ID'); }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[config.cookieName] || req.cookies?.['billpro_admin_session'];
    if (!token || typeof token !== 'string') return res.status(401).json({ error: 'Authentication required' });
    let claims: { sub: string; businessId?: string; role: string };
    try { claims = jwt.verify(token, config.jwtSecret) as typeof claims; }
    catch { return res.status(401).json({ error: 'Session is invalid or expired' }); }
    if (!claims.sub || !['admin', 'staff', 'superadmin'].includes(claims.role)) return res.status(401).json({ error: 'Session is invalid' });

    if (claims.role === 'superadmin') {
      const admin: any = await AdminUser.findById(claims.sub).lean();
      if (!admin || admin.status === 'suspended') return res.status(401).json({ error: 'Super Admin account is invalid or suspended' });
      let bizId = claims.businessId;
      if (!bizId) {
        const b: any = await Business.findOne().select('_id').lean();
        bizId = b ? String(b._id) : '';
      }
      req.authUser = {
        id: String(admin._id),
        businessId: bizId,
        name: admin.name,
        email: admin.email,
        role: 'superadmin',
        provider: 'local',
        avatarUrl: admin.avatarUrl || '',
        isAdmin: true,
        redirectUrl: '/admin',
      };
      return next();
    }

    if (!claims.businessId) return res.status(401).json({ error: 'Session is invalid' });
    const user: any = await User.findOne({ _id: claims.sub, businessId: claims.businessId }).select('_id businessId name email role provider avatarUrl').lean();
    if (!user) return res.status(401).json({ error: 'Session is no longer valid' });
    req.authUser = { id: String(user._id), businessId: String(user.businessId), name: user.name, email: user.email, role: user.role as AuthUser['role'], provider: user.provider || 'local', avatarUrl: user.avatarUrl || '', isAdmin: false, redirectUrl: '/' };
    next();
  } catch (error) { next(error); }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.authUser?.role !== 'admin' && req.authUser?.role !== 'superadmin') return res.status(403).json({ error: 'Administrator access required' });
  next();
}

export function appUser(user: AuthUser) { return { id: user.id, businessId: user.businessId, name: user.name, email: user.email, role: user.role, provider: user.provider || 'local', avatarUrl: user.avatarUrl || '', isAdmin: user.role === 'superadmin', redirectUrl: user.role === 'superadmin' ? '/admin' : '/' }; }
