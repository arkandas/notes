const MAX_EDGE = 1600;

const AVATAR_EDGE = 256;

export type UploadedImage = { id: string; url: string; width: number; height: number };

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), type, quality);
  });
}

async function rescale(file: File, maxEdge: number, square: boolean): Promise<File> {
  if (file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file);
  const { width: sw, height: sh } = bitmap;

  const side = Math.min(sw, sh);
  const sx = square ? (sw - side) / 2 : 0;
  const sy = square ? (sh - side) / 2 : 0;
  const cw = square ? side : sw;
  const ch = square ? side : sh;

  const scale = Math.min(1, maxEdge / Math.max(cw, ch));
  if (scale === 1 && !square && file.size < 400 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cw * scale);
  canvas.height = Math.round(ch * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const type = file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, type, 0.82);
  const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/webp' ? '.webp' : '.jpg');
  return new File([blob], name, { type });
}

async function send(file: File): Promise<UploadedImage> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  const form = new FormData();
  form.append('file', file);
  if (bitmap) {
    form.append('width', String(bitmap.width));
    form.append('height', String(bitmap.height));
    bitmap.close();
  }

  const response = await fetch('/api/images', { method: 'POST', body: form });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Upload failed');
  }
  return response.json();
}

export async function uploadNoteImage(file: File) {
  return send(await rescale(file, MAX_EDGE, false));
}

export async function uploadAvatar(file: File) {
  return send(await rescale(file, AVATAR_EDGE, true));
}

export function imageMarkdown(file: File, image: UploadedImage) {
  const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '').slice(0, 80) || 'image';
  return `![${alt}](${image.url})`;
}
