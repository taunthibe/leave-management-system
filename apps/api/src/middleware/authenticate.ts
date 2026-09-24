import type { NextFunction, Request, Response } from 'express'
import { authCookieName } from '../auth/cookies.js'
import { verifyAuthToken } from '../auth/token.js'
import { prisma } from '../lib/prisma.js'

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const token = request.cookies?.[authCookieName]

  if (!token) {
    response.status(401).json({
      code: 'UNAUTHENTICATED',
      message: 'Authentication is required.',
    })
    return
  }

  try {
    const payload = await verifyAuthToken(token)

    const employee = await prisma.employee.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    })

    if (
      !employee ||
      !employee.isActive ||
      employee.tokenVersion !== payload.tokenVersion
    ) {
      response.clearCookie(authCookieName, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      })

      response.status(401).json({
        code: 'INVALID_SESSION',
        message: 'Your session is no longer valid.',
      })
      return
    }

    response.locals.authUser = employee
    next()
  } catch {
    response.clearCookie(authCookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    response.status(401).json({
      code: 'INVALID_SESSION',
      message: 'Your session is invalid or has expired.',
    })
  }
}