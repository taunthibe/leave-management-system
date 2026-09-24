import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
  if (!user) {
    return
  }

  const destination =
    user.role === 'ADMIN' ? '/admin' : '/dashboard'

  navigate(destination, {
    replace: true,
  })
}, [navigate, user])

  async function handleSubmit(
  event: FormEvent<HTMLFormElement>,
) {
  event.preventDefault()

  setError('')
  setIsSubmitting(true)

  try {
    const authenticatedUser = await login({
      email,
      password,
    })

    const destination =
      authenticatedUser.role === 'ADMIN'
        ? '/admin'
        : '/dashboard'

    navigate(destination, {
      replace: true,
    })
  } catch (loginError) {
    setError(
      loginError instanceof Error
        ? loginError.message
        : 'Unable to log in.',
    )
  } finally {
    setIsSubmitting(false)
  }
}

  return (
    <main className="login-page">
      <section className="login-story">
        <a className="brand-mark" href="/">
          <span className="brand-mark__symbol">L</span>
          <span>Leaveflow</span>
        </a>

        <div className="login-story__content">
          <p className="eyebrow">WORK, REST, RETURN</p>

          <h1>
            Leave management
            <span> without the friction.</span>
          </h1>

          <p className="login-story__description">
            One secure workspace for requests, approvals,
            balances and workplace policies.
          </p>

          <div className="login-story__metrics">
            <div>
              <strong>01</strong>
              <span>Clear requests</span>
            </div>

            <div>
              <strong>02</strong>
              <span>Faster decisions</span>
            </div>

            <div>
              <strong>03</strong>
              <span>Visible balances</span>
            </div>
          </div>
        </div>

        <p className="login-story__footer">
          Built for employees, managers and people teams.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__heading">
            <span className="status-chip">
              <span />
              Secure workspace
            </span>

            <h2>Welcome back</h2>

            <p>
              Sign in with the account registered for you.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Email address</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="name@organisation.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="form-field">
              <span>Password</span>

              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            {error && (
              <div className="form-error" role="alert">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? 'Opening workspace…'
                  : 'Enter workspace'}
              </span>

              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="login-card__help">
            <span>Cannot access your account?</span>
            <p>Contact your HR officer or system administrator.</p>
          </div>
        </div>
      </section>
    </main>
  )
}