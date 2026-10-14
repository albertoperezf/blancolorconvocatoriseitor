import { count, desc, eq } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { auditLog, contactMessages } from '@/lib/db/schema';

export async function saveContactMessage(db: Db, values: { name: string; email: string; message: string }) {
  await db.insert(contactMessages).values(values);
}

export function listContactMessages(db: Db) {
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt), desc(contactMessages.id));
}

export async function countContactMessages(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(contactMessages);
  return row.n;
}

export async function deleteContactMessage(db: Db, actorId: string, id: number) {
  const deleted = await db
    .delete(contactMessages)
    .where(eq(contactMessages.id, id))
    .returning({ email: contactMessages.email });
  if (deleted.length) {
    await db.insert(auditLog).values({ actorId, action: 'contact_deleted', details: deleted[0].email });
  }
}
