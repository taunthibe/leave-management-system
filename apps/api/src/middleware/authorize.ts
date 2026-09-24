import type { NextFunction, Request, Response } from 'express'
import type { AuthRole } from '../auth/token.js'

export function authorizeRoles(...allowedRoles: AuthRole[]) {
  return (
    _request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    const user = response.locals.authUser

    if (!user) {
      response.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
      })
      return
    }

    if (!allowedRoles.includes(user.role)) {
      response.status(403).json({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      })
      return
    }

    next()
  }
}