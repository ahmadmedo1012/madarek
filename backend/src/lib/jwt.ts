import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env.js';
import type { Role } from '@prisma/client';

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

const accessOpts: SignOptions = { expiresIn: env.jwtAccessTtl as SignOptions['expiresIn'] };
const refreshOpts: SignOptions = { expiresIn: env.jwtRefreshTtl as SignOptions['expiresIn'] };

export const signAccessToken = (userId: string, role: Role) =>
  jwt.sign({ sub: userId, role, type: 'access' } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, accessOpts);

export const signRefreshToken = (userId: string, tokenVersion: number) =>
  jwt.sign(
    { sub: userId, ver: tokenVersion, type: 'refresh' } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    refreshOpts,
  );

// Verify options — algorithm MUST be pinned. Without an explicit allow-list
// jwt.verify accepts tokens signed with *any* algorithm the key type permits
// (incl. `none` on some runtimes), which opens algorithm-confusion downgrade.
// We only ever sign HS256, so we only ever accept HS256.
const VERIFY_ALGORITHMS: jwt.VerifyOptions = { algorithms: ['HS256'] };

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, VERIFY_ALGORITHMS) as AccessTokenPayload;
  if (payload.type !== 'access') throw new Error('Wrong token type');
  return payload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, VERIFY_ALGORITHMS) as RefreshTokenPayload;
  if (payload.type !== 'refresh') throw new Error('Wrong token type');
  return payload;
};
