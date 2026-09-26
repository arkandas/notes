import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { id: number; username: string; email: string; oidc_sub: string | null };

const users = vi.hoisted(() => [] as Row[]);

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { oidc_sub?: string; username?: string } }) =>
        users.find(u =>
          where.oidc_sub !== undefined ? u.oidc_sub === where.oidc_sub : u.username === where.username
        ) ?? null,
      findFirst: async ({ where }: { where: { email: { equals: string } } }) =>
        users.find(u => u.email.toLowerCase() === where.email.equals.toLowerCase()) ?? null,
      update: async ({ where, data }: { where: { id: number }; data: Partial<Row> }) =>
        Object.assign(users.find(u => u.id === where.id)!, data),
      create: async ({ data }: { data: Omit<Row, 'id'> }) => {
        const row = { id: users.length + 1, ...data };
        users.push(row);
        return row;
      },
    },
  },
}));

import { findOrCreateAccount } from './oidc';

const add = (row: Omit<Row, 'id'>) => users.push({ id: users.length + 1, ...row });

beforeEach(() => {
  users.length = 0;
});

describe('findOrCreateAccount', () => {
  it('returns the account already linked to this person', async () => {
    add({ username: 'ana', email: 'ana@example.com', oidc_sub: 'sub-ana' });

    const account = await findOrCreateAccount({ sub: 'sub-ana', email: 'ana@example.com', preferred_username: 'ana' });

    expect(account?.id).toBe(1);
    expect(users).toHaveLength(1);
  });

  it('links an existing account with the same email, ignoring case', async () => {
    add({ username: 'guille', email: 'Guille@Example.com', oidc_sub: null });

    const account = await findOrCreateAccount({ sub: 'sub-g', email: 'guille@example.com', preferred_username: 'guille' });

    expect(account?.id).toBe(1);
    expect(users[0].oidc_sub).toBe('sub-g');
  });

  it('refuses an email that is already linked to someone else', async () => {
    add({ username: 'ana', email: 'ana@example.com', oidc_sub: 'sub-ana' });

    const account = await findOrCreateAccount({ sub: 'sub-other', email: 'ana@example.com', preferred_username: 'ana' });

    expect(account).toBeNull();
    expect(users[0].oidc_sub).toBe('sub-ana');
  });

  it('creates an account named after the provider username, numbering it if taken', async () => {
    add({ username: 'bob', email: 'bob@example.com', oidc_sub: null });

    const account = await findOrCreateAccount({ sub: 'sub-bob2', email: 'robert@example.com', preferred_username: 'bob' });

    expect(account).toMatchObject({ username: 'bob2', email: 'robert@example.com', oidc_sub: 'sub-bob2' });
  });

  it('falls back to the email name when the provider sends no username', async () => {
    const account = await findOrCreateAccount({ sub: 'sub-c', email: 'carla@example.com', preferred_username: '' });

    expect(account?.username).toBe('carla');
  });

  it('refuses a first sign-in without an email', async () => {
    const account = await findOrCreateAccount({ sub: 'sub-d', preferred_username: 'dan' });

    expect(account).toBeNull();
    expect(users).toHaveLength(0);
  });

  it('copies a changed username and email from the provider', async () => {
    add({ username: 'arkandas', email: 'old@example.com', oidc_sub: 'sub-g' });

    const account = await findOrCreateAccount({ sub: 'sub-g', email: 'new@example.com', preferred_username: 'guillermo' });

    expect(account).toMatchObject({ id: 1, username: 'guillermo', email: 'new@example.com' });
  });

  it('keeps the old username or email when another account already has the new one', async () => {
    add({ username: 'arkandas', email: 'me@example.com', oidc_sub: 'sub-g' });
    add({ username: 'guillermo', email: 'taken@example.com', oidc_sub: null });

    const account = await findOrCreateAccount({ sub: 'sub-g', email: 'TAKEN@example.com', preferred_username: 'guillermo' });

    expect(account).toMatchObject({ id: 1, username: 'arkandas', email: 'me@example.com' });
  });

  it('only changes the email case when the address itself is the same', async () => {
    add({ username: 'ana', email: 'Ana@Example.com', oidc_sub: 'sub-ana' });

    const account = await findOrCreateAccount({ sub: 'sub-ana', email: 'ana@example.com', preferred_username: 'ana' });

    expect(account?.email).toBe('Ana@Example.com');
  });
});
