import type { Decision, Position, Team } from '@/lib/db/schema';

export type SquadPlayer = {
  id: string;
  displayName: string;
  team: Team | null;
  position?: Position | null;
  longTermAbsence: boolean;
  decision: Decision | null;
};

export type SquadGuest = { id: string; name: string; hostId: string; hostName: string };

export type Squad = {
  blancos: SquadPlayer[];
  color: SquadPlayer[];
  noTeam: SquadPlayer[];
  guests: SquadGuest[];
  notGoing: SquadPlayer[];
  maybe: SquadPlayer[];
  absent: SquadPlayer[];
  undecided: SquadPlayer[];
};

const byName = (a: { displayName: string }, b: { displayName: string }) =>
  a.displayName.localeCompare(b.displayName, 'es');

export function groupSquad(players: SquadPlayer[], guests: SquadGuest[]): Squad {
  const squad: Squad = {
    blancos: [],
    color: [],
    noTeam: [],
    guests: [...guests].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    notGoing: [],
    maybe: [],
    absent: [],
    undecided: [],
  };

  for (const p of [...players].sort(byName)) {
    if (p.decision === 'going') {
      if (p.team === 'blancos') squad.blancos.push(p);
      else if (p.team === 'color') squad.color.push(p);
      else squad.noTeam.push(p);
    } else if (p.decision === 'maybe') squad.maybe.push(p);
    else if (p.decision === 'not_going') squad.notGoing.push(p);
    // A long-term absence only matters while the player hasn't answered.
    else if (p.longTermAbsence) squad.absent.push(p);
    else squad.undecided.push(p);
  }
  return squad;
}

export function goingCount(squad: Squad): number {
  return squad.blancos.length + squad.color.length + squad.noTeam.length + squad.guests.length;
}
