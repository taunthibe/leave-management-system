import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type UserRole } from './AuthContext'

type RoleRouteProps = {
  allowedRoles: UserRole[]
}

export function RoleRoute({
  allowedRoles,
}: RoleRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="auth-loader">
        <div
          className="auth-loader__spinner"
          aria-hidden="true"
        />

        <p>Checking your permissions...</p>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}