import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CancelledBanner } from '@/components/cancelled-banner';
import { MatchHeader } from '@/components/match-header';
import { SquadView } from '@/components/squad-view';
import { getCurrentUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getCancelledMatch, getSettings, getSquad } from '@/lib/match/queries';
import { goingCount } from '@/lib/match/squad';

export const metadata: Metadata = { alternates: { canonical: '/' } };

/** Public view of the match; logged-in players go straight to Mi partido, where they can answer. */
export default async function HomePage() {
  if (await getCurrentUser()) redirect('/partido');
  const db = await getDb();
  const [t, settings, match, cancelled] = await Promise.all([
    getTranslations('match'),
    getSettings(db),
    ensureCurrentMatch(db),
    getCancelledMatch(db),
  ]);
  const squad = await getSquad(db, match.id);

  return (
    <>
      {cancelled && (
        <div className="mb-2 *:mt-0">
          <CancelledBanner match={cancelled} timezone={settings.timezone} />
        </div>
      )}
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <MatchHeader
          match={match}
          timezone={settings.timezone}
          address={settings.address}
          counts={{ going: goingCount(squad), maybe: squad.maybe.length, notGoing: squad.notGoing.length }}
        />
        <Link href="/login" className="btn-primary sm:self-end">
          {t('answerCta')}
        </Link>
      </div>
      <SquadView squad={squad} ctaHref="/login" />
    </>
  );
}
