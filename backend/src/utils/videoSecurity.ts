import crypto from 'crypto';
import { config } from '../config';

export interface VideoAccessTokenPayload {
  studentId: string;
  videoId: string;
  storageKey: string;
  expiresAt: number;
}

/**
 * Section 30: Video Security
 * Generates an HMAC-SHA256 signed expiring token for streaming course videos
 */
export function generateSignedVideoToken(studentId: string, videoId: string, storageKey: string, ttlSeconds = 900): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${studentId}:${videoId}:${storageKey}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(payload)
    .digest('hex');

  // Return base64url encoded token containing payload and signature
  const tokenData = JSON.stringify({ studentId, videoId, storageKey, expiresAt, signature });
  return Buffer.from(tokenData).toString('base64url');
}

export function verifySignedVideoToken(token: string): VideoAccessTokenPayload | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const data = JSON.parse(raw);

    if (!data.studentId || !data.videoId || !data.storageKey || !data.expiresAt || !data.signature) {
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (now > data.expiresAt) {
      return null;
    }

    // Verify HMAC signature
    const payload = `${data.studentId}:${data.videoId}:${data.storageKey}:${data.expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(data.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) return null;

    return {
      studentId: data.studentId,
      videoId: data.videoId,
      storageKey: data.storageKey,
      expiresAt: data.expiresAt,
    };
  } catch {
    return null;
  }
}
