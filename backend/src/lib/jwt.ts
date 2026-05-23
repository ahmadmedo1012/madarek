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

const accessOpts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
const refreshOpts: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'] };

export const signAccessToken = (userId: string, role: Role) =>
  jwt.sign({ sub: userId, role, type: 'access' } satisfies AccessTokenPayload, env.JWT_ACCESS_SECRET, accessOpts);

export const signRefreshToken = (userId: string, tokenVersion: number) =>
  jwt.sign(
    { sub: userId, ver: tokenVersion, type: 'refresh' } satisfies RefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    refreshOpts,
  );

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (payload.type !== 'access') throw new Error('Wrong token type');
  return payload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (payload.type !== 'refresh') throw new Error('Wrong token type');
  return payload;
};
