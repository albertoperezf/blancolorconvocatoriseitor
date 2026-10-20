'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { saveResultAction } from '@/actions/admin';
import { idle } from '@/actions/form-state';
import { Field, useAutoHide, useMessage, useSubmitKeepingValues } from '@/components/form';
import { Reveal } from '@/components/reveal';
import type { Team } from '@/lib/db/schema';
import type { ScorerColumn, ScorerOption } from '@/lib/match/goals';
import { AttendanceEditor, type Attendee, type MatchGuest } from './attendance-editor';
import { ScorersEditor } from './scorers-editor';

type Props = {
  matchId: string;
  legend: string;
  blancos: number | null;
  color: number | null;
  scorers: Record<Team, ScorerColumn>;
  attendance: { going: Attendee[]; guests: MatchGuest[]; others: Attendee[] };
  defaultOpen?: boolean;
  /** Shown under the toggle, e.g. until when it can still be edited. */
  note?: string;
};

const asGoals = (v: string) => (/^\d{1,2}$/.test(v.trim()) ? Number(v) : null);
const toggle = (set: Set<string>, id: string) => {
  const next = new Set(set);
  if (!next.delete(id)) next.add(id);
  return next;
};

/** Folded behind "Editar resultado" so the list stays short; the latest match starts open while it has no result. */
export function ResultForm({ matchId, legend, blancos, color, scorers, attendance, defaultOpen = false, note }: Props) {
  const t = useTranslations('results');
  const msg = useMessage();
  const [open, setOpen] = useState(defaultOpen);
  const [state, formAction, pending] = useActionState(saveResultAction.bind(null, matchId), idle);
  const onSubmit = useSubmitKeepingValues(formAction, state);
  const noticeVisible = useAutoHide(state);
  const err = (f: string) => (state.status === 'error' ? msg(state.errors?.[f]) : undefined);
  const [score, setScore] = useState({ blancos: String(blancos ?? ''), color: String(color ?? '') });
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [present, setPresent] = useState<Attendee[]>([]);
  const [removedGuests, setRemovedGuests] = useState<Set<string>>(new Set());
  const [savedState, setSavedState] = useState(state);

  // Once saved, the page data already reflects who came; start the next edit from there.
  if (state !== savedState) {
    setSavedState(state);
    if (state.status === 'success') {
      setAbsent(new Set());
      setPresent([]);
      setRemovedGuests(new Set());
    }
  }

  const hidden = new Set([...[...absent].map((id) => `user:${id}`), ...[...removedGuests].map((id) => `guest:${id}`)]);
  const promoted: Record<Team, ScorerOption[]> = { blancos: [], color: [] };
  for (const a of present) {
    for (const team of a.team ? [a.team] : (['blancos', 'color'] as const)) {
      promoted[team].push({ kind: 'user', id: a.id, name: a.name });
    }
  }
  const changes = { absent: [...absent], present: present.map((a) => a.id), removeGuests: [...removedGuests] };

  return (
    <div className="mt-4 border-t border-border pt-2">
      <button
        type="button"
        className="btn-ghost group/edit min-h-11"
        aria-expanded={open}
        aria-controls={`result-${matchId}`}
        onClick={() => setOpen((o) => !o)}
      >
        {blancos === null || color === null ? t('enter') : t('edit')}
        <span aria-hidden className="text-muted transition-transform group-aria-expanded/edit:rotate-180">
          ▾
        </span>
      </button>
      {note && <p className="text-xs text-muted">{note}</p>}
      <Reveal open={open}>
        <form id={`result-${matchId}`} onSubmit={onSubmit} className="pt-2" noValidate>
          <fieldset>
            <legend className="sr-only">{legend}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field
                name="blancos"
                label={t('blancosGoals')}
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                required
                value={score.blancos}
                onChange={(e) => setScore((s) => ({ ...s, blancos: e.target.value }))}
                error={err('blancos')}
              />
              <Field
                name="color"
                label={t('colorGoals')}
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                required
                value={score.color}
                onChange={(e) => setScore((s) => ({ ...s, color: e.target.value }))}
                error={err('color')}
              />
            </div>
          </fieldset>
          <input type="hidden" name="attendance" value={JSON.stringify(changes)} />
          <AttendanceEditor
            {...attendance}
            absent={absent}
            present={present}
            removedGuests={removedGuests}
            onToggleAbsent={(id) => setAbsent((s) => toggle(s, id))}
            onAddPresent={(player) => setPresent((p) => [...p, player])}
            onRemovePresent={(id) => setPresent((p) => p.filter((a) => a.id !== id))}
            onToggleGuest={(id) => setRemovedGuests((s) => toggle(s, id))}
          />
          <ScorersEditor
            initial={scorers}
            score={{ blancos: asGoals(score.blancos), color: asGoals(score.color) }}
            error={err('scorers')}
            hidden={hidden}
            promoted={promoted}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={pending}>
              {t('save')}
            </button>
            <p role="status" aria-live="polite" className="text-sm font-semibold">
              {state.status === 'success' && noticeVisible && <span className="text-going">{msg(state.message)}</span>}
              {state.status === 'error' && state.message && <span className="text-danger">{msg(state.message)}</span>}
            </p>
          </div>
        </form>
      </Reveal>
    </div>
  );
}
