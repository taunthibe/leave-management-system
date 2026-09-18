import { useEffect, useState } from 'react'
import './App.css'

type ApiStatus = 'checking' | 'online' | 'offline'

const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    const checkApi = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/health`)

        if (!response.ok) {
          throw new Error('API health check failed')
        }

        setApiStatus('online')
      } catch {
        setApiStatus('offline')
      }
    }

    void checkApi()
  }, [])

  const statusText = {
    checking: 'Checking API',
    online: 'API online',
    offline: 'API offline',
  }[apiStatus]

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span>Leave Management System</span>
        </div>

        <span
          className={`status status-${apiStatus}`}
          aria-live="polite"
        >
          {statusText}
        </span>
      </header>

      <section className="hero">
        <p className="eyebrow">Full stack portfolio project</p>
        <h1>Manage employee leave with clarity.</h1>

        <p className="introduction">
          A secure place for employees to submit leave, managers to review
          requests and HR officers to manage policies and balances.
        </p>

        <div className="actions">
          <button type="button">View dashboard</button>
          <a href="#capabilities">Explore capabilities</a>
        </div>
      </section>

      <section className="capabilities" id="capabilities">
        <article className="capability-card">
          <span className="card-number">01</span>
          <h2>Employee self-service</h2>
          <p>Submit requests, check balances and follow approval progress.</p>
        </article>

        <article className="capability-card">
          <span className="card-number">02</span>
          <h2>Manager approvals</h2>
          <p>Review requests and identify overlapping team absences.</p>
        </article>

        <article className="capability-card">
          <span className="card-number">03</span>
          <h2>HR administration</h2>
          <p>Manage employees, policies, holidays, balances and reports.</p>
        </article>
      </section>
    </main>
  )
}

export default App