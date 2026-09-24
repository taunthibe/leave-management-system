import { Router } from 'express'
import { z } from 'zod'
import { hashPassword } from '../auth/password.js'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorizeRoles } from '../middleware/authorize.js'

const router = Router()

const userRoles = [
  'EMPLOYEE',
  'MANAGER',
  'HR_OFFICER',
  'ADMIN',
] as const

const employeeIdSchema = z.object({
  id: z.string().uuid(),
})

const employeeQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),

  role: z.enum(userRoles).optional(),

  departmentId: z.string().uuid().optional(),

  status: z
    .enum(['active', 'inactive', 'all'])
    .default('all'),
})

const createEmployeeSchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((value) => value.toUpperCase()),

  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(255),

  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((value) => value || null),

  password: z.string().min(12).max(72),

  role: z.enum(userRoles),

  departmentId: z.string().uuid(),

  managerId: z
    .string()
    .uuid()
    .nullable()
    .optional(),
})

const updateEmployeeSchema = z
  .object({
    firstName: z.string().trim().min(2).max(100).optional(),

    lastName: z.string().trim().min(2).max(100).optional(),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(255)
      .optional(),

    phone: z
      .string()
      .trim()
      .max(30)
      .nullable()
      .optional(),

    role: z.enum(userRoles).optional(),

    departmentId: z.string().uuid().optional(),

    managerId: z
      .string()
      .uuid()
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one employee field is required.',
    },
  )

const employeeStatusSchema = z.object({
  isActive: z.boolean(),
})

const employeeSelection = {
  id: true,
  employeeNumber: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,

  department: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },

  manager: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const

router.use(authenticate)
router.use(authorizeRoles('ADMIN'))

router.get('/', async (request, response) => {
  const result = employeeQuerySchema.safeParse(request.query)

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The employee filters are invalid.',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const { search, role, departmentId, status } = result.data

  try {
    const employees = await prisma.employee.findMany({
      where: {
        ...(role ? { role } : {}),

        ...(departmentId
          ? {
              departmentId,
            }
          : {}),

        ...(status === 'active'
          ? {
              isActive: true,
            }
          : status === 'inactive'
            ? {
                isActive: false,
              }
            : {}),

        ...(search
          ? {
              OR: [
                {
                  employeeNumber: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  firstName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },

      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],

      select: employeeSelection,
    })

    response.status(200).json({
      employees,
      total: employees.length,
    })
  } catch (error) {
    console.error('Unable to list employees:', error)

    response.status(500).json({
      code: 'EMPLOYEE_LIST_FAILED',
      message: 'Unable to retrieve employees.',
    })
  }
})

router.get('/:id', async (request, response) => {
  const params = employeeIdSchema.safeParse(request.params)

  if (!params.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The employee ID is invalid.',
    })
    return
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: {
        id: params.data.id,
      },

      select: employeeSelection,
    })

    if (!employee) {
      response.status(404).json({
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'The requested employee was not found.',
      })
      return
    }

    response.status(200).json({
      employee,
    })
  } catch (error) {
    console.error('Unable to retrieve employee:', error)

    response.status(500).json({
      code: 'EMPLOYEE_RETRIEVAL_FAILED',
      message: 'Unable to retrieve the employee.',
    })
  }
})

router.post('/', async (request, response) => {
  const result = createEmployeeSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The employee information is invalid.',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  try {
    const duplicateEmployee =
      await prisma.employee.findFirst({
        where: {
          OR: [
            {
              employeeNumber:
                result.data.employeeNumber,
            },
            {
              email: {
                equals: result.data.email,
                mode: 'insensitive',
              },
            },
          ],
        },

        select: {
          employeeNumber: true,
          email: true,
        },
      })

    if (duplicateEmployee) {
      response.status(409).json({
        code: 'EMPLOYEE_ALREADY_EXISTS',
        message:
          'An employee with this number or email already exists.',
      })
      return
    }

    const department =
      await prisma.department.findUnique({
        where: {
          id: result.data.departmentId,
        },

        select: {
          id: true,
          isActive: true,
        },
      })

    if (!department) {
      response.status(404).json({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'The selected department was not found.',
      })
      return
    }

    if (!department.isActive) {
      response.status(409).json({
        code: 'DEPARTMENT_INACTIVE',
        message:
          'Employees cannot be assigned to an inactive department.',
      })
      return
    }

    if (result.data.managerId) {
      const manager = await prisma.employee.findUnique({
        where: {
          id: result.data.managerId,
        },

        select: {
          id: true,
          role: true,
          isActive: true,
        },
      })

      if (!manager || !manager.isActive) {
        response.status(400).json({
          code: 'INVALID_MANAGER',
          message:
            'The selected manager does not exist or is inactive.',
        })
        return
      }

      if (
        manager.role !== 'MANAGER' &&
        manager.role !== 'ADMIN'
      ) {
        response.status(400).json({
          code: 'INVALID_MANAGER_ROLE',
          message:
            'The selected employee cannot manage other employees.',
        })
        return
      }
    }

    const passwordHash = await hashPassword(
      result.data.password,
    )

    const employee = await prisma.employee.create({
      data: {
        employeeNumber: result.data.employeeNumber,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        email: result.data.email,
        phone: result.data.phone,
        role: result.data.role,
        departmentId: result.data.departmentId,
        managerId: result.data.managerId ?? null,
        passwordHash,
        passwordChangedAt: new Date(),
      },

      select: employeeSelection,
    })

    response.status(201).json({
      message: 'Employee account created successfully.',
      employee,
    })
  } catch (error) {
    console.error('Unable to create employee:', error)

    response.status(500).json({
      code: 'EMPLOYEE_CREATION_FAILED',
      message: 'Unable to create the employee account.',
    })
  }
})

