import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  async function handleLogout() {
    await logout()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-mark brand-mark--light">
          <span className="brand-mark__symbol">L</span>
          <span>Leaveflow</span>
        </div>

        <nav>
          <Link className="active" to="/dashboard">
            <span>◈</span>
            Overview
          </Link>

          <a href="#requests">
            <span>◇</span>
            Leave requests
          </a>

          <a href="#people">
            <span>◌</span>
            People
          </a>

          <a href="#policies">
            <span>⌁</span>
            Policies
          </a>

          {user.role === 'ADMIN' && (
            <Link to="/admin">
              <span>✦</span>
              Administration
            </Link>
          )}
        </nav>

        <button
          className="sidebar-logout"
          type="button"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>

            <h1>
              Good to see you, {user.firstName}.
            </h1>
          </div>

          <div className="user-pill">
            <span>
              {user.firstName.charAt(0)}
              {user.lastName.charAt(0)}
            </span>

            <div>
              <strong>
                {user.firstName} {user.lastName}
              </strong>

              <small>{formatRole(user.role)}</small>
            </div>
          </div>
        </header>

        <section className="welcome-panel" id="overview">
          <div>
            <span className="status-chip status-chip--dark">
              Authenticated securely
            </span>

            <h2>Your dashboard foundation is ready.</h2>

            <p>
              Upcoming sections will add employee management,
              leave balances, requests, approvals and reporting.
            </p>
          </div>

          <div className="welcome-panel__shape">
            <span>{user.department?.code ?? 'LMS'}</span>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-card coral-card">
            <span>Identity</span>
            <strong>{user.employeeNumber}</strong>
            <p>Your unique employee number</p>
          </article>

          <article className="dashboard-card mint-card">
            <span>Department</span>

            <strong>
              {user.department?.name ?? 'Not assigned'}
            </strong>

            <p>Your organisational home</p>
          </article>

          <article className="dashboard-card violet-card">
            <span>Access level</span>
            <strong>{formatRole(user.role)}</strong>
            <p>Controls the actions available to you</p>
          </article>
        </section>
      </section>
    </main>
  )
}