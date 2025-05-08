import { Request, Response } from 'express';
import { clerkClient } from '../utils/clerkClient'

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params
    const userData = req.body

    const user = await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        userType: userData.publicMetadata.userType,
        settings: userData.publicMetadata.settings,
      }
    })

    res.json({ data: user, message: 'User updated successfully.' })
  } catch (error) {
    res.status(500).json({ message: 'Error updating user.', error: (error as any)?.message })
  }
}
