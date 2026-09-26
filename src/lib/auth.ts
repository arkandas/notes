import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { authConfig } from '@/lib/auth-config';
import { findOrCreateAccount, oidcProvider, type OidcProfile } from '@/lib/oidc';
import bcrypt from 'bcryptjs';
import {
  sessionCookieName,
  callbackCookieName,
  csrfCookieName,
  baseCookieOptions,
} from '@/lib/auth-cookies';

const credentialsProvider = CredentialsProvider({
  name: 'Credentials',
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    if (!credentials?.username || !credentials?.password) {
      throw new Error('Missing credentials');
    }

    const user = await prisma.user.findUnique({
      where: { username: credentials.username }
    });

    if (!user?.password) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    return {
      id: user.id.toString(),
      email: user.email,
      name: user.username,
      role: user.role,
      avatarId: user.avatar_id,
    };
  }
});

const oidc = authConfig.mode === 'oidc' ? authConfig.oidc : null;

export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: { ...baseCookieOptions, httpOnly: true },
    },
    callbackUrl: {
      name: callbackCookieName,
      options: baseCookieOptions,
    },
    csrfToken: {
      name: csrfCookieName,
      options: { ...baseCookieOptions, httpOnly: true },
    },
  },
  providers: oidc ? [oidcProvider(oidc)] : [credentialsProvider],
  callbacks: {
    async signIn({ account, profile }) {
      if (!oidc || account?.provider !== 'oidc') return true;
      if (!profile?.sub) return false;
      return (await findOrCreateAccount(profile as OidcProfile)) !== null;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === 'oidc') {
        const dbUser = await prisma.user.findUniqueOrThrow({
          where: { oidc_sub: account.providerAccountId }
        });
        token.id = dbUser.id.toString();
        token.name = dbUser.username;
        token.email = dbUser.email;
        token.role = dbUser.role;
        token.avatarId = dbUser.avatar_id;
      } else if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatarId = user.avatarId ?? null;
      }
      if (trigger === 'update' && session && 'avatarId' in session) {
        token.avatarId = session.avatarId as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = oidc ? 'USER' : token.role;
        session.user.avatarId = (token.avatarId as string | null) ?? null;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NOTES_NEXTAUTH_SECRET,
};
