import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { noteToDocxBuffer } from '@/lib/docx';
import { slugify } from '@/lib/export';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content } = await request.json();
    const buffer = await noteToDocxBuffer(String(content ?? ''));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${slugify(String(title ?? 'Untitled'))}.docx"`,
      },
    });
  } catch (error) {
    console.error('Failed to build docx:', error);
    return NextResponse.json({ error: 'Failed to build document' }, { status: 500 });
  }
}
