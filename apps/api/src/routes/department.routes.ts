import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/authenticate.js'
import { authorizeRoles } from '../middleware/authorize.js'

const router = Router()

const departmentIdSchema = z.object({
  id: z.string().uuid(),
})

const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .transform((value) => value.toUpperCase()),

  name: z.string().trim().min(2).max(100),

  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || null),
})

const updateDepartmentSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(20)
      .transform((value) => value.toUpperCase())
      .optional(),

    name: z.string().trim().min(2).max(100).optional(),

    description: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: 'At least one department field is required.',
    },
  )

const departmentStatusSchema = z.object({
  isActive: z.boolean(),
})

router.use(authenticate)
router.use(authorizeRoles('ADMIN'))

router.get('/', async (_request, response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        name: 'asc',
      },

      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })

    response.status(200).json({
      departments: departments.map((department) => ({
        id: department.id,
        code: department.code,
        name: department.name,
        description: department.description,
        isActive: department.isActive,
        employeeCount: department._count.employees,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Unable to list departments:', error)

    response.status(500).json({
      code: 'DEPARTMENT_LIST_FAILED',
      message: 'Unable to retrieve departments.',
    })
  }
})

router.get('/:id', async (request, response) => {
  const params = departmentIdSchema.safeParse(request.params)

  if (!params.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The department ID is invalid.',
    })
    return
  }

  try {
    const department = await prisma.department.findUnique({
      where: {
        id: params.data.id,
      },

      include: {
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })

    if (!department) {
      response.status(404).json({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'The requested department was not found.',
      })
      return
    }

    response.status(200).json({
      department: {
        id: department.id,
        code: department.code,
        name: department.name,
        description: department.description,
        isActive: department.isActive,
        employeeCount: department._count.employees,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
      },
    })
  } catch (error) {
    console.error('Unable to retrieve department:', error)

    response.status(500).json({
      code: 'DEPARTMENT_RETRIEVAL_FAILED',
      message: 'Unable to retrieve the department.',
    })
  }
})

router.post('/', async (request, response) => {
  const result = createDepartmentSchema.safeParse(request.body)

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The department information is invalid.',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  try {
    const existingDepartment =
      await prisma.department.findFirst({
        where: {
          OR: [
            {
              code: result.data.code,
            },
            {
              name: {
                equals: result.data.name,
                mode: 'insensitive',
              },
            },
          ],
        },

        select: {
          code: true,
          name: true,
        },
      })

    if (existingDepartment) {
      response.status(409).json({
        code: 'DEPARTMENT_ALREADY_EXISTS',
        message:
          'A department with this code or name already exists.',
      })
      return
    }

    const department = await prisma.department.create({
      data: {
        code: result.data.code,
        name: result.data.name,
        description: result.data.description,
      },
    })

    response.status(201).json({
      message: 'Department created successfully.',
      department: {
        ...department,
        employeeCount: 0,
      },
    })
  } catch (error) {
    console.error('Unable to create department:', error)

    response.status(500).json({
      code: 'DEPARTMENT_CREATION_FAILED',
      message: 'Unable to create the department.',
    })
  }
})

router.patch('/:id', async (request, response) => {
  const params = departmentIdSchema.safeParse(request.params)
  const result = updateDepartmentSchema.safeParse(request.body)

  if (!params.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The department ID is invalid.',
    })
    return
  }

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The department information is invalid.',
      errors: result.error.flatten(),
    })
    return
  }

  try {
    const department = await prisma.department.findUnique({
      where: {
        id: params.data.id,
      },
    })

    if (!department) {
      response.status(404).json({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'The requested department was not found.',
      })
      return
    }

    const duplicateDepartment =
      await prisma.department.findFirst({
        where: {
          id: {
            not: params.data.id,
          },

          OR: [
            ...(result.data.code
              ? [{ code: result.data.code }]
              : []),

            ...(result.data.name
              ? [
                  {
                    name: {
                      equals: result.data.name,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
          ],
        },
      })

    if (duplicateDepartment) {
      response.status(409).json({
        code: 'DEPARTMENT_ALREADY_EXISTS',
        message:
          'Another department already uses this code or name.',
      })
      return
    }

    const updatedDepartment = await prisma.department.update({
      where: {
        id: params.data.id,
      },

      data: result.data,
    })

    response.status(200).json({
      message: 'Department updated successfully.',
      department: updatedDepartment,
    })
  } catch (error) {
    console.error('Unable to update department:', error)

    response.status(500).json({
      code: 'DEPARTMENT_UPDATE_FAILED',
      message: 'Unable to update the department.',
    })
  }
})

router.patch('/:id/status', async (request, response) => {
  const params = departmentIdSchema.safeParse(request.params)
  const result = departmentStatusSchema.safeParse(request.body)

  if (!params.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'The department ID is invalid.',
    })
    return
  }

  if (!result.success) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'A valid department status is required.',
      errors: result.error.flatten().fieldErrors,
    })
    return
  }

  try {
    const department = await prisma.department.findUnique({
      where: {
        id: params.data.id,
      },

      include: {
        _count: {
          select: {
            employees: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    })

    if (!department) {
      response.status(404).json({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'The requested department was not found.',
      })
      return
    }

    if (
      !result.data.isActive &&
      department._count.employees > 0
    ) {
      response.status(409).json({
        code: 'DEPARTMENT_HAS_ACTIVE_EMPLOYEES',
        message:
          'Move or deactivate the active employees before deactivating this department.',
      })
      return
    }

    const updatedDepartment = await prisma.department.update({
      where: {
        id: params.data.id,
      },

      data: {
        isActive: result.data.isActive,
      },
    })

    response.status(200).json({
      message: result.data.isActive
        ? 'Department activated successfully.'
        : 'Department deactivated successfully.',

      department: updatedDepartment,
    })
  } catch (error) {
    console.error(
      'Unable to change department status:',
      error,
    )

    response.status(500).json({
      code: 'DEPARTMENT_STATUS_UPDATE_FAILED',
      message: 'Unable to change the department status.',
    })
  }
})

export { router as departmentRouter }