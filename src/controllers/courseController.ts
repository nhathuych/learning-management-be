import { Request, Response } from 'express';
import Course from '../models/courseModel';
import { v4 as uuid } from 'uuid'
import { getAuth } from '@clerk/express';
import AWS from 'aws-sdk';

const s3 = new AWS.S3()

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

export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { teacherId, teacherName } = req.body

    if (!teacherId || !teacherName) {
      res.status(400).json({ message: 'Teacher id and name are required.' })
      return
    }

    const newCourse = new Course({
      courseId: uuid(),
      teacherId,
      teacherName,
      title: 'Untitled Course',
      description: '',
      category: 'Uncategorized',
      image: '',
      price: 0,
      level: 'Beginner',
      status: 'Draft',
      sections: [],
      enrollments: [],
    })
    await newCourse.save()

    res.json({ data: newCourse, message: 'Course created successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error creating course.', error })
  }
}

export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params
    const { userId } = getAuth(req)
    const updateData = { ...req.body }

    const course = await Course.get(courseId)
    if (!course) {
      res.status(404).json({ message: 'Course not found.' })
      return
    }
    if (course.teacherId !== userId) {
      res.status(403).json({ message: 'Not authrized to update this course.' })
      return
    }

    if (updateData.price) {
      const price = parseInt(updateData.price)
      if (isNaN(price)) {
        res.status(404).json({ message: 'Invalid price format.', error: 'Price must be a valid number.' })
        return
      }
      updateData.price = price * 100
    }
    if (updateData.sections) {
      const sectionsData = typeof updateData.sections === 'string' ? JSON.parse(updateData.sections) : updateData.sections
      updateData.sections = sectionsData.map((section: any) => ({
        ...section,
        sectionId: section.sectionId || uuid(),
        chapters: section.chapters.map((chapter: any) => ({
          ...chapter,
          chapterId: chapter.chapterId || uuid(),
        }))
      }))
    }

    Object.assign(course, updateData)
    await course.save()

    res.json({ data: course, message: 'Course updated successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error updating course.', error })
  }
}

export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params
    const { userId } = getAuth(req)

    const course = await Course.get(courseId)

    if (!course) {
      res.status(404).json({ message: 'Course not found.' })
      return
    }
    if (course.teacherId !== userId) {
      res.status(403).json({ message: 'Not authrized to delete this course.' })
      return
    }

    await Course.delete(courseId)

    res.json({ message: 'Course deleted successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course.', error })
  }
}

export const getUploadVideoUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileName, fileType } = req.body

    if (!fileName || !fileType) {
      res.status(400).json({ message: 'File name and type are required.' })
      return
    }

    const uniqueId = uuid()
    const s3Key = `videos/${uniqueId}/${fileName}`

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME || '',
      Key: s3Key,
      Expires: 60,
      ContentType: fileType,
    }

    const uploadUrl = s3.getSignedUrl('putObject', s3Params)
    const videoUrl = `${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`

    res.json({
      data: { uploadUrl, videoUrl },
      message: 'Upload URL generated successfully.'
    })
  } catch(error) {
    res.status(500).json({ message: 'Error generating upload URL.', error })
  }
}
