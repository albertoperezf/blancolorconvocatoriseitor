import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbHandle = {
  db: Db;
  migrate: (migrationsFolder: string) => Promise<void>;
  close: () => Promise<void>;
};

const PGLITE_PREFIX = 'pglite://';

export const DEFAULT_DATABASE_URL = `${PGLITE_PREFIX}.data/dev`;

/**
 * `pglite://memory` → in-memory, `pglite://<dir>` → local file DB, anything else → Postgres (Neon in production).
 */
export async function createDb(url: string = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL): Promise<DbHandle> {
  if (url.startsWith(PGLITE_PREFIX)) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const target = url.slice(PGLITE_PREFIX.length);
    if (target !== 'memory') {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(target, { recursive: true });
    }
    const client = target === 'memory' ? new PGlite() : new PGlite(target);
    const db = drizzle({ client, schema, casing: 'snake_case' });
    return {
      db: db as unknown as Db,
      migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
      close: () => client.close(),
    };
  }

  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');
  // prepare:false keeps it compatible with Neon's pooled (PgBouncer) endpoint.
  // The local PGlite socket server is single-session, so dev runs with DB_POOL_MAX=1.
  const client = postgres(url, { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 5) });
  const db = drizzle({ client, schema, casing: 'snake_case' });
  return {
    db: db as unknown as Db,
    migrate: (migrationsFolder) => migrate(db, { migrationsFolder }),
    close: () => client.end(),
  };
}
