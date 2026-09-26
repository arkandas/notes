#!/usr/bin/env node
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const prismaBin = join(root, 'node_modules', '.bin', 'prisma');
const connectAttempts = 15;

class Failure extends Error {}

function prisma(...args) {
  const result = spawnSync(prismaBin, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, CHECKPOINT_DISABLE: '1' },
  });
  if (result.status !== 0) throw new Failure(`"prisma ${args.join(' ')}" failed.`);
}

function reason(error) {
  return error.errors?.map(inner => inner.message).join('; ') || error.message;
}

async function connect() {
  for (let attempt = 1; ; attempt++) {
    const client = new pg.Client({ connectionString: process.env.NOTES_DATABASE_URL });
    try {
      await client.connect();
      return client;
    } catch (error) {
      await client.end().catch(() => {});
      if (attempt === connectAttempts) throw new Failure(`Could not connect to the database: ${reason(error)}`);
      console.log(`Database not reachable yet (${reason(error)}), retrying...`);
      await sleep(2000);
    }
  }
}

async function databaseState() {
  const client = await connect();
  try {
    const { rows } = await client.query(
      "select to_regclass('_prisma_migrations') is not null as migrated, to_regclass('users') is not null as populated",
    );
    return rows[0];
  } finally {
    await client.end();
  }
}

function adopt() {
  console.log('This database was created with "prisma db push". Bringing it under migrations.');
  try {
    prisma('db', 'push');
  } catch (error) {
    console.error(
      'Nothing was changed. Remove what prisma lists above from the database, or, if the tables are already complete,\n' +
        'mark the migrations as applied yourself with "npx prisma migrate resolve --applied <migration>".',
    );
    throw error;
  }
  const migrations = readdirSync(join(root, 'prisma', 'migrations'), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  for (const name of migrations) prisma('migrate', 'resolve', '--applied', name);
}

async function main() {
  if (!process.env.NOTES_DATABASE_URL) throw new Failure('NOTES_DATABASE_URL is not set.');
  const { migrated, populated } = await databaseState();
  if (!migrated && populated) adopt();
  prisma('migrate', 'deploy');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Failure ? error.message : error);
  process.exit(1);
}
