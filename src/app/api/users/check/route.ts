import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-errors';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ hasUsers: userCount > 0 });
  } catch (error) {
    console.error('Error checking users:', error);
    return apiError('generic', 500);
  }
}
