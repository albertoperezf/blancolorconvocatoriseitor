import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import type { Db } from '@/lib/db/create';
import { attendances, auditLog, guests, matchGoals, matches, users, type Team } from '@/lib/db/schema';
import { shownName } from '@/lib/db/shown-name';
import { DomainError } from '@/lib/services/player';
import { resultsFrom, setMatchResult } from './results';

export type ScorerKind = 'user' | 'guest';
export type ScorerInput = { team: Team; kind: ScorerKind; id: string; goals: number };
export type MatchScorer = ScorerInput & { matchId: string; name: string };
export type ScorerOption = { kind: ScorerKind; id: string; name: string };
export type ScorerColumn = { listed: (ScorerOption & { goals: number })[]; extra: ScorerOption[] };
/** Who actually came, fixed after the match: VOY players who didn't, others who did, guests added by mistake. */
export type AttendanceChanges = { absent: string[]; present: string[]; removeGuests: string[] };
export const NO_CHANGES: AttendanceChanges = { absent: [], present: [], removeGuests: [] };

const TEAMS: Team[] = ['blancos', 'color'];
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'es');

export async function listMatchScorers(db: Db, matchIds: string[]): Promise<MatchScorer[]> {
  if (matchIds.length === 0) return [];
  const rows = await db
    .select({
      matchId: matchGoals.matchId,
      team: matchGoals.team,
      userId: matchGoals.userId,
      guestId: matchGoals.guestId,
      userName: shownName,
      guestName: guests.name,
      goals: matchGoals.goals,
    })
    .from(matchGoals)
    .leftJoin(users, eq(users.id, matchGoals.userId))
    .leftJoin(guests, eq(guests.id, matchGoals.guestId))
    .where(inArray(matchGoals.matchId, matchIds));
  return rows
    .map(({ matchId, team, userId, guestId, userName, guestName, goals }) =>
      userId
        ? { matchId, team, kind: 'user' as const, id: userId, name: userName ?? '', goals }
        : { matchId, team, kind: 'guest' as const, id: guestId!, name: guestName ?? '', goals },
    )
    .sort((a, b) => b.goals - a.goals || byName(a, b));
}

/** Teams whose assigned goals exceed the score; fewer is fine (unknown scorers). */
export function scorerExcess(score: { blancos: number; color: number }, scorers: ScorerInput[]): Team[] {
  return TEAMS.filter((team) => scorers.filter((s) => s.team === team).reduce((n, s) => n + s.goals, 0) > score[team]);
}

/** Saves the score, who came and the scorers of a played match in one go. */
export async function saveMatchResult(
  db: Db,
  actorId: string,
  matchId: string,
  score: { blancos: number; color: number },
  scorers: ScorerInput[],
  now: Date = new Date(),
  changes: AttendanceChanges = NO_CHANGES,
) {
  const keys = scorers.map((s) => `${s.team}:${s.kind}:${s.id}`);
  if (new Set(keys).size !== keys.length) throw new DomainError('duplicate');
  if (scorerExcess(score, scorers).length > 0) throw new DomainError('forbidden');
  const absent = new Set(changes.absent);
  const removed = new Set(changes.removeGuests);
  if (scorers.some((s) => (s.kind === 'user' ? absent : removed).has(s.id))) throw new DomainError('forbidden');
  if (changes.present.some((id) => absent.has(id))) throw new DomainError('forbidden');

  await db.transaction(async (tx) => {
    const t = tx as unknown as Db;
    await setMatchResult(t, actorId, matchId, score, now);
    await applyAttendanceChanges(t, actorId, matchId, changes);
    const guestIds = scorers.filter((s) => s.kind === 'guest').map((s) => s.id);
    if (guestIds.length > 0) {
      const own = await t
        .select({ id: guests.id })
        .from(guests)
        .where(and(eq(guests.matchId, matchId), inArray(guests.id, guestIds)));
      if (own.length !== new Set(guestIds).size) throw new DomainError('not_found');
    }
    await t.delete(matchGoals).where(eq(matchGoals.matchId, matchId));
    const rows = scorers
      .filter((s) => s.goals > 0)
      .map((s) => ({
        matchId,
        team: s.team,
        goals: s.goals,
        userId: s.kind === 'user' ? s.id : null,
        guestId: s.kind === 'guest' ? s.id : null,
      }));
    if (rows.length > 0) await t.insert(matchGoals).values(rows);
    await t.insert(auditLog).values({
      actorId,
      action: 'scorers_saved',
      targetId: matchId,
      details: rows.map((r) => `${r.team}:${r.userId ?? r.guestId}x${r.goals}`).join(','),
    });
  });
}

