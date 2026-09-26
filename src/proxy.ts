import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { sessionCookieName } from '@/lib/auth-cookies';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    secret: process.env.NOTES_NEXTAUTH_SECRET,
    cookies: {
      sessionToken: { name: sessionCookieName },
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|api/users|login|setup|_next|favicon.ico|robots.txt|manifest.webmanifest|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png).*)',
  ],
};
