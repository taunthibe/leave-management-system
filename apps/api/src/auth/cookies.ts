import type { CookieOptions } from 'express'

export const authCookieName = 'lms_session'

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
}