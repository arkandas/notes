import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { apiError } from '@/lib/api-errors'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectOrphans } from '@/lib/image-gc'

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return apiError('unauthorized', 401)
  }

  try {
    const { imageId } = await request.json()
    const userId = parseInt(session.user.id)

    if (imageId) {
      const image = await prisma.image.findUnique({
        where: { id: String(imageId) },
        select: { id: true },
      })
      if (!image) {
        return apiError('imageNotFound', 404)
      }
    }

    const previous = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar_id: true },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { avatar_id: imageId ? String(imageId) : null },
    })

    if (previous?.avatar_id && previous.avatar_id !== imageId) {
      await collectOrphans([previous.avatar_id])
    }

    return NextResponse.json({ avatarId: imageId ?? null })
  } catch (error) {
    console.error('Failed to set avatar:', error)
    return apiError('avatarFailed', 500)
  }
}
