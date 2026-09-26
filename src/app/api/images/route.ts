import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { writeFile } from 'fs/promises'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureUploadsDir, pathFor } from '@/lib/uploads'

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 415 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const id = createHash('sha256').update(bytes).digest('hex')
    const width = Number(form.get('width')) || 0
    const height = Number(form.get('height')) || 0
    const userId = parseInt(session.user.id)

    await ensureUploadsDir()
    await writeFile(pathFor(id, file.type), bytes)

    await prisma.image.upsert({
      where: { id },
      update: {},
      create: { id, mime: file.type, width, height, bytes: bytes.length, user_id: userId },
    })

    return NextResponse.json({ id, url: `/api/images/${id}`, width, height }, { status: 201 })
  } catch (error) {
    console.error('Failed to store image:', error)
    return NextResponse.json({ error: 'Failed to store image' }, { status: 500 })
  }
}
