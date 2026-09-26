import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notes = await prisma.note.findMany({
      where: { user_id: parseInt(session.user.id), deleted_at: null },
      orderBy: [{ folder: 'asc' }, { position: 'asc' }],
    })
    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title = 'Untitled', content = '', folder = '' } = body
    const userId = parseInt(session.user.id)

    const agg = await prisma.note.aggregate({
      where: { user_id: userId, folder, deleted_at: null },
      _max: { position: true },
    })
    const position = (agg._max.position ?? -1) + 1

    const note = await prisma.note.create({
      data: { title, content, folder, position, user_id: userId },
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
