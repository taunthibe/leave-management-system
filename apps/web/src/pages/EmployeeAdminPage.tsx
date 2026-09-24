import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
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
  lastLoginAt: string | null
  department: Department
  manager: Manager | null
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

const initialForm = {
  employeeNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'EMPLOYEE' as UserRole,
  departmentId: '',
  managerId: '',
}

function formatRole(role: UserRole) {
  return role
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

export function EmployeeAdminPage() {
  const { user } = useAuth()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<
    DepartmentsResponse['departments']
  >([])

  const [form, setForm] = useState(initialForm)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [changingEmployeeId, setChangingEmployeeId] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const loadData = useCallback(async () => {
    setError('')

    try {
      const [employeeResponse, departmentResponse] =
        await Promise.all([
          fetch(`${apiUrl}/employees`, {
            credentials: 'include',
          }),

          fetch(`${apiUrl}/departments`, {
            credentials: 'include',
          }),
        ])

      const employeeData =
        (await employeeResponse.json()) as
          | EmployeesResponse
          | ErrorResponse

      const departmentData =
        (await departmentResponse.json()) as
          | DepartmentsResponse
          | ErrorResponse

      if (!employeeResponse.ok) {
        const apiError = employeeData as ErrorResponse

        throw new Error(
          apiError.message ?? 'Unable to retrieve employees.',
        )
      }

      if (!departmentResponse.ok) {
        const apiError = departmentData as ErrorResponse

        throw new Error(
          apiError.message ??
            'Unable to retrieve departments.',
        )
      }

      if (
        !('employees' in employeeData) ||
        !('departments' in departmentData)
      ) {
        throw new Error(
          'The server returned an invalid response.',
        )
      }

      setEmployees(employeeData.employees)
      setDepartments(departmentData.departments)

      setForm((current) => {
        if (current.departmentId) {
          return current
        }

        const firstActiveDepartment =
          departmentData.departments.find(
            (department) => department.isActive,
          )

        return {
          ...current,
          departmentId: firstActiveDepartment?.id ?? '',
        }
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load employee management.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const availableManagers = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.isActive &&
          (employee.role === 'MANAGER' ||
            employee.role === 'ADMIN'),
      ),
    [employees],
  )

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return employees.filter((employee) => {
      const matchesSearch =
        !normalizedSearch ||
        employee.employeeNumber
          .toLowerCase()
          .includes(normalizedSearch) ||
        employee.firstName
          .toLowerCase()
          .includes(normalizedSearch) ||
        employee.lastName
          .toLowerCase()
          .includes(normalizedSearch) ||
        employee.email
          .toLowerCase()
          .includes(normalizedSearch)

      const matchesRole =
        roleFilter === 'ALL' ||
        employee.role === roleFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && employee.isActive) ||
        (statusFilter === 'INACTIVE' && !employee.isActive)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [employees, roleFilter, search, statusFilter])

  function updateForm(
    field: keyof typeof initialForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function handleCreateEmployee(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      const response = await fetch(`${apiUrl}/employees`, {
        method: 'POST',
        credentials: 'include',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          employeeNumber: form.employeeNumber,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role: form.role,
          departmentId: form.departmentId,
          managerId: form.managerId || null,
        }),
      })

      const data = (await response.json()) as ErrorResponse

      if (!response.ok) {
        throw new Error(
          data.message ?? 'Unable to create employee.',
        )
      }

      const firstActiveDepartment = departments.find(
        (department) => department.isActive,
      )

      setForm({
        ...initialForm,
        departmentId: firstActiveDepartment?.id ?? '',
      })

      setSuccessMessage(
        'Employee account created successfully.',
      )

      await loadData()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to create employee.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(employee: Employee) {
    const nextStatus = !employee.isActive

    if (
      !window.confirm(
        nextStatus
          ? `Activate ${employee.firstName} ${employee.lastName}?`
          : `Deactivate ${employee.firstName} ${employee.lastName}?`,
      )
    ) {
      return
    }

    setError('')
    setSuccessMessage('')
    setChangingEmployeeId(employee.id)

    try {
      const response = await fetch(
        `${apiUrl}/employees/${employee.id}/status`,
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
            'Unable to change the employee status.',
        )
      }

      setSuccessMessage(
        nextStatus
          ? 'Employee activated successfully.'
          : 'Employee deactivated successfully.',
      )

      await loadData()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to change the employee status.',
      )
    } finally {
      setChangingEmployeeId(null)
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <Link className="admin-brand" to="/dashboard">
            <span>L</span>
            Leaveflow
          </Link>

          <p className="eyebrow">PEOPLE OPERATIONS</p>
          <h1>Build your team.</h1>

          <p>
            Create employee accounts, assign responsibilities
            and control access to the Leaveflow workspace.
          </p>
        </div>

        <div className="admin-header-actions">
          <Link className="admin-back-link" to="/admin">
            Departments
          </Link>

          <Link className="admin-back-link" to="/dashboard">
            ← Dashboard
          </Link>
        </div>
      </header>

      <section className="admin-stat-grid">
        <article>
          <span>Total employees</span>
          <strong>{employees.length}</strong>
        </article>

        <article>
          <span>Active accounts</span>

          <strong>
            {
              employees.filter(
                (employee) => employee.isActive,
              ).length
            }
          </strong>
        </article>

        <article>
          <span>Managers and administrators</span>

          <strong>
            {
              employees.filter(
                (employee) =>
                  employee.role === 'MANAGER' ||
                  employee.role === 'ADMIN',
              ).length
            }
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

      <section className="employee-admin-layout">
        <article className="admin-form-card">
          <div className="admin-section-heading">
            <span>New account</span>
            <h2>Create an employee</h2>

            <p>
              The employee will use the email and password
              entered here to access the system.
            </p>
          </div>

          <form onSubmit={handleCreateEmployee}>
            <div className="employee-form-row">
              <label className="form-field">
                <span>Employee number</span>

                <input
                  type="text"
                  value={form.employeeNumber}
                  onChange={(event) =>
                    updateForm(
                      'employeeNumber',
                      event.target.value,
                    )
                  }
                  placeholder="EMP001"
                  maxLength={30}
                  required
                />
              </label>

              <label className="form-field">
                <span>Role</span>

                <select
                  value={form.role}
                  onChange={(event) =>
                    updateForm('role', event.target.value)
                  }
                  required
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR_OFFICER">
                    HR Officer
                  </option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </label>
            </div>

            <div className="employee-form-row">
              <label className="form-field">
                <span>First name</span>

                <input
                  type="text"
                  value={form.firstName}
                  onChange={(event) =>
                    updateForm('firstName', event.target.value)
                  }
                  maxLength={100}
                  required
                />
              </label>

              <label className="form-field">
                <span>Last name</span>

                <input
                  type="text"
                  value={form.lastName}
                  onChange={(event) =>
                    updateForm('lastName', event.target.value)
                  }
                  maxLength={100}
                  required
                />
              </label>
            </div>

            <label className="form-field">
              <span>Email address</span>

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  updateForm('email', event.target.value)
                }
                autoComplete="off"
                maxLength={255}
                required
              />
            </label>

            <label className="form-field">
              <span>Phone number</span>

              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  updateForm('phone', event.target.value)
                }
                placeholder="Optional"
                maxLength={30}
              />
            </label>

            <label className="form-field">
              <span>Department</span>

              <select
                value={form.departmentId}
                onChange={(event) =>
                  updateForm(
                    'departmentId',
                    event.target.value,
                  )
                }
                required
              >
                <option value="">Select a department</option>

                {departments
                  .filter(
                    (department) => department.isActive,
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
                value={form.managerId}
                onChange={(event) =>
                  updateForm('managerId', event.target.value)
                }
              >
                <option value="">No manager assigned</option>

                {availableManagers.map((manager) => (
                  <option
                    value={manager.id}
                    key={manager.id}
                  >
                    {manager.firstName} {manager.lastName} —{' '}
                    {formatRole(manager.role)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>Initial password</span>

              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  updateForm('password', event.target.value)
                }
                autoComplete="new-password"
                minLength={12}
                maxLength={72}
                required
              />

              <small>
                Use at least 12 characters. Share it privately
                with the employee.
              </small>
            </label>

            <button
              className="admin-primary-button"
              type="submit"
              disabled={
                isSaving ||
                departments.every(
                  (department) => !department.isActive,
                )
              }
            >
              {isSaving
                ? 'Creating employee…'
                : 'Create employee account'}
            </button>
          </form>
        </article>

        <article className="employee-list-card">
          <div className="admin-section-heading">
            <span>Directory</span>
            <h2>Employees</h2>

            <p>
              Search the organisation and manage account access.
            </p>
          </div>

          <div className="employee-filters">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, email or employee number"
            />

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
            >
              <option value="ALL">All roles</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="MANAGER">Managers</option>
              <option value="HR_OFFICER">HR Officers</option>
              <option value="ADMIN">Administrators</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {isLoading ? (
            <div className="admin-empty-state">
              <div className="auth-loader__spinner" />
              <p>Loading employees...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="admin-empty-state">
              <strong>No employees found</strong>
              <p>
                Adjust the filters or create an employee.
              </p>
            </div>
          ) : (
            <div className="employee-list">
              {filteredEmployees.map((employee) => (
                <article
                  className="employee-item"
                  key={employee.id}
                >
                  <div className="employee-avatar">
                    {employee.firstName.charAt(0)}
                    {employee.lastName.charAt(0)}
                  </div>

                  <div className="employee-details">
                    <div className="employee-title">
                      <h3>
                        {employee.firstName}{' '}
                        {employee.lastName}
                      </h3>

                      <span
                        className={
                          employee.isActive
                            ? 'department-status department-status--active'
                            : 'department-status department-status--inactive'
                        }
                      >
                        {employee.isActive
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>

                    <p>
                      {employee.employeeNumber} ·{' '}
                      {employee.email}
                    </p>

                    <small>
                      {formatRole(employee.role)} ·{' '}
                      {employee.department.name}
                      {employee.manager
                        ? ` · Reports to ${employee.manager.firstName} ${employee.manager.lastName}`
                        : ''}
                    </small>
                  </div>

                  <button
                    className="department-action"
                    type="button"
                    disabled={
                      changingEmployeeId === employee.id ||
                      employee.id === user?.id
                    }
                    onClick={() =>
                      handleStatusChange(employee)
                    }
                    title={
                      employee.id === user?.id
                        ? 'You cannot deactivate your own account.'
                        : undefined
                    }
                  >
                    {changingEmployeeId === employee.id
                      ? 'Saving…'
                      : employee.isActive
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