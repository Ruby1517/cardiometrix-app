import bcrypt from 'bcryptjs';

export async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

export async function comparePassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}