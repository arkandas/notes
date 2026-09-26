import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
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

    const folder = await prisma.noteFolder.findUnique({ where: { id } })
    if (!folder || folder.user_id !== userId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const body = await request.json()
    const data: { name?: string; color?: string | null; icon?: string | null } = {}
    if ('color' in body) data.color = body.color ?? null
    if ('icon' in body) data.icon = body.icon ? String(body.icon).slice(0, 24) : null

    if ('name' in body) {
      const name = String(body.name ?? '').trim().slice(0, 80)
      if (!name) {
        return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
      }
      if (name !== folder.name) {
        const clash = await prisma.noteFolder.findFirst({ where: { user_id: userId, name } })
        if (clash) {
          return NextResponse.json({ error: 'A folder with that name already exists' }, { status: 409 })
        }
        data.name = name
      }
    }

    const updated = await prisma.$transaction(async tx => {
      if (data.name) {
        await tx.note.updateMany({
          where: { user_id: userId, folder: folder.name },
          data: { folder: data.name },
        })
      }
      return tx.noteFolder.update({ where: { id }, data })
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
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

    const folder = await prisma.noteFolder.findUnique({ where: { id } })
    if (!folder || folder.user_id !== userId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    await prisma.note.updateMany({
      where: { user_id: userId, folder: folder.name },
      data: { folder: '' },
    })

    await prisma.noteFolder.delete({ where: { id } })
    return NextResponse.json({ message: 'Folder deleted' })
  } catch (error) {
    console.error('Error deleting note folder:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
