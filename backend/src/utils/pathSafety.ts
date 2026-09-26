import path from 'path';

/**
 * Validates that a filename or storage key does not contain directory traversal attempts
 * (e.g. `../`, `..\`, null bytes, or absolute paths outside the designated folder).
 */
export function isSafePath(inputPath: string): boolean {
  if (!inputPath || typeof inputPath !== 'string') return false;

  // Block null bytes
  if (inputPath.includes('\0')) return false;

  // Block directory traversal sequences
  if (inputPath.includes('..') || inputPath.includes('..\\') || inputPath.includes('../')) {
    return false;
  }

  // Block path traversal using backslashes or URI encoded variations
  const decoded = decodeURIComponent(inputPath);
  if (decoded.includes('..') || decoded.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * Resolves a safe file path relative to a base directory, throwing an error if traversal is detected.
 */
export function resolveSafePath(baseDir: string, relativePath: string): string {
  if (!isSafePath(relativePath)) {
    throw new Error('PATH_TRAVERSAL_DETECTED');
  }

  const safeBase = path.resolve(baseDir);
  const resolved = path.resolve(safeBase, relativePath);

  if (!resolved.startsWith(safeBase)) {
    throw new Error('PATH_TRAVERSAL_DETECTED');
  }

  return resolved;
}
