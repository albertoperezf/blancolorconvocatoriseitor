import 'server-only';
import { createDb, type Db, type DbHandle } from './create';

const globalForDb = globalThis as unknown as { blcDb?: Promise<DbHandle> };

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  // PGlite can't boot inside the Next.js server runtime, so locally it runs as a separate socket server.
  if (!url || url.startsWith('pglite://')) {
    throw new Error('DATABASE_URL must be a Postgres URL. Locally, `npm run dev` starts PGlite as a Postgres server.');
  }
  return url;
}

// One pool per process; also survives dev hot reloads.
export async function getDb(): Promise<Db> {
  globalForDb.blcDb ??= createDb(databaseUrl()).catch((e) => {
    globalForDb.blcDb = undefined;
    throw e;
  });
  return (await globalForDb.blcDb).db;
}

export type { Db };
