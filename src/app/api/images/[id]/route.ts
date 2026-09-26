import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pathFor } from '@/lib/uploads'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new NextResponse(null, { status: 401 })
  }

  const { id } = await params
  const image = await prisma.image.findUnique({ where: { id } })
  if (!image) {
    return new NextResponse(null, { status: 404 })
  }

  if (request.headers.get('if-none-match') === `"${id}"`) {
    return new NextResponse(null, { status: 304 })
  }

  let bytes: Buffer
  try {
    bytes = await readFile(pathFor(id, image.mime))
  } catch {
    console.error(`Image ${id} is in the database but not on disk`)
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': image.mime,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ETag: `"${id}"`,
    },
  })
}
