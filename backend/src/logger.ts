import { pino } from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.isProd ? 'info' : 'debug',
  base: { service: 'madarek' },
  // Seatbelt (11-a P2-14): no current call site logs secrets (verified
  // across the auth paths), but redact guarantees future ones can't leak
  // credentials into the JSON log stream either. Each path uses at most
  // one wildcard (a fast-redact constraint) at the depth where these
  // keys realistically appear (req/body/user/err objects).
  redact: {
    paths: [
      'password',
      '*.password',
      '*.passwordHash',
      'token',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      'authorization',
      '*.authorization',
      'cookie',
      '*.cookie',
      // axios-shaped errors carry the full request URL — query strings
      // are a classic accidental-secret channel.
      'err.config.url',
    ],
    censor: '[REDACTED]',
  },
});
