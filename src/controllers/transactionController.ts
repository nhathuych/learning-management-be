import Stripe from 'stripe'
import dotenv from 'dotenv'
import { Request, Response } from 'express'
import dynamoose from 'dynamoose'
import Course from '../models/courseModel'
import Transaction from '../models/transactionModel'
import UserCourseProgress from '../models/userCourseProgressModel'

dotenv.config()

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required but wasn't found in env variables.")

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const listTransactions = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.query
  const transactions = userId ? await Transaction.query('userId').eq(userId).exec() : await Transaction.scan().exec()

  res.json({ data: transactions, message: 'Transactions retrieved successfully.' })
}

export const createStripePaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    let { amount } = req.body
    if (!amount || amount <= 0) amount = 50

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      }
    })

    res.json({
      data: { clientSecret: paymentIntent.client_secret },
      message: ''
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ message: 'Error creating stripe payment intent.', error: errorMessage })
  }
}

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, courseId, transactionId, amount, paymentProvider } = req.body

    const course = await Course.get(courseId)

    const newTransaction = new Transaction({
      userId,
      courseId,
      transactionId,
      amount,
      paymentProvider,
      dateTime: new Date().toISOString(),
    })

    const initialProgress = new UserCourseProgress({
      userId,
      courseId,
      overallProgress: 0,
      enrollmentDate: new Date().toISOString(),
      lastAccessedTimestamp: new Date().toISOString(),
      sections: course.sections.map((section: any) => ({
        sectionId: section.sectionId,
        chapters: section.chapters.map((chapter: any) => ({
          chapterId: chapter.chapterId,
          completed: false,
        }))
      }))
    })

    await dynamoose.transaction([
      Transaction.transaction.create(newTransaction),
      UserCourseProgress.transaction.create(initialProgress),
      Course.transaction.update(
        { courseId },
        {
          $ADD: {
            enrollments: [{ userId }],
          },
        }
      ),
    ])

    res.json({
      data: {
        transaction: newTransaction,
        courseProgress: initialProgress,
      },
      message: 'Purchased Course successfully.'
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ message: 'Error creating transaction & enrollment.', error: errorMessage })
  }
}
