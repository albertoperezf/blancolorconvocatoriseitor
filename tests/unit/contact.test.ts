import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/lib/db/create';
import { auditLog } from '@/lib/db/schema';
import {
  countContactMessages,
  deleteContactMessage,
  listContactMessages,
  saveContactMessage,
} from '@/lib/services/contact';
import { contactSchema, fieldErrors } from '@/lib/validators';
import { freshDb, insertUser } from './helpers/db';

describe('contactSchema', () => {
  it('trims and accepts a valid message', () => {
    const parsed = contactSchema.parse({ name: '  Ana  ', email: ' ana@example.com ', message: 'Hola, ¿hay sitio?' });
    expect(parsed).toEqual({ name: 'Ana', email: 'ana@example.com', message: 'Hola, ¿hay sitio?' });
  });

  it('reports one message key per invalid field', () => {
    const result = contactSchema.safeParse({ name: 'A', email: 'no-es-un-email', message: 'corto' });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({
      name: 'contact.name',
      email: 'contact.email',
      message: 'contact.message',
    });
    expect(contactSchema.safeParse({ name: 'Ana', email: 'a@b.es', message: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('contact messages', () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = await freshDb();
  });
  afterAll(() => h.close());

  it('stores messages newest first and lets an admin delete them (audited)', async () => {
    const admin = await insertUser(h, { username: 'ADMIN', role: 'admin' });
    await saveContactMessage(h.db, { name: 'Ana', email: 'ana@example.com', message: 'Primer mensaje' });
    await saveContactMessage(h.db, { name: 'Luis', email: 'luis@example.com', message: 'Segundo mensaje' });

    const [newest, oldest] = await listContactMessages(h.db);
    expect([newest.name, oldest.name]).toEqual(['Luis', 'Ana']);
    expect(await countContactMessages(h.db)).toBe(2);

    await deleteContactMessage(h.db, admin.id, oldest.id);
    expect((await listContactMessages(h.db)).map((m) => m.name)).toEqual(['Luis']);
    const [entry] = await h.db.select().from(auditLog);
    expect(entry).toMatchObject({ actorId: admin.id, action: 'contact_deleted', details: 'ana@example.com' });
  });
});
