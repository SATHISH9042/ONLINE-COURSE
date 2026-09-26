import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { hashPassword, comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
} from '../utils/jwt';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { config } from '../config';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);

      // Normalize phone number: strip non-digits, keep leading + if present
      let normalizedPhone = data.phone.trim();
      if (!normalizedPhone.startsWith('+')) {
        if (normalizedPhone.length === 10) {
          normalizedPhone = `+91${normalizedPhone}`;
        } else {
          normalizedPhone = `+${normalizedPhone}`;
        }
      }

      const email = data.email ? data.email.toLowerCase().trim() : null;

      // Check if phone or email already registered
      const existingUser = await db.query(
        'SELECT id, phone, email FROM users WHERE phone = $1 OR (email IS NOT NULL AND email = $2)',
        [normalizedPhone, email]
      );

      if (existingUser.rowCount > 0) {
        const match = existingUser.rows[0];
        if (match.phone === normalizedPhone) {
          res.status(409).json({
            success: false,
            code: 'PHONE_ALREADY_EXISTS',
            message: 'An account with this phone number is already registered.',
          });
          return;
        }
        if (email && match.email === email) {
          res.status(409).json({
            success: false,
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email address is already registered.',
          });
          return;
        }
      }

      const passwordHash = await hashPassword(data.password);

      // Run transactional registration
      const newStudent = await db.transaction(async (tx) => {
        // Create user with status PENDING_APPROVAL
        const userRes = await tx.query(
          `INSERT INTO users (phone, email, password_hash, role, status)
           VALUES ($1, $2, $3, 'STUDENT', 'PENDING_APPROVAL')
           RETURNING id, phone, email, role, status, created_at`,
          [normalizedPhone, email, passwordHash]
        );

        const user = userRes.rows[0];

        // Create student profile
        await tx.query(
          `INSERT INTO student_profiles (user_id, full_name, city, state)
           VALUES ($1, $2, $3, $4)`,
          [user.id, data.fullName, data.city || null, data.state || null]
        );

        return user;
      });

      res.status(201).json({
        success: true,
        message: 'Your registration has been submitted. Please wait for administrator approval.',
        data: {
          id: newStudent.id,
          fullName: data.fullName,
          phone: newStudent.phone,
          email: newStudent.email,
          status: newStudent.status,
          role: newStudent.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const identifier = data.identifier.trim();

      // Find user by phone, normalized phone, or email
      let normalizedPhone = identifier;
      if (!normalizedPhone.startsWith('+') && /^\d{10}$/.test(normalizedPhone)) {
        normalizedPhone = `+91${normalizedPhone}`;
      }

      const userRes = await db.query(
        `SELECT u.id, u.phone, u.email, u.password_hash, u.role, u.status, u.token_version,
                u.failed_login_attempts, u.locked_until,
                COALESCE(sp.full_name, ap.full_name, 'User') as full_name
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN admin_profiles ap ON ap.user_id = u.id
         WHERE (u.phone = $1 OR u.phone = $2 OR (u.email IS NOT NULL AND LOWER(u.email) = LOWER($1)))
           AND u.deleted_at IS NULL`,
        [identifier, normalizedPhone]
      );

      if (userRes.rowCount === 0) {
        res.status(401).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid phone number/email or password.',
        });
        return;
      }

      const user = userRes.rows[0];

      // Check account lockout
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingMinutes = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000)
        );
        res.status(423).json({
          success: false,
          code: 'ACCOUNT_LOCKED',
          message: `Account is temporarily locked due to repeated failed attempts. Please retry in ${remainingMinutes} minutes.`,
        });
        return;
      }

      const isValidPassword = await comparePassword(data.password, user.password_hash);
      if (!isValidPassword) {
        const newAttempts = (user.failed_login_attempts || 0) + 1;
        let lockUntilSql = 'NULL';
        if (newAttempts >= 5) {
          // Lock for 15 minutes after 5 consecutive failed attempts
          await db.query(
            `UPDATE users
             SET failed_login_attempts = $1,
                 locked_until = NOW() + INTERVAL '15 minutes'
             WHERE id = $2`,
            [newAttempts, user.id]
          );
          res.status(423).json({
            success: false,
            code: 'ACCOUNT_LOCKED',
            message: 'Account locked due to 5 failed login attempts. Please try again after 15 minutes.',
          });
          return;
        } else {
          await db.query(
            'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
            [newAttempts, user.id]
          );
        }

        res.status(401).json({
          success: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid phone number/email or password.',
        });
        return;
      }

      // Reset failed attempts upon successful password match
      if (user.failed_login_attempts > 0 || user.locked_until) {
        await db.query(
          'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
          [user.id]
        );
      }

      // ENFORCE STUDENT APPROVAL RESTRICTIONS (Section 4 & 5)
      if (user.role === 'STUDENT') {
        if (user.status === 'PENDING_APPROVAL') {
          res.status(403).json({
            success: false,
            code: 'ACCOUNT_PENDING_APPROVAL',
            message: 'Your registration has been submitted. Please wait for administrator approval.',
            data: {
              status: user.status,
              role: user.role,
              fullName: user.full_name,
            },
          });
          return;
        }

        if (user.status === 'REJECTED') {
          res.status(403).json({
            success: false,
            code: 'ACCOUNT_REJECTED',
            message: 'Your account registration was rejected by the administrator. Please contact institute support.',
            data: {
              status: user.status,
              role: user.role,
            },
          });
          return;
        }

        if (user.status === 'SUSPENDED') {
          res.status(403).json({
            success: false,
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended by the administrator. Please contact institute support.',
            data: {
              status: user.status,
              role: user.role,
            },
          });
          return;
        }
      }

      // Generate Access Token (JWT)
      const accessToken = generateAccessToken({
        userId: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status,
        tokenVersion: user.token_version,
      });

      // Generate and store Refresh Token
      const rawRefreshToken = generateRefreshTokenString();
      const refreshTokenHash = hashToken(rawRefreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.refreshTokenExpiresDays);

      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, refreshTokenHash, expiresAt.toISOString()]
      );

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          accessToken,
          refreshToken: rawRefreshToken,
          user: {
            id: user.id,
            fullName: user.full_name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            status: user.status,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = refreshTokenSchema.parse(req.body);
      const tokenHash = hashToken(data.refreshToken);

      const tokenRes = await db.query(
        `SELECT rt.id, rt.user_id, rt.expires_at, rt.is_revoked,
                u.phone, u.email, u.role, u.status, u.token_version,
                COALESCE(sp.full_name, ap.full_name, 'User') as full_name
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN admin_profiles ap ON ap.user_id = u.id
         WHERE rt.token_hash = $1 AND u.deleted_at IS NULL`,
        [tokenHash]
      );

      if (tokenRes.rowCount === 0) {
        res.status(401).json({
          success: false,
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Refresh token is invalid.',
        });
        return;
      }

      const tokenRecord = tokenRes.rows[0];

      if (tokenRecord.is_revoked) {
        res.status(401).json({
          success: false,
          code: 'REVOKED_REFRESH_TOKEN',
          message: 'Refresh token has been revoked. Please sign in again.',
        });
        return;
      }

      if (new Date(tokenRecord.expires_at) < new Date()) {
        res.status(401).json({
          success: false,
          code: 'EXPIRED_REFRESH_TOKEN',
          message: 'Refresh token has expired. Please sign in again.',
        });
        return;
      }

      if (tokenRecord.status !== 'ACTIVE') {
        res.status(403).json({
          success: false,
          code: `ACCOUNT_${tokenRecord.status}`,
          message: `Account is not active (current status: ${tokenRecord.status}).`,
        });
        return;
      }

      // Generate new access token
      const newAccessToken = generateAccessToken({
        userId: tokenRecord.user_id,
        phone: tokenRecord.phone,
        email: tokenRecord.email,
        role: tokenRecord.role,
        status: tokenRecord.status,
        tokenVersion: tokenRecord.token_version,
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await db.query(
          'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1',
          [tokenHash]
        );
      }

      res.status(200).json({
        success: true,
        message: 'Successfully logged out.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        });
        return;
      }

      const userRes = await db.query(
        `SELECT u.id, u.phone, u.email, u.role, u.status, u.created_at,
                sp.full_name, sp.avatar_url, sp.bio, sp.city, sp.state,
                ap.department
         FROM users u
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN admin_profiles ap ON ap.user_id = u.id
         WHERE u.id = $1`,
        [req.user.id]
      );

      if (userRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          code: 'NOT_FOUND',
          message: 'User profile not found.',
        });
        return;
      }

      const profile = userRes.rows[0];

      res.status(200).json({
        success: true,
        data: {
          id: profile.id,
          phone: profile.phone,
          email: profile.email,
          role: profile.role,
          status: profile.status,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          city: profile.city,
          state: profile.state,
          department: profile.department,
          registeredAt: profile.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
