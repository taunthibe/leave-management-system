import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { RoleRoute } from './auth/RoleRoute'
import { AdminPage } from './pages/AdminPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { EmployeeAdminPage } from './pages/EmployeeAdminPage'
import { EditEmployeePage } from './pages/EditEmployeePage'
import { EditDepartmentPage } from './pages/EditDepartmentPage'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminPage />} />

          <Route
            path="/admin/departments/:id/edit"
            element={<EditDepartmentPage />}
          />

          <Route
            path="/admin/employees"
            element={<EmployeeAdminPage />}
          />

          <Route
            path="/admin/employees/:id/edit"
            element={<EditEmployeePage />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App