import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AutoRefresh } from '@/components/auto-refresh';
import { FaqList } from '@/components/faq-list';
import { MatchHeader } from '@/components/match-header';
import { SquadView } from '@/components/squad-view';
import { getCurrentUser } from '@/lib/auth/current';
import { getDb } from '@/lib/db';
import { ensureCurrentMatch, getSettings, getSquad } from '@/lib/match/queries';
import { goingCount } from '@/lib/match/squad';
import { listFaqs } from '@/lib/services/content';

export default async function HomePage() {
  const db = await getDb();
  const [t, user, settings, match, faqs] = await Promise.all([
    getTranslations('match'),
    getCurrentUser(),
    getSettings(db),
    ensureCurrentMatch(db),
    listFaqs(db),
  ]);
  const squad = await getSquad(db, match.id);

  return (
    <>
      <div className="card flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <MatchHeader match={match} timezone={settings.timezone} address={settings.address} />
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="font-semibold tabular-nums">
            {t('summary', { going: goingCount(squad), maybe: squad.maybe.length, notGoing: squad.notGoing.length })}
          </p>
          <Link href={user ? '/partido' : '/login'} className="btn-primary">
            {t('answerCta')}
          </Link>
        </div>
      </div>
      <SquadView squad={squad} />
      <p className="mt-3 text-sm text-muted">{t('liveHint')}</p>
      <FaqList faqs={faqs} />
      <AutoRefresh />
    </>
  );
}
