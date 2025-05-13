import { Request, Response } from 'express'
import UserCourseProgress from '../models/userCourseProgressModel'
import Course from '../models/courseModel'
import { calculateOverallProgress, mergeSections } from '../utils/utils'

export const getUserEnrolledCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params
    const enrolledCourses = await UserCourseProgress.query('userId').eq(userId).attributes(['courseId']).exec()
    const courseIds = enrolledCourses.map((item: any) => item.courseId)
    const courses = await Course.batchGet(courseIds)

    res.json({ data: courses, message: 'Enrolled courses retrieved successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving enrolled course.', error })
  }
}

export const getUserCourseProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, courseId } = req.params
    const progress = await UserCourseProgress.get({ userId, courseId })

    res.json({ data: progress, message: 'Course progress retrieved successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving course progress.', error })
  }
}

export const updateUserCourseProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, courseId } = req.params
    const progressData = req.body
    let progress = await UserCourseProgress.get({ userId, courseId })

    if (!progress) {
      progress = new UserCourseProgress({
        userId,
        courseId,
        enrollmentDate: new Date().toISOString(),
        overallProgress: 0,
        sections: progressData.sections || [],
        lastAccessedTimestamp: new Date().toISOString(),
      })
    } else {
      progress.sections = mergeSections(progress.sections, progressData.sections || [])
      progress.lastAccessedTimestamp = new Date().toISOString()
      progress.overallProgress = calculateOverallProgress(progress.sections)
    }

    await progress.save()

    res.json({ data: progress, message: '' })
  } catch (error) {
    res.status(500).json({ message: 'Error updating user course progress.', error })
  }
}
