import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function AdminPage() {
  const { user } = useAuth()

  return (
    <main className="simple-page">
      <section className="simple-page__card">
        <span className="eyebrow">Administrator workspace</span>
        
        <h1>Administration</h1>

        <p>
        Welcome, {user?.firstName}. You are signed in with
        administrator access.
        </p>

        <p>
          Employee, department and policy management will be
          added here during Section 5.
        </p>

        <Link className="text-link" to="/dashboard">
          Return to dashboard
        </Link>
      </section>
    </main>
  )
}