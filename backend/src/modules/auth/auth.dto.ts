import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = z
  .object({
    email: z.string().email().max(120),
    password: z.string().min(8).max(72),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    role: z.nativeEnum(Role),
    // Optional profile fields (validated in service):
    facultyId: z.string().cuid().optional(),
    departmentId: z.string().cuid().optional(),
    universityId: z.string().min(3).max(40).optional(),
    year: z.number().int().min(1).max(8).optional(),
    specialty: z.string().min(2).max(120).optional(),
    rank: z.enum(['LECTURER', 'ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR']).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email().max(120),
    password: z.string().min(1).max(72),
  })
  .strict();

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
