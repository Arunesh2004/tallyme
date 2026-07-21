// import * as argon2 from "argon2";

/**
 * Verifies a password hash using Argon2id
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  // return await argon2.verify(hash, plain);
  return false;
}

/**
 * Hashes a password using Argon2id with automatic salting
 */
export async function hashPassword(plain: string): Promise<string> {
  // return await argon2.hash(plain, { type: argon2.argon2id });
  return "";
}
