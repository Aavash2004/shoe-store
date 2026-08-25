import bcrypt from "bcryptjs";

/**
 * Hashes a plain-text password securely using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Verifies a plain-text password against a hashed password.
 */
export async function verifyPassword(
  plainText: string,
  hashed: string
): Promise<boolean> {
  return await bcrypt.compare(plainText, hashed);
}
