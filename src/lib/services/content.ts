import { asc } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { faqs } from '@/lib/db/schema';

export function listFaqs(db: Db) {
  return db.select().from(faqs).orderBy(asc(faqs.position));
}
