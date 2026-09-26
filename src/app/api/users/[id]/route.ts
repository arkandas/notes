import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { collectOrphans } from '@/lib/image-gc';
import { imageIdsIn } from '@/lib/uploads';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (session.user.id === id.toString()) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const [uploaded, notes, user] = await Promise.all([
      prisma.image.findMany({ where: { user_id: id }, select: { id: true } }),
      prisma.note.findMany({ where: { user_id: id }, select: { content: true } }),
      prisma.user.findUnique({ where: { id }, select: { avatar_id: true } }),
    ]);

    await prisma.user.delete({
      where: { id }
    });

    await collectOrphans([
      ...uploaded.map(image => image.id),
      ...notes.flatMap(note => imageIdsIn(note.content)),
      ...(user?.avatar_id ? [user.avatar_id] : []),
    ]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
