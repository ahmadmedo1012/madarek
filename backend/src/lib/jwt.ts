import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env.js';
import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  type: 'access';
}
export interface RefreshTokenPayload {
  sub: string;
  ver: number;
  type: 'refresh';
}

// Pin the algorithm on BOTH sides. Sign defaults to HS256 for string
// secrets, but an explicit pin keeps a future edit (or a dependency
// upgrade changing the default) from silently widening it. On verify,
// an explicit allow-list is mandatory: without it jwt.verify accepts
// tokens signed with *any* algorithm the key type permits (incl. `none`
// on some runtimes), which opens algorithm-confusion downgrade.
const SIGN_ALGORITHM: SignOptions['algorithm'] = 'HS256';

const accessOpts: SignOptions = { algorithm: SIGN_ALGORITHM, expiresIn: env.jwtAccessTtl };
const refreshOpts: SignOptions = { algorithm: SIGN_ALGORITHM, expiresIn: env.jwtRefreshTtl };

export const signAccessToken = (userId: string, role: Role) =>
  jwt.sign({ sub: userId, role, type: 'access' } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, accessOpts);

export const signRefreshToken = (userId: string, tokenVersion: number) =>
  jwt.sign(
    { sub: userId, ver: tokenVersion, type: 'refresh' } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    refreshOpts,
  );

const VERIFY_OPTIONS: jwt.VerifyOptions = {
  algorithms: [SIGN_ALGORITHM],
  // Enforced by default; stated explicitly because expiry handling is
  // security-relevant and must not regress silently.
  ignoreExpiration: false,
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const ROLE_VALUES: readonly string[] = Object.values(Role);
const isRole = (v: unknown): v is Role => typeof v === 'string' && ROLE_VALUES.includes(v);

/**
 * Verify a token's signature/expiry and return its payload as a plain
 * record, re-checking the type discriminator. A valid HS256 signature
 * only proves WE signed the token — not that the payload has the shape
 * the caller expects — so the verifier's output is runtime-validated
 * instead of blind-cast to the payload interface.
 */
const decodeVerified = (
  token: string,
  secret: string,
  type: 'access' | 'refresh',
): Record<string, unknown> => {
  const decoded: unknown = jwt.verify(token, secret, VERIFY_OPTIONS);
  if (!isRecord(decoded) || decoded.type !== type) {
    throw new Error('Wrong token type');
  }
  return decoded;
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = decodeVerified(token, env.JWT_ACCESS_SECRET, 'access');
  if (typeof payload.sub !== 'string' || !isRole(payload.role)) {
    throw new Error('Malformed access token payload');
  }
  return { sub: payload.sub, role: payload.role, type: 'access' };
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const payload = decodeVerified(token, env.JWT_REFRESH_SECRET, 'refresh');
  if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number' || !Number.isInteger(payload.ver)) {
    throw new Error('Malformed refresh token payload');
  }
  return { sub: payload.sub, ver: payload.ver, type: 'refresh' };
};

/**
 * Parse the zeit/ms-style duration strings used for JWT TTLs ('15m',
 * '7d') into milliseconds. Exported so the refresh-cookie `maxAge` is
 * derived from the SAME `env.jwtRefreshTtl` string jsonwebtoken signs
 * with — the cookie and the token must expire together: a longer-lived
 * cookie keeps shipping dead tokens, a shorter-lived one strands valid
 * tokens the client can no longer send.
 */
export const parseDurationMs = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) throw new Error(`Invalid duration string: "${value}" — expected e.g. "15m" or "7d"`);
  const amount = Number(match[1]);
  switch (match[2]) {
    case 's':
      return amount * 1_000;
    case 'm':
      return amount * 60_000;
    case 'h':
      return amount * 3_600_000;
    case 'd':
      return amount * 86_400_000;
    default:
      // Unreachable: the regex only admits s/m/h/d.
      throw new Error(`Unsupported duration unit: ${String(match[2])}`);
  }
};
