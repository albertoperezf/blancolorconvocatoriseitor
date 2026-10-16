import { getCurrentUser, appOrigin } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch } from '@/lib/match/queries';
import { setAttendance } from '@/lib/services/player';
import { pushAnswerSchema } from '@/lib/validators';

/**
 * "Voy" / "No voy" from a reminder notification. The service worker calls it with the session cookie;
 * the Origin check stops other sites from answering on a player's behalf.
 */
export async function POST(request: Request) {
  if (request.headers.get('origin') !== (await appOrigin())) return new Response('Forbidden', { status: 403 });
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = pushAnswerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response('Bad Request', { status: 400 });

  const db = await getDb();
  const match = await ensureCurrentMatch(db);
  // The reminder was for an earlier week: let the app open instead of answering the wrong match.
  if (match.id !== parsed.data.matchId) return new Response('Conflict', { status: 409 });

  await setAttendance(db, user.id, match.id, parsed.data.decision);
  return new Response(null, { status: 204 });
}
