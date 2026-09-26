function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function slugify(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'untitled';
}

export function exportMarkdown(title: string, content: string) {
  downloadBlob(new Blob([content], { type: 'text/markdown;charset=utf-8' }), `${slugify(title)}.md`);
}

export async function exportDocx(title: string, content: string) {
  const response = await fetch('/api/export/docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!response.ok) throw new Error('Failed to export Word document');
  downloadBlob(await response.blob(), `${slugify(title)}.docx`);
}
