import { sql } from 'drizzle-orm';
import { users } from './schema';

/** A player's name as shown in past results and goals; deleted players keep theirs with a tag. */
export const shownName = sql<string>`case when ${users.deletedAt} is null then ${users.displayName} else ${users.displayName} || ' (Eliminado)' end`;
