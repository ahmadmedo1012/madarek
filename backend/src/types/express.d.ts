import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: { id: string; role: Role };
    }
  }
}

export {};
