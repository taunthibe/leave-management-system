import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import {
  authCookieName,
  authCookieOptions,
} from '../auth/cookies.js'
import {
  hashPassword,
  verifyPassword,
} from '../auth/password.js'
import { createAuthToken } from '../auth/token.js'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
})

const initialSetupSchema = z.object({
  setupSecret: z.string().min(1),

  department: z.object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .transform((value) => value.toUpperCase()),

    name: z.string().trim().min(2).max(100),
  }),

  administrator: z.object({
    employeeNumber: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .transform((value) => value.toUpperCase()),

    firstName: z.string().trim().min(2).max(100),
    lastName: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(12).max(72),
  }),
})

function setupSecretsMatch(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

const setupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_SETUP_ATTEMPTS',
    message: 'Too many setup attempts. Please try again later.',
  },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts. Please try again later.',
  },
})

router.get('/setup/status', async (_request, response) => {
  const employeeCount = await prisma.employee.count()

  response.status(200).json({
    setupRequired: employeeCount === 0,
  })
})

router.post('/setup', setupLimiter, async (request, response) => {
  const result = initialSetupSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The initial setup information is invalid.',
      errors: result.error.flatten(),
    })
    return
  }

  const configuredSecret = process.env.INITIAL_SETUP_SECRET

  if (
    !configuredSecret ||
    !setupSecretsMatch(
      result.data.setupSecret,
      configuredSecret,
    )
  ) {
    response.status(403).json({
      code: 'INVALID_SETUP_SECRET',
      message: 'The setup secret is invalid.',
    })
    return
  }

  const employeeCount = await prisma.employee.count()

  if (employeeCount > 0) {
    response.status(409).json({
      code: 'SETUP_ALREADY_COMPLETED',
      message: 'The initial system setup has already been completed.',
    })
    return
  }

  const passwordHash = await hashPassword(
    result.data.administrator.password,
  )

  const administrator = await prisma.$transaction(
    async (transaction) => {
      const department = await transaction.department.create({
        data: {
          code: result.data.department.code,
          name: result.data.department.name,
        },
      })

      return transaction.employee.create({
        data: {
          employeeNumber:
            result.data.administrator.employeeNumber,

          firstName: result.data.administrator.firstName,
          lastName: result.data.administrator.lastName,
          email: result.data.administrator.email,

          passwordHash,
          passwordChangedAt: new Date(),

          role: 'ADMIN',
          departmentId: department.id,
        },

        select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
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
    },
  )

  const token = await createAuthToken({
    sub: administrator.id,
    role: administrator.role,
    tokenVersion: administrator.tokenVersion,
  })

  response.cookie(
    authCookieName,
    token,
    authCookieOptions,
  )

  response.status(201).json({
    message: 'Initial administrator created successfully.',

    user: {
      id: administrator.id,
      employeeNumber: administrator.employeeNumber,
      firstName: administrator.firstName,
      lastName: administrator.lastName,
      email: administrator.email,
      role: administrator.role,
      department: administrator.department,
    },
  })
})

router.post('/login', loginLimiter, async (request, response) => {
  const result = loginSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'A valid email address and password are required.',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const employee = await prisma.employee.findUnique({
    where: {
      email: result.data.email,
    },

    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
      tokenVersion: true,
    },
  })

  if (
    !employee ||
    !employee.isActive ||
    !employee.passwordHash
  ) {
    response.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: 'The email address or password is incorrect.',
    })
    return
  }

  const passwordIsValid = await verifyPassword(
    result.data.password,
    employee.passwordHash,
  )

  if (!passwordIsValid) {
    response.status(401).json({
      code: 'INVALID_CREDENTIALS',
      message: 'The email address or password is incorrect.',
    })
    return
  }

  const token = await createAuthToken({
    sub: employee.id,
    role: employee.role,
    tokenVersion: employee.tokenVersion,
  })

  await prisma.employee.update({
    where: {
      id: employee.id,
    },

    data: {
      lastLoginAt: new Date(),
    },
  })

  response.cookie(
    authCookieName,
    token,
    authCookieOptions,
  )

  response.status(200).json({
    user: {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
    },
  })
})

router.post('/logout', (_request, response) => {
  response.clearCookie(authCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  response.status(200).json({
    message: 'Logged out successfully.',
  })
})

router.get('/me', authenticate, (_request, response) => {
  const user = response.locals.authUser

  response.status(200).json({
    user: {
      id: user.id,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  })
})

export { router as authRouter }