import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { apiError } from '@/lib/api-errors';
import { authOptions } from '@/lib/auth';
import { authConfig } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return apiError('unauthorized', 401);
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatar_id: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return apiError('generic', 500);
  }
}

export async function POST(request: NextRequest) {
  if (authConfig.mode === 'oidc') {
    return apiError('usersManagedByProvider', 403);
  }

  try {
    const body = await request.json();
    const { username, email, password, role } = body;

    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      const session = await getServerSession(authOptions);
      if (!session || session.user.role !== 'ADMIN') {
        return apiError('unauthorized', 401);
      }
    }

    if (!username || !email || !password) {
      return apiError('missingFields', 400);
    }

    if (String(password).length < 6) {
      return apiError('passwordTooShort', 400);
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return apiError('userExists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userRole = isFirstUser ? 'ADMIN' : (role || 'USER');

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true,
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return apiError('userCreateFailed', 500);
  }
}
