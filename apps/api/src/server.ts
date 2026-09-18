import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

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

app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'leave-management-api',
    timestamp: new Date().toISOString(),
  })
})

app.use((_request, response) => {
  response.status(404).json({
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
  })
})

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`)
})