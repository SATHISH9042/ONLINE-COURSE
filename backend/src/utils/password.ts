import bcrypt from 'bcryptjs';
import { config } from '../config';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, config.bcryptSaltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
