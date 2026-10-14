import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MatchHeader } from '@/components/match-header';
import { SquadView } from '@/components/squad-view';
import { getCurrentUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getSettings, getSquad } from '@/lib/match/queries';
import { goingCount } from '@/lib/match/squad';
import { getMyDecision } from '@/lib/services/player';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const DECISION_COLOR = { going: 'text-going', maybe: 'text-maybe', not_going: 'text-notgoing' } as const;

export default async function HomePage() {
  const db = await getDb();
  const [t, tStatus, user, settings, match] = await Promise.all([
    getTranslations('match'),
    getTranslations('status'),
    getCurrentUser(),
    getSettings(db),
    ensureCurrentMatch(db),
  ]);
  const [squad, decision] = await Promise.all([
    getSquad(db, match.id),
    user ? getMyDecision(db, user.id, match.id) : null,
  ]);

  return (
    <>
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <MatchHeader
          match={match}
          timezone={settings.timezone}
          address={settings.address}
          counts={{ going: goingCount(squad), maybe: squad.maybe.length, notGoing: squad.notGoing.length }}
        />
        <div className="flex flex-col gap-2 sm:items-end">
          {decision && (
            <p className="text-sm">
              {t.rich('yourAnswer', {
                status: tStatus(decision),
                strong: (chunks) => <strong className={DECISION_COLOR[decision]}>{chunks}</strong>,
              })}
            </p>
          )}
          <Link href={user ? '/partido' : '/login'} className="btn-primary">
            {decision ? t('changeCta') : t('answerCta')}
          </Link>
        </div>
      </div>
      <SquadView squad={squad} meId={user?.id} ctaHref={user ? '/partido' : '/login'} />
    </>
  );
}
