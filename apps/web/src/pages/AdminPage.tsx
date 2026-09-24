import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

type Department = {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  employeeCount: number
  createdAt: string
  updatedAt: string
}

type DepartmentListResponse = {
  departments: Department[]
}

type ErrorResponse = {
  code?: string
  message?: string
}

const apiUrl =
  import.meta.env.VITE_API_URL ??
  'http://localhost:4000/api/v1'

export function AdminPage() {
  const { user } = useAuth()

  const [departments, setDepartments] = useState<Department[]>(
    [],
  )

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [changingDepartmentId, setChangingDepartmentId] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadDepartments = useCallback(async () => {
    setError('')

    try {
      const response = await fetch(`${apiUrl}/departments`, {
        credentials: 'include',
      })

      const data = (await response.json()) as
        | DepartmentListResponse
        | ErrorResponse

      if (!response.ok) {
        const errorData = data as ErrorResponse

        throw new Error(
          errorData.message ??
            'Unable to retrieve departments.',
        )
      }

      if (!('departments' in data)) {
        throw new Error(
          'The server returned an invalid response.',
        )
      }

      setDepartments(data.departments)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to retrieve departments.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDepartments()
  }, [loadDepartments])

  async function handleCreateDepartment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      const response = await fetch(`${apiUrl}/departments`, {
        method: 'POST',
        credentials: 'include',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          code,
          name,
          description,
        }),
      })

      const data = (await response.json()) as ErrorResponse

      if (!response.ok) {
        throw new Error(
          data.message ?? 'Unable to create department.',
        )
      }

      setCode('')
      setName('')
      setDescription('')

      setSuccessMessage(
        'Department created successfully.',
      )

      await loadDepartments()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create department.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(
    department: Department,
  ) {
    const nextStatus = !department.isActive

    if (
      !window.confirm(
        nextStatus
          ? `Activate ${department.name}?`
          : `Deactivate ${department.name}?`,
      )
    ) {
      return
    }

    setError('')
    setSuccessMessage('')
    setChangingDepartmentId(department.id)

    try {
      const response = await fetch(
        `${apiUrl}/departments/${department.id}/status`,
        {
          method: 'PATCH',
          credentials: 'include',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            isActive: nextStatus,
          }),
        },
      )

      const data = (await response.json()) as ErrorResponse

      if (!response.ok) {
        throw new Error(
          data.message ??
            'Unable to change the department status.',
        )
      }

      setSuccessMessage(
        nextStatus
          ? 'Department activated successfully.'
          : 'Department deactivated successfully.',
      )

      await loadDepartments()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to change the department status.',
      )
    } finally {
      setChangingDepartmentId(null)
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">ADMINISTRATOR WORKSPACE</p>
          <h1>Shape your organisation.</h1>

          <p>
            Welcome, {user?.firstName}. Create and manage the
            departments used throughout the leave system.
          </p>
        </div>

        <div className="admin-header-actions">
            <Link
                className="admin-back-link"
                to="/admin/employees"
            >
                Manage employees
            </Link>

            <Link className="admin-back-link" to="/dashboard">
                ← Back to Dashboard
            </Link>
        </div>
      </header>

      <section className="admin-stat-grid">
        <article>
          <span>Total departments</span>
          <strong>{departments.length}</strong>
        </article>

        <article>
          <span>Active departments</span>

          <strong>
            {
              departments.filter(
                (department) => department.isActive,
              ).length
            }
          </strong>
        </article>

        <article>
          <span>Registered employees</span>

          <strong>
            {departments.reduce(
              (total, department) =>
                total + department.employeeCount,
              0,
            )}
          </strong>
        </article>
      </section>

      {error && (
        <div className="admin-message admin-message--error">
          <span>!</span>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="admin-message admin-message--success">
          <span>✓</span>
          {successMessage}
        </div>
      )}

      <section className="admin-layout">
        <article className="admin-form-card">
          <div className="admin-section-heading">
            <span>New department</span>
            <h2>Add an organisational unit</h2>

            <p>
              Departments group employees and will later help
              route leave requests to the correct managers.
            </p>
          </div>

          <form onSubmit={handleCreateDepartment}>
            <label className="form-field">
              <span>Department code</span>

              <input
                type="text"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value)
                }
                placeholder="Example: IT"
                minLength={2}
                maxLength={20}
                required
              />
            </label>

            <label className="form-field">
              <span>Department name</span>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Example: Information Technology"
                minLength={2}
                maxLength={100}
                required
              />
            </label>

            <label className="form-field">
              <span>Description</span>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Briefly explain this department's purpose"
                maxLength={500}
                rows={4}
              />
            </label>

            <button
              className="admin-primary-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? 'Creating department…'
                : 'Create department'}
            </button>
          </form>
        </article>

        <article className="department-list-card">
          <div className="admin-section-heading">
            <span>Organisation</span>
            <h2>Departments</h2>

            <p>
              Review organisational units and control whether
              they are available for future employee assignments.
            </p>
          </div>

          {isLoading ? (
            <div className="admin-empty-state">
              <div className="auth-loader__spinner" />
              <p>Loading departments...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="admin-empty-state">
              <strong>No departments yet</strong>
              <p>
                Use the form to create your first department.
              </p>
            </div>
          ) : (
            <div className="department-list">
              {departments.map((department) => (
                <article
                  className="department-item"
                  key={department.id}
                >
                  <div className="department-code">
                    {department.code.slice(0, 3)}
                  </div>

                  <div className="department-details">
                    <div className="department-title">
                      <h3>{department.name}</h3>

                      <span
                        className={
                          department.isActive
                            ? 'department-status department-status--active'
                            : 'department-status department-status--inactive'
                        }
                      >
                        {department.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>

                    <p>
                      {department.description ??
                        'No description provided.'}
                    </p>

                    <small>
                      {department.employeeCount}{' '}
                      {department.employeeCount === 1
                        ? 'employee'
                        : 'employees'}
                    </small>
                  </div>

                  <button
                    className="department-action"
                    type="button"
                    disabled={
                      changingDepartmentId === department.id
                    }
                    onClick={() =>
                      handleStatusChange(department)
                    }
                  >
                    {changingDepartmentId === department.id
                      ? 'Saving…'
                      : department.isActive
                        ? 'Deactivate'
                        : 'Activate'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}