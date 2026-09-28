import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { apiError } from '@/lib/api-errors'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError('unauthorized', 401)
    }

    const folders = await prisma.noteFolder.findMany({
      where: { user_id: parseInt(session.user.id) },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching note folders:', error)
    return apiError('generic', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError('unauthorized', 401)
    }

    const body = await request.json()
    const { name } = body
    if (!name?.trim()) {
      return apiError('folderNameRequired', 400)
    }

    const folder = await prisma.noteFolder.create({
      data: {
        name: name.trim(),
        user_id: parseInt(session.user.id),
      },
    })

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error('Error creating note folder:', error)
    return apiError('generic', 500)
  }
}
