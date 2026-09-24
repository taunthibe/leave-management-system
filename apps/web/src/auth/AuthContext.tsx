import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type UserRole =
  | 'EMPLOYEE'
  | 'MANAGER'
  | 'HR_OFFICER'
  | 'ADMIN'

export type AuthUser = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  department: {
    id: string
    code: string
    name: string
  } | null
}

type LoginCredentials = {
  email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
}

type AuthProviderProps = {
  children: ReactNode
}

type UserResponse = {
  user: AuthUser
}

type ErrorResponse = {
  code?: string
  message?: string
}

const apiUrl =
  import.meta.env.VITE_API_URL ??
  'http://localhost:4000/api/v1'

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      try {
        const response = await fetch(`${apiUrl}/auth/me`, {
          credentials: 'include',
        })

        if (!response.ok) {
          if (isMounted) {
            setUser(null)
          }

          return
        }

        const data = (await response.json()) as UserResponse

        if (isMounted) {
          setUser(data.user)
        }
      } catch {
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  async function login(credentials: LoginCredentials) {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    const data = (await response.json()) as
      | UserResponse
      | ErrorResponse

    if (!response.ok) {
      const error = data as ErrorResponse

      throw new Error(
        error.message ?? 'Unable to sign in. Please try again.',
      )
    }

    if (!('user' in data)) {
      throw new Error('The server returned an invalid response.')
    }

    setUser(data.user)
    return data.user
  }

  async function logout() {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth must be used inside an AuthProvider.',
    )
  }

  return context
}