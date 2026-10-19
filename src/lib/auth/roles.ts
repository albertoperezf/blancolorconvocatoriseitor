import type { Role } from '@/lib/db/schema';

/** Admins and editors can enter results and goalscorers; only admins get the Admin area. */
export const canEditResults = (role: Role) => role === 'admin' || role === 'editor';
