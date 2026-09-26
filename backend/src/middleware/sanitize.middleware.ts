import { Request, Response, NextFunction } from 'express';

/**
 * XSS & HTML injection sanitizer.
 * Cleans user string inputs while preserving programming code in code submission fields.
 */
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^>\s]+/gi,
];

// Fields that may intentionally contain source code (e.g., in Section 16 coding sandbox)
const EXEMPT_CODE_FIELDS = new Set(['submittedCode', 'code', 'solutionCode', 'testCode']);

export function sanitizeString(value: string, fieldName?: string): string {
  if (fieldName && EXEMPT_CODE_FIELDS.has(fieldName)) {
    return value; // Do not strip code from student coding solutions
  }

  let sanitized = value;
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Also strip null bytes to prevent path/string truncation attacks
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

export function sanitizeObject(obj: any, keyName?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, keyName);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, keyName));
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      cleaned[key] = sanitizeObject(val, key);
    }
    return cleaned;
  }

  return obj;
}

/**
 * Express middleware to sanitize req.body, req.query, and req.params
 */
export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}
