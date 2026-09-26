import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { collectOrphans } from '@/lib/image-gc'
import { imageIdsIn } from '@/lib/uploads'

async function getOwnedNote(id: number, userId: number) {
  const note = await prisma.note.findUnique({ where: { id } })
  if (!note) return null
  if (note.user_id !== userId) return null
  return note
}

export async function PUT(
  request: NextRequest,
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

    const existing = await getOwnedNote(id, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: { title?: string; content?: string; folder?: string; position?: number } = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.content !== undefined) updateData.content = body.content
    if (body.folder !== undefined) updateData.folder = body.folder
    if (body.position !== undefined) updateData.position = body.position

    const note = await prisma.note.update({ where: { id }, data: updateData })

    if (updateData.content !== undefined) {
      const dropped = imageIdsIn(existing.content).filter(
        id => !imageIdsIn(updateData.content!).includes(id),
      )
      await collectOrphans(dropped)
    }

    return NextResponse.json(note)
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
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

    const existing = await getOwnedNote(id, userId)
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const permanent = request.nextUrl.searchParams.get('permanent') === '1'

    if (permanent) {
      await prisma.note.delete({ where: { id } })
      await collectOrphans(imageIdsIn(existing.content))
      return NextResponse.json({ message: 'Note deleted permanently' })
    }

    await prisma.note.update({ where: { id }, data: { deleted_at: new Date() } })
    return NextResponse.json({ message: 'Note moved to trash' })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
