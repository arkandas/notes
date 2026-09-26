import { unlink } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { pathFor } from '@/lib/uploads'

async function isReferenced(id: string) {
  const [note, user] = await Promise.all([
    prisma.note.findFirst({ where: { content: { contains: id } }, select: { id: true } }),
    prisma.user.findFirst({ where: { avatar_id: id }, select: { id: true } }),
  ])
  return Boolean(note || user)
}

export async function collectOrphans(candidateIds: string[]) {
  const orphans: string[] = []
  for (const id of new Set(candidateIds)) {
    if (!(await isReferenced(id))) orphans.push(id)
  }
  if (orphans.length === 0) return

  const rows = await prisma.image.findMany({
    where: { id: { in: orphans } },
    select: { id: true, mime: true },
  })

  await Promise.all(
    rows.map(async row => {
      try {
        await unlink(pathFor(row.id, row.mime))
      } catch {}
    }),
  )

  await prisma.image.deleteMany({ where: { id: { in: rows.map(r => r.id) } } })
}
