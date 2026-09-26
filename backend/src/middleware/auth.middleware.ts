import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { db } from '../database/db';
import { UserRole, UserStatus } from '../types';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  tokenVersion: number;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Access token required. Please sign in.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Look up user from database to verify active status and token version
    const userRes = await db.query(
      `SELECT u.id, u.phone, u.email, u.role, u.status, u.token_version,
              COALESCE(sp.full_name, ap.full_name, 'User') as full_name
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN admin_profiles ap ON ap.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [payload.userId]
    );

    if (userRes.rowCount === 0) {
      res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Account not found or deactivated.',
      });
      return;
    }

    const user = userRes.rows[0];

    // Check if token was invalidated by version increment (e.g. password change / suspension)
    if (user.token_version !== payload.tokenVersion) {
      res.status(401).json({
        success: false,
        code: 'SESSION_EXPIRED',
        message: 'Session has been invalidated. Please sign in again.',
      });
      return;
    }

    req.user = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      tokenVersion: user.token_version,
      fullName: user.full_name,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Access token expired. Please refresh your session.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid access token.',
    });
  }
}

export function requireActive(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
    return;
  }

  if (req.user.status === 'PENDING_APPROVAL') {
    res.status(403).json({
      success: false,
      code: 'ACCOUNT_PENDING_APPROVAL',
      message: 'Your registration has been submitted. Please wait for administrator approval.',
    });
    return;
  }

  if (req.user.status === 'REJECTED') {
    res.status(403).json({
      success: false,
      code: 'ACCOUNT_REJECTED',
      message: 'Your account registration was rejected by the administrator.',
    });
    return;
  }

  if (req.user.status === 'SUSPENDED') {
    res.status(403).json({
      success: false,
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended by the administrator.',
    });
    return;
  }

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Access denied: insufficient administrative privileges.',
      });
      return;
    }

    next();
  };
}
