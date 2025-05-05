import { Request, Response } from 'express';
import Course from '../models/courseModel';

export const listCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query
    const courses = category && category !== 'all'
      ? await Course.scan('category').eq(category).exec()
      : await Course.scan().exec()

    res.json({ data: courses, message: 'Courses retrieved successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving courses.', error })
  }
}

export const getCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params
    const course = await Course.get(courseId)
    if (!course) {
      res.status(404).json({ message: 'Course not found.' })
      return
    }

    res.json({ data: course, message: 'Course retrieved successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving courses.', error })
  }
}
