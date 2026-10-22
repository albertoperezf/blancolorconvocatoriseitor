import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { setAttendanceAction } from '@/actions/player';
import { CancelledBanner } from '@/components/cancelled-banner';
import { GuestManager } from '@/components/guest-manager';
import { MatchHeader } from '@/components/match-header';
import { PushBanner } from '@/components/push/push-banner';
import { SquadView } from '@/components/squad-view';
import { StatusSelector } from '@/components/status-selector';
import { requireUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getCancelledMatch, getSettings, getSquad } from '@/lib/match/queries';
import { goingCount } from '@/lib/match/squad';
import { vapidPublicKey } from '@/lib/push/service';
import { getMyDecision, getMyGuests } from '@/lib/services/player';

export const metadata: Metadata = { title: 'Mi partido' };

export default async function MatchPage() {
  const user = await requireUser();
  const db = await getDb();
  const [t, settings, match, cancelled] = await Promise.all([
    getTranslations(),
    getSettings(db),
    ensureCurrentMatch(db),
    getCancelledMatch(db),
  ]);
  const [squad, decision, guests] = await Promise.all([
    getSquad(db, match.id),
    getMyDecision(db, user.id, match.id),
    user.canBringGuests ? getMyGuests(db, user.id, match.id) : [],
  ]);

  return (
    <>
      <p className="text-lg font-semibold">{t('match.greeting', { name: user.displayName })}</p>
      {cancelled && <CancelledBanner match={cancelled} timezone={settings.timezone} />}
      {/* Desktop: answering sits beside the match details; phones keep it as a bar fixed to the bottom. */}
      <div className="card mt-2 md:grid md:grid-cols-2">
        <div className="md:pr-6 lg:pr-8">
          <MatchHeader
            match={match}
            timezone={settings.timezone}
            address={settings.address}
            counts={{ going: goingCount(squad), maybe: squad.maybe.length, notGoing: squad.notGoing.length }}
          />
        </div>
        <div data-match-id={match.id} className="md:border-l md:border-border md:pl-6 lg:pl-8">
          <StatusSelector key={match.id} initial={decision} onSave={setAttendanceAction} />
        </div>
      </div>
      <SquadView squad={squad} meId={user.id} ctaHref="#tu-respuesta" />
      <PushBanner publicKey={vapidPublicKey()} />
      {user.canBringGuests && <GuestManager guests={guests} />}
    </>
  );
}
