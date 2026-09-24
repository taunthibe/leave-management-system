import { jwtVerify, SignJWT } from 'jose'
import { z } from 'zod'

const issuer = 'leave-management-api'
const audience = 'leave-management-web'

export const authTokenSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(['EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'ADMIN']),
  tokenVersion: z.number().int().nonnegative(),
})

export type AuthTokenPayload = z.infer<typeof authTokenSchema>

export type AuthRole = AuthTokenPayload['role']

function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET

  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_TOKEN_SECRET must contain at least 32 characters',
    )
  }

  return new TextEncoder().encode(secret)
}

export function createAuthToken(payload: AuthTokenPayload) {
  return new SignJWT({
    role: payload.role,
    tokenVersion: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(process.env.AUTH_TOKEN_EXPIRES_IN ?? '8h')
    .sign(getTokenSecret())
}

export async function verifyAuthToken(token: string) {
  const result = await jwtVerify(token, getTokenSecret(), {
    algorithms: ['HS256'],
    issuer,
    audience,
  })

  return authTokenSchema.parse(result.payload)
}