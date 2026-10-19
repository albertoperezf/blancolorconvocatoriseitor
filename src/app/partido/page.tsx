import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setAttendanceAction } from '@/actions/player';
import { GuestManager } from '@/components/guest-manager';
import { MatchHeader } from '@/components/match-header';
import { PushBanner } from '@/components/push/push-banner';
import { SquadView } from '@/components/squad-view';
import { StatusSelector } from '@/components/status-selector';
import { requireUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getSettings, getSquad } from '@/lib/match/queries';
import { goingCount } from '@/lib/match/squad';
import { vapidPublicKey } from '@/lib/push/service';
import { getMyDecision, getMyGuests } from '@/lib/services/player';

export const metadata: Metadata = { title: 'Mi partido' };

export default async function MatchPage() {
  const user = await requireUser();
  const db = await getDb();
  const [t, settings, match] = await Promise.all([getTranslations(), getSettings(db), ensureCurrentMatch(db)]);
  const [squad, decision, guests] = await Promise.all([
    getSquad(db, match.id),
    getMyDecision(db, user.id, match.id),
    user.canBringGuests ? getMyGuests(db, user.id, match.id) : [],
  ]);

  return (
    <>
      <p className="text-lg font-semibold">{t('match.greeting', { name: user.displayName })}</p>
      <div className="card mt-2">
        <MatchHeader
          match={match}
          timezone={settings.timezone}
          address={settings.address}
          counts={{ going: goingCount(squad), maybe: squad.maybe.length, notGoing: squad.notGoing.length }}
        />
      </div>
      <SquadView squad={squad} meId={user.id} ctaHref="#tu-respuesta" />
      <PushBanner publicKey={vapidPublicKey()} />
      <div data-match-id={match.id} className="contents">
        <StatusSelector key={match.id} initial={decision} onSave={setAttendanceAction} />
      </div>
      {user.canBringGuests && <GuestManager guests={guests} />}
    </>
  );
}
