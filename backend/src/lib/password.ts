import argon2 from 'argon2';

/**
 * Argon2id parameters tuned for ~100 ms on a modern CPU.
 * Adjust if your target hardware is slower; never weaken below these.
 */
const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string) => argon2.hash(plain, ARGON_OPTIONS);

export const verifyPassword = (hash: string, plain: string) => argon2.verify(hash, plain);
