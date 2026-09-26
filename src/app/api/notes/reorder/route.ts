import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { updates } = await request.json() as { updates: { id: number; position: number }[] }

    await prisma.$transaction(
      updates.map(({ id, position }) =>
        prisma.note.updateMany({
          where: { id, user_id: userId },
          data: { position },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error reordering notes:', error)
    return NextResponse.json({ error: 'Failed to reorder notes' }, { status: 500 })
  }
}