router.patch('/:id', async (request, response) => {
  const params = employeeIdSchema.safeParse(request.params)
  const result = updateEmployeeSchema.safeParse(request.body)

  if (!params.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The employee ID is invalid.',
    })
    return
  }

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The employee information is invalid.',
      errors: result.error.flatten(),
    })
    return
  }

  const authenticatedUser = response.locals.authUser

  try {
    const existingEmployee =
      await prisma.employee.findUnique({
        where: {
          id: params.data.id,
        },
      })

    if (!existingEmployee) {
      response.status(404).json({
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'The requested employee was not found.',
      })
      return
    }

    if (
      authenticatedUser.id === params.data.id &&
      result.data.role &&
      result.data.role !== existingEmployee.role
    ) {
      response.status(409).json({
        code: 'CANNOT_CHANGE_OWN_ROLE',
        message:
          'You cannot change your own administrator role.',
      })
      return
    }

    if (
      result.data.managerId &&
      result.data.managerId === params.data.id
    ) {
      response.status(400).json({
        code: 'SELF_MANAGER_NOT_ALLOWED',
        message:
          'An employee cannot be assigned as their own manager.',
      })
      return
    }

    if (result.data.email) {
      const duplicateEmail =
        await prisma.employee.findFirst({
          where: {
            id: {
              not: params.data.id,
            },

            email: {
              equals: result.data.email,
              mode: 'insensitive',
            },
          },
        })

      if (duplicateEmail) {
        response.status(409).json({
          code: 'EMAIL_ALREADY_EXISTS',
          message:
            'Another employee already uses this email address.',
        })
        return
      }
    }

    if (result.data.departmentId) {
      const department =
        await prisma.department.findUnique({
          where: {
            id: result.data.departmentId,
          },

          select: {
            isActive: true,
          },
        })

      if (!department) {
        response.status(404).json({
          code: 'DEPARTMENT_NOT_FOUND',
          message: 'The selected department was not found.',
        })
        return
      }

      if (!department.isActive) {
        response.status(409).json({
          code: 'DEPARTMENT_INACTIVE',
          message:
            'Employees cannot be assigned to an inactive department.',
        })
        return
      }
    }

    if (result.data.managerId) {
      const manager = await prisma.employee.findUnique({
        where: {
          id: result.data.managerId,
        },

        select: {
          role: true,
          isActive: true,
        },
      })

      if (
        !manager ||
        !manager.isActive ||
        !['MANAGER', 'ADMIN'].includes(manager.role)
      ) {
        response.status(400).json({
          code: 'INVALID_MANAGER',
          message:
            'Select an active manager or administrator.',
        })
        return
      }
    }

    const employee = await prisma.employee.update({
      where: {
        id: params.data.id,
      },

      data: result.data,

      select: employeeSelection,
    })

    response.status(200).json({
      message: 'Employee updated successfully.',
      employee,
    })
  } catch (error) {
    console.error('Unable to update employee:', error)

    response.status(500).json({
      code: 'EMPLOYEE_UPDATE_FAILED',
      message: 'Unable to update the employee.',
    })
  }
})

router.patch('/:id/status', async (request, response) => {
  const params = employeeIdSchema.safeParse(request.params)
  const result = employeeStatusSchema.safeParse(request.body)

  if (!params.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The employee ID is invalid.',
    })
    return
  }

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'A valid employee status is required.',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  const authenticatedUser = response.locals.authUser

  if (
    authenticatedUser.id === params.data.id &&
    !result.data.isActive
  ) {
    response.status(409).json({
      code: 'CANNOT_DEACTIVATE_SELF',
      message:
        'You cannot deactivate your own administrator account.',
    })
    return
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: {
        id: params.data.id,
      },

      select: {
        id: true,
      },
    })

    if (!employee) {
      response.status(404).json({
        code: 'EMPLOYEE_NOT_FOUND',
        message: 'The requested employee was not found.',
      })
      return
    }

    const updatedEmployee = await prisma.employee.update({
      where: {
        id: params.data.id,
      },

      data: {
        isActive: result.data.isActive,

        ...(result.data.isActive
          ? {}
          : {
              tokenVersion: {
                increment: 1,
              },
            }),
      },

      select: employeeSelection,
    })

    response.status(200).json({
      message: result.data.isActive
        ? 'Employee activated successfully.'
        : 'Employee deactivated successfully.',

      employee: updatedEmployee,
    })
  } catch (error) {
    console.error('Unable to change employee status:', error)

    response.status(500).json({
      code: 'EMPLOYEE_STATUS_UPDATE_FAILED',
      message: 'Unable to change the employee status.',
    })
  }
})

export { router as employeeRouter }