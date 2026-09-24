import bcrypt from 'bcryptjs'

const passwordCost = 12

export function hashPassword(password: string) {
  return bcrypt.hash(password, passwordCost)
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}