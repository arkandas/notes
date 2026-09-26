import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectOrphans } from '@/lib/image-gc'
import { imageIdsIn } from '@/lib/uploads'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notes = await prisma.note.findMany({
      where: { user_id: parseInt(session.user.id), deleted_at: { not: null } },
      orderBy: { deleted_at: 'desc' },
    })
    return NextResponse.json(notes)
  } catch (error) {
    console.error('Error fetching trash:', error)
    return NextResponse.json({ error: 'Failed to fetch trash' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    const doomed = await prisma.note.findMany({
      where: { user_id: userId, deleted_at: { not: null } },
      select: { content: true },
    })
    const referenced = doomed.flatMap(note => imageIdsIn(note.content))

    const result = await prisma.note.deleteMany({
      where: { user_id: userId, deleted_at: { not: null } },
    })
    await collectOrphans(referenced)

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Error emptying trash:', error)
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 })
  }
}
