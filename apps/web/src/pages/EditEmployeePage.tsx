import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, type UserRole } from '../auth/AuthContext'

type Department = {
  id: string
  code: string
  name: string
  isActive: boolean
}

type Manager = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
}

type Employee = {
  id: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: UserRole
  isActive: boolean
  department: Department
  manager: Manager | null
}

type EmployeeResponse = {
  employee: Employee
}

type EmployeesResponse = {
  employees: Employee[]
  total: number
}

type DepartmentsResponse = {
  departments: Array<
    Department & {
      employeeCount: number
    }
  >
}

type ErrorResponse = {
  code?: string
  message?: string
}

const apiUrl =
  import.meta.env.VITE_API_URL ??
  'http://localhost:4000/api/v1'

export function EditEmployeePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<
    DepartmentsResponse['departments']
  >([])

  const [employeeNumber, setEmployeeNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('EMPLOYEE')
  const [departmentId, setDepartmentId] = useState('')
  const [managerId, setManagerId] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEditor() {
      if (!id) {
        setError('The employee ID is missing.')
        setIsLoading(false)
        return
      }

      try {
        const [
          employeeResponse,
          employeesResponse,
          departmentsResponse,
        ] = await Promise.all([
          fetch(`${apiUrl}/employees/${id}`, {
            credentials: 'include',
          }),

          fetch(`${apiUrl}/employees`, {
            credentials: 'include',
          }),

          fetch(`${apiUrl}/departments`, {
            credentials: 'include',
          }),
        ])

        const employeeData =
          (await employeeResponse.json()) as
            | EmployeeResponse
            | ErrorResponse

        const employeesData =
          (await employeesResponse.json()) as
            | EmployeesResponse
            | ErrorResponse

        const departmentsData =
          (await departmentsResponse.json()) as
            | DepartmentsResponse
            | ErrorResponse

        if (!employeeResponse.ok) {
          const apiError = employeeData as ErrorResponse

          throw new Error(
            apiError.message ?? 'Unable to retrieve employee.',
          )
        }

        if (!employeesResponse.ok) {
          const apiError = employeesData as ErrorResponse

          throw new Error(
            apiError.message ?? 'Unable to retrieve employees.',
          )
        }

        if (!departmentsResponse.ok) {
          const apiError = departmentsData as ErrorResponse

          throw new Error(
            apiError.message ??
              'Unable to retrieve departments.',
          )
        }

        if (
          !('employee' in employeeData) ||
          !('employees' in employeesData) ||
          !('departments' in departmentsData)
        ) {
          throw new Error(
            'The server returned an invalid response.',
          )
        }

        const employee = employeeData.employee

        setEmployeeNumber(employee.employeeNumber)
        setFirstName(employee.firstName)
        setLastName(employee.lastName)
        setEmail(employee.email)
        setPhone(employee.phone ?? '')
        setRole(employee.role)
        setDepartmentId(employee.department.id)
        setManagerId(employee.manager?.id ?? '')

        setEmployees(employeesData.employees)
        setDepartments(departmentsData.departments)
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to open the employee editor.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadEditor()
  }, [id])

  const availableManagers = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.id !== id &&
          employee.isActive &&
          (employee.role === 'MANAGER' ||
            employee.role === 'ADMIN'),
      ),
    [employees, id],
  )

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
        `${apiUrl}/employees/${id}`,
        {
          method: 'PATCH',
          credentials: 'include',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            firstName,
            lastName,
            email,
            phone: phone.trim() || null,
            role,
            departmentId,
            managerId: managerId || null,
          }),
        },
      )

      const data = (await response.json()) as ErrorResponse

      if (!response.ok) {
        throw new Error(
          data.message ?? 'Unable to update employee.',
        )
      }

      navigate('/admin/employees', {
        replace: true,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update employee.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="auth-loader">
        <div className="auth-loader__spinner" />
        <p>Opening employee profile...</p>
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

          <p className="eyebrow">EMPLOYEE PROFILE</p>
          <h1>Edit employee.</h1>

          <p>
            Update organisational information and system access
            for {employeeNumber}.
          </p>
        </div>

        <Link
          className="admin-back-link"
          to="/admin/employees"
        >
          ← Employee directory
        </Link>
      </header>

      {error && (
        <div className="admin-message admin-message--error">
          <span>!</span>
          {error}
        </div>
      )}

      {!error || employeeNumber ? (
        <section className="employee-editor">
          <div className="employee-editor__identity">
            <span>
              {firstName.charAt(0)}
              {lastName.charAt(0)}
            </span>

            <div>
              <small>{employeeNumber}</small>

              <h2>
                {firstName} {lastName}
              </h2>

              <p>{email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="employee-form-row">
              <label className="form-field">
                <span>First name</span>

                <input
                  type="text"
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>

              <label className="form-field">
                <span>Last name</span>

                <input
                  type="text"
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
            </div>

            <label className="form-field">
              <span>Email address</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                maxLength={255}
                required
              />
            </label>

            <label className="form-field">
              <span>Phone number</span>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="Optional"
                maxLength={30}
              />
            </label>

            <label className="form-field">
              <span>Role</span>

              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as UserRole)
                }
                disabled={id === user?.id}
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR_OFFICER">HR Officer</option>
                <option value="ADMIN">Administrator</option>
              </select>

              {id === user?.id && (
                <small>
                  You cannot change your own administrator role.
                </small>
              )}
            </label>

            <label className="form-field">
              <span>Department</span>

              <select
                value={departmentId}
                onChange={(event) =>
                  setDepartmentId(event.target.value)
                }
                required
              >
                {departments
                  .filter(
                    (department) =>
                      department.isActive ||
                      department.id === departmentId,
                  )
                  .map((department) => (
                    <option
                      value={department.id}
                      key={department.id}
                    >
                      {department.code} — {department.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="form-field">
              <span>Manager</span>

              <select
                value={managerId}
                onChange={(event) =>
                  setManagerId(event.target.value)
                }
              >
                <option value="">No manager assigned</option>

                {availableManagers.map((manager) => (
                  <option
                    value={manager.id}
                    key={manager.id}
                  >
                    {manager.firstName} {manager.lastName} —{' '}
                    {manager.employeeNumber}
                  </option>
                ))}
              </select>
            </label>

            <div className="employee-editor__actions">
              <Link
                className="secondary-button"
                to="/admin/employees"
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
                  : 'Save employee changes'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}