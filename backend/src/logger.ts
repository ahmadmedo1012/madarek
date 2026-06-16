import { pino } from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
  base: { service: 'madarek' },
});
