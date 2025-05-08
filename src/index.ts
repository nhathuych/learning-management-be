import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import * as dynamoose from 'dynamoose'
import { clerkMiddleware, requireAuth } from '@clerk/express'
// ROUTE IMPORT
import courseRouters from './routes/courseRoutes'
import userClerkRouters from './routes/userClerkRoutes'

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

// SERVER
const port = process.env.PORT || 3001
if (!isProduction) {
  app.listen(port, () => {
    console.log('Server is running on port', port)
  })
}
