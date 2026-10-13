import { describe, expect, it } from 'vitest';
import { goingCount, groupSquad, type SquadPlayer } from '@/lib/match/squad';

const p = (displayName: string, extra: Partial<SquadPlayer> = {}): SquadPlayer => ({
  id: displayName,
  displayName,
  team: 'blancos',
  longTermAbsence: false,
  decision: null,
  ...extra,
});

describe('groupSquad', () => {
  const squad = groupSquad(
    [
      p('ZOE', { decision: 'going' }),
      p('ÁLVARO', { decision: 'going' }),
      p('COLORIN', { team: 'color', decision: 'going' }),
      p('SINEQUIPO', { team: null, decision: 'going' }),
      p('DUDOSO', { decision: 'maybe' }),
      p('NOVOY', { decision: 'not_going' }),
      p('BAJA', { longTermAbsence: true }),
      p('BAJAQUEVA', { longTermAbsence: true, decision: 'going' }),
      p('CALLADO'),
    ],
    [{ id: 'g1', name: 'Pepe', hostId: 'ZOE', hostName: 'ZOE' }],
  );

  it('splits going players by their own team, sorted with Spanish collation', () => {
    expect(squad.blancos.map((x) => x.displayName)).toEqual(['ÁLVARO', 'BAJAQUEVA', 'ZOE']);
    expect(squad.color.map((x) => x.displayName)).toEqual(['COLORIN']);
    expect(squad.noTeam.map((x) => x.displayName)).toEqual(['SINEQUIPO']);
  });

  it('lists long-term absences apart only while they have not answered', () => {
    expect(squad.absent.map((x) => x.displayName)).toEqual(['BAJA']);
    expect(squad.undecided.find((x) => x.displayName === 'BAJA')).toBeUndefined();
  });

  it('groups maybe, not going and undecided players', () => {
    expect(squad.maybe.map((x) => x.displayName)).toEqual(['DUDOSO']);
    expect(squad.notGoing.map((x) => x.displayName)).toEqual(['NOVOY']);
    expect(squad.undecided.map((x) => x.displayName)).toEqual(['CALLADO']);
  });

  it('counts guests as going', () => {
    expect(goingCount(squad)).toBe(6);
  });
});