/** Who can be picked as a scorer in each played match: going players, guests, and anyone else on demand. */
export async function scorerCandidates(db: Db, matchIds: string[]) {
  if (matchIds.length === 0) return { going: [], matchGuests: [], players: [] };
  const [going, matchGuests, players] = await Promise.all([
    db
      .select({ matchId: attendances.matchId, id: users.id, name: shownName, team: users.team })
      .from(attendances)
      .innerJoin(users, eq(users.id, attendances.userId))
      .where(and(inArray(attendances.matchId, matchIds), eq(attendances.decision, 'going'))),
    db
      .select({ matchId: guests.matchId, id: guests.id, name: guests.name, hostName: shownName })
      .from(guests)
      .innerJoin(users, eq(users.id, guests.hostId))
      .where(inArray(guests.matchId, matchIds)),
    db
      .select({ id: users.id, name: users.displayName, team: users.team })
      .from(users)
      .where(eq(users.active, true))
      .orderBy(asc(users.displayName)),
  ]);
  return { going, matchGuests, players };
}

async function applyAttendanceChanges(db: Db, actorId: string, matchId: string, changes: AttendanceChanges) {
  const { absent, present, removeGuests } = changes;
  if (absent.length + present.length + removeGuests.length === 0) return;
  if (absent.length > 0) {
    await db
      .update(attendances)
      .set({ decision: 'not_going', updatedAt: new Date() })
      .where(
        and(eq(attendances.matchId, matchId), inArray(attendances.userId, absent), eq(attendances.decision, 'going')),
      );
  }
  if (present.length > 0) {
    const ok = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, present), eq(users.active, true)));
    if (ok.length !== new Set(present).size) throw new DomainError('not_found');
    await db
      .insert(attendances)
      .values(present.map((userId) => ({ matchId, userId, decision: 'going' as const })))
      .onConflictDoUpdate({
        target: [attendances.matchId, attendances.userId],
        set: { decision: 'going', updatedAt: new Date() },
      });
  }
  if (removeGuests.length > 0) {
    // Their goals go with them (cascade).
    await db.delete(guests).where(and(eq(guests.matchId, matchId), inArray(guests.id, removeGuests)));
  }
  await db.insert(auditLog).values({
    actorId,
    action: 'attendance_corrected',
    targetId: matchId,
    details: `absent:${absent.join('|')};present:${present.join('|')};guests:${removeGuests.join('|')}`,
  });
}

/**
 * Per team: players who said VOY for that team (or have no team), the match's guests and existing scorers
 * are listed with a counter; every other active player can be added from a dropdown.
 */
export function buildScorerColumns(
  matchId: string,
  candidates: Awaited<ReturnType<typeof scorerCandidates>>,
  scorers: MatchScorer[],
): Record<Team, ScorerColumn> {
  const out = {} as Record<Team, ScorerColumn>;
  for (const team of TEAMS) {
    const listed = new Map<string, ScorerOption & { goals: number }>();
    const add = (o: ScorerOption, goals = 0) => listed.set(`${o.kind}:${o.id}`, { ...o, goals });
    for (const p of candidates.going) {
      if (p.matchId === matchId && (p.team === team || p.team === null)) add({ kind: 'user', id: p.id, name: p.name });
    }
    for (const g of candidates.matchGuests) {
      if (g.matchId === matchId) add({ kind: 'guest', id: g.id, name: g.name });
    }
    for (const s of scorers) {
      if (s.matchId === matchId && s.team === team) add({ kind: s.kind, id: s.id, name: s.name }, s.goals);
    }
    const extra = candidates.players
      .filter((p) => !listed.has(`user:${p.id}`))
      .map((p) => ({ kind: 'user' as const, id: p.id, name: p.name }));
    out[team] = { listed: [...listed.values()].sort(byName), extra };
  }
  return out;
}

export type TopScorer = { userId: string; name: string; team: Team | null; goals: number; rank: number };

/** Standard competition ranking (1, 2, 2, 4) over rows sorted by goals, keeping everyone ranked within `limit`. */
export function rankScorers<T extends { goals: number }>(rows: T[], limit: number): (T & { rank: number })[] {
  const out: (T & { rank: number })[] = [];
  rows.forEach((r, i) => {
    out.push({ ...r, rank: i > 0 && r.goals === rows[i - 1].goals ? out[i - 1].rank : i + 1 });
  });
  return out.filter((r) => r.rank <= limit);
}

/** Pichichi: registered players only (guests have no profile), since results started. */
export async function topScorers(db: Db, limit = 5): Promise<TopScorer[]> {
  const total = sql<number>`sum(${matchGoals.goals})::int`;
  const rows = await db
    .select({ userId: users.id, name: shownName, team: users.team, goals: total })
    .from(matchGoals)
    .innerJoin(matches, eq(matches.id, matchGoals.matchId))
    .innerJoin(users, eq(users.id, matchGoals.userId))
    .where(gte(matches.startsAt, resultsFrom()))
    .groupBy(users.id)
    .orderBy(desc(total), asc(users.displayName));
  return rankScorers(rows, limit);
}

export async function playerGoals(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ goals: sql<number>`coalesce(sum(${matchGoals.goals}), 0)::int` })
    .from(matchGoals)
    .innerJoin(matches, eq(matches.id, matchGoals.matchId))
    .where(and(eq(matchGoals.userId, userId), gte(matches.startsAt, resultsFrom())));
  return row?.goals ?? 0;
}
