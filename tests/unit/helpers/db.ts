import path from 'node:path';
import { createDb, type DbHandle } from '@/lib/db/create';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';

export async function freshDb(): Promise<DbHandle> {
  const handle = await createDb('pglite://memory');
  await handle.migrate(path.resolve(process.cwd(), 'drizzle'));
  return handle;
}

export async function insertUser(
  handle: DbHandle,
  values: Partial<typeof users.$inferInsert> & { username: string; password?: string },
) {
  const { password, ...rest } = values;
  const [row] = await handle.db
    .insert(users)
    .values({
      displayName: rest.username,
      ...rest,
      passwordHash: password ? await hashPassword(password) : rest.passwordHash,
    })
    .returning();
  return row;
}
