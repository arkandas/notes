import { mkdir } from 'fs/promises'
import { join } from 'path'

const DIR = process.env.NOTES_UPLOADS_DIR || join(/*turbopackIgnore: true*/ process.cwd(), 'uploads')

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

export function extensionFor(mime: string) {
  return EXTENSIONS[mime] ?? 'bin'
}

export function pathFor(id: string, mime: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Bad image id')
  return join(/*turbopackIgnore: true*/ DIR, `${id}.${extensionFor(mime)}`)
}

export async function ensureUploadsDir() {
  await mkdir(DIR, { recursive: true })
  return DIR
}

export function imageIdsIn(markdown: string): string[] {
  return [...markdown.matchAll(/\/api\/images\/([a-f0-9]{64})/g)].map(m => m[1])
}
