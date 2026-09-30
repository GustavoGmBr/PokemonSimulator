import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3334),
  DATABASE_URL: z.string().startsWith('mysql://'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^[1-9]\d*[smhd]$/).default('1d'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
});

export function parseEnv(values) {
  const result = schema.safeParse(values);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Configuracao invalida no .env: ${fields.join(', ')}. Consulte .env.example.`);
  }
  return result.data;
}
