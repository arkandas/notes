import type { OAuthConfig } from 'next-auth/providers/oauth';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { OidcConfig } from '@/lib/auth-config';

export interface OidcProfile {
  sub: string;
  email?: string;
  preferred_username?: string;
}

export function oidcProvider(config: OidcConfig): OAuthConfig<OidcProfile> {
  return {
    id: 'oidc',
    name: config.name,
    type: 'oauth',
    wellKnown: `${config.issuer}/.well-known/openid-configuration`,
    authorization: { params: { scope: 'openid email profile' } },
    idToken: true,
    checks: ['pkce', 'state'],
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    profile: profile => ({
      id: profile.sub,
      name: profile.preferred_username ?? '',
      email: profile.email ?? '',
      role: 'USER',
    }),
  };
}

export async function findOrCreateAccount(profile: OidcProfile): Promise<User | null> {
  const linked = await prisma.user.findUnique({ where: { oidc_sub: profile.sub } });
  if (linked) return syncFromProvider(linked, profile);

  const email = profile.email?.trim();
  if (!email) return null;

  const sameEmail = await findByEmail(email);
  if (sameEmail) {
    if (sameEmail.oidc_sub) return null;
    const account = await prisma.user.update({ where: { id: sameEmail.id }, data: { oidc_sub: profile.sub } });
    return syncFromProvider(account, profile);
  }

  const username = await availableUsername(profile.preferred_username || email.split('@')[0]);
  return prisma.user.create({ data: { username, email, oidc_sub: profile.sub } });
}

async function syncFromProvider(user: User, profile: OidcProfile): Promise<User> {
  const data: { email?: string; username?: string } = {};

  const email = profile.email?.trim();
  if (email && email.toLowerCase() !== user.email.toLowerCase()) {
    const owner = await findByEmail(email);
    if (!owner) data.email = email;
  }

  const username = profile.preferred_username?.trim();
  if (username && username !== user.username) {
    const owner = await prisma.user.findUnique({ where: { username } });
    if (!owner) data.username = username;
  }

  if (Object.keys(data).length === 0) return user;
  return prisma.user.update({ where: { id: user.id }, data });
}

function findByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
}

async function availableUsername(wanted: string): Promise<string> {
  const base = wanted.trim() || 'user';
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }
}
