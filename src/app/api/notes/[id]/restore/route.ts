import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: idParam } = await params
    const id = parseInt(idParam)
    const userId = parseInt(session.user.id)

    const existing = await prisma.note.findUnique({ where: { id } })
    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const agg = await prisma.note.aggregate({
      where: { user_id: userId, folder: existing.folder, deleted_at: null },
      _max: { position: true },
    })

    const note = await prisma.note.update({
      where: { id },
      data: { deleted_at: null, position: (agg._max.position ?? -1) + 1 },
    })
    return NextResponse.json(note)
  } catch (error) {
    console.error('Error restoring note:', error)
    return NextResponse.json({ error: 'Failed to restore note' }, { status: 500 })
  }
}
