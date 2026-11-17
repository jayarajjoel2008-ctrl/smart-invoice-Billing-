import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, '.env');
let fileEnv: Record<string, string> = {};
try { fileEnv = dotenv.parse(readFileSync(envPath)); } catch { /* Optional for the hosted demo; persisted features remain unconfigured. */ }

const value = (key: string, fallback = '') => process.env[key] ?? fileEnv[key] ?? fallback;
const nodeEnv = value('NODE_ENV', 'development');
const cookieSetting = fileEnv.BILLPRO_COOKIE_SECURE ?? process.env.BILLPRO_COOKIE_SECURE;
const port = nodeEnv === 'production'
  ? Number(process.env.PORT || fileEnv.PORT || 3000)
  : Number(process.env.API_PORT || fileEnv.API_PORT || 3001);

export const config = {
  nodeEnv,
  port,
  mongoUri: value('MONGODB_URI'),
  jwtSecret: value('JWT_SECRET') || randomBytes(48).toString('hex'),
  cookieSecure: cookieSetting === undefined ? nodeEnv === 'production' : cookieSetting !== 'false',
  cookieName: 'billpro_session',
  appBaseUrl: value('APP_BASE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  // The Gemini credential is deliberately read from the backend file only, never process.env or Vite.
  geminiApiKey: fileEnv.GEMINI_API_KEY || '',
  geminiModel: value('GEMINI_MODEL', 'gemini-2.5-flash'),
  smtp: {
    host: value('SMTP_HOST'),
    port: Number(value('SMTP_PORT', '587')),
    secure: value('SMTP_SECURE') === 'true',
    user: value('SMTP_USER'),
    pass: value('SMTP_PASS'),
    from: value('SMTP_FROM'),
  },
};
