import { hash, verify } from '@node-rs/argon2';

// OWASP Argon2id baseline (algorithm defaults to Argon2id).
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password).catch(() => false);
}

let dummyHash: Promise<string> | undefined;

/** Burns the same time as a real check so unknown usernames can't be detected by timing. */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(await dummyHash, password);
  return false;
}
