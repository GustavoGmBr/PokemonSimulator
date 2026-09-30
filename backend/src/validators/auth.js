import { z } from 'zod';

const login = z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).toLowerCase();
const senha = z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
  message: 'A senha deve ter no maximo 72 bytes em UTF-8.',
});
export const nomeTreinador = z.string().trim().min(2).max(30);
export const registerSchema = z.object({ login, senha, nomeTreinador }).strict();
export const loginSchema = z.object({ login, senha }).strict();
export const updateSaveSchema = z.object({ nomeTreinador }).strict();
