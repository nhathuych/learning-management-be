import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import * as dynamoose from 'dynamoose'
import { clerkMiddleware, requireAuth } from '@clerk/express'
import serverless from 'serverless-http'
import seed from './seed/seedDynamodb'
// ROUTE IMPORT
import courseRouters from './routes/courseRoutes'
import userClerkRouters from './routes/userClerkRoutes'
import transactionRouters from './routes/transactionRoutes'
import userCourseProgressRouters from './routes/userCourseProgressRoutes'

// CONFIGURATIONS
dotenv.config()

const isProduction = process.env.NODE_ENV === 'production'
if (!isProduction) dynamoose.aws.ddb.local()

const app = express()
app.use(express.json())
app.use(helmet())
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }))
app.use(morgan('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())
app.use(clerkMiddleware())

// ROUTES
app.get('/', (req, res) => {
  res.send('hello express!')
})

app.use('/courses', courseRouters)
app.use('/users/clerk', requireAuth(), userClerkRouters)
app.use('/transactions', requireAuth(), transactionRouters)
app.use('/users/course-progress', requireAuth(), userCourseProgressRouters)

// SERVER
const port = process.env.PORT || 3001
if (!isProduction) {
  app.listen(port, () => {
    console.log('Server is running on port', port)
  })
}

// AWS PRODUCTION ENVIRONMENT
const serverlessApp = serverless(app)
export const handler = async (event: any, context: any) => {
  if (event.action === 'seed') {
    await seed()
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data seeded successfully.' })
    }
  } else {
    return serverlessApp(event, context)
  }
}
