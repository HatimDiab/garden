import { hash, verify } from "@node-rs/argon2";

const opts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, opts);
}

export async function verifyPassword(
  hashValue: string,
  password: string,
): Promise<boolean> {
  return verify(hashValue, password, opts);
}

/**
 * Argon2id hash of a discarded random string. Verifying against this when a
 * username does not exist makes the "no such user" path cost the same as the
 * "wrong password" path, so response time no longer reveals which usernames
 * are real. The value is deliberately unguessable and matches no password.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$QdXiAbc/vEZ+LIPCC6p3yg$4S1Vg3DgMZ0rzLkJya7wXiLaHkwybZjjK+8xfEK4fy8";

/** Burn the same work as a real verify, then always fail. */
export async function verifyDummyPassword(password: string): Promise<false> {
  await verify(DUMMY_HASH, password, opts).catch(() => false);
  return false;
}
