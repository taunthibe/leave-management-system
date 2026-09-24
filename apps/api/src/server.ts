import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { prisma } from './lib/prisma.js'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth.routes.js'
import { departmentRouter } from './routes/department.routes.js'
import { employeeRouter } from './routes/employee.routes.js'

const app = express()
const port = Number(process.env.PORT ?? 4000)
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'

app.use(helmet())
app.use(
  cors({
    origin: webOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Tests whether the Express API is running.
app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'leave-management-api',
    timestamp: new Date().toISOString(),
  })
})

// Tests whether the API can communicate with PostgreSQL.
app.get('/api/v1/health/database', async (_request, response) => {
  try {
    const connection = await prisma.$queryRaw<
      Array<{
        database_name: string
        connected_user: string
      }>
    >`
      SELECT
        current_database() AS database_name,
        current_user AS connected_user
    `

    response.status(200).json({
      status: 'ok',
      database: connection[0]?.database_name,
      user: connection[0]?.connected_user,
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    response.status(503).json({
      status: 'error',
      message: 'Database connection failed',
    })
  }
})
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/departments', departmentRouter)
app.use('/api/v1/employees', employeeRouter)  

// This must remain after every valid route.
app.use((_request, response) => {
  response.status(404).json({
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
  })
})

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`)
})