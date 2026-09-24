import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

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

type DepartmentResponse = {
  department: Department
}

type ErrorResponse = {
  code?: string
  message?: string
}

const apiUrl =
  import.meta.env.VITE_API_URL ??
  'http://localhost:4000/api/v1'

export function EditDepartmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [employeeCount, setEmployeeCount] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDepartment() {
      if (!id) {
        setError('The department ID is missing.')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${apiUrl}/departments/${id}`,
          {
            credentials: 'include',
          },
        )

        const data = (await response.json()) as
          | DepartmentResponse
          | ErrorResponse

        if (!response.ok) {
          const apiError = data as ErrorResponse

          throw new Error(
            apiError.message ??
              'Unable to retrieve the department.',
          )
        }

        if (!('department' in data)) {
          throw new Error(
            'The server returned an invalid response.',
          )
        }

        setCode(data.department.code)
        setName(data.department.name)
        setDescription(data.department.description ?? '')
        setEmployeeCount(data.department.employeeCount)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to open the department editor.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadDepartment()
  }, [id])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!id) {
      return
    }

    setError('')
    setIsSaving(true)

    try {
      const response = await fetch(
        `${apiUrl}/departments/${id}`,
        {
          method: 'PATCH',
          credentials: 'include',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            code,
            name,
            description: description.trim() || null,
          }),
        },
      )

      const data = (await response.json()) as ErrorResponse

      if (!response.ok) {
        throw new Error(
          data.message ?? 'Unable to update the department.',
        )
      }

      navigate('/admin', {
        replace: true,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update the department.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="auth-loader">
        <div className="auth-loader__spinner" />
        <p>Opening department...</p>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <Link className="admin-brand" to="/dashboard">
            <span>L</span>
            Leaveflow
          </Link>

          <p className="eyebrow">ORGANISATIONAL UNIT</p>
          <h1>Edit department.</h1>

          <p>
            Keep department information accurate for employee
            assignments and future leave workflows.
          </p>
        </div>

        <Link className="admin-back-link" to="/admin">
          ← Departments
        </Link>
      </header>

      {error && (
        <div className="admin-message admin-message--error">
          <span>!</span>
          {error}
        </div>
      )}

      {!error || code ? (
        <section className="employee-editor">
          <div className="employee-editor__identity">
            <span>{code.slice(0, 3)}</span>

            <div>
              <small>DEPARTMENT</small>
              <h2>{name}</h2>

              <p>
                {employeeCount}{' '}
                {employeeCount === 1
                  ? 'registered employee'
                  : 'registered employees'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Department code</span>

              <input
                type="text"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value)
                }
                minLength={2}
                maxLength={20}
                required
              />

              <small>
                Codes are automatically stored in uppercase.
              </small>
            </label>

            <label className="form-field">
              <span>Department name</span>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
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
                rows={5}
                maxLength={500}
                placeholder="Describe the department's responsibilities"
              />
            </label>

            <div className="employee-editor__actions">
              <Link
                className="secondary-button"
                to="/admin"
              >
                Cancel
              </Link>

              <button
                className="admin-primary-button"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Saving changes…'
                  : 'Save department changes'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}