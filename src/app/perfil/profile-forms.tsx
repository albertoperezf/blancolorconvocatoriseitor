'use client';

import { useTranslations } from 'next-intl';
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { idle, type FormState } from '@/actions/form-state';
import { changePasswordAction, closeOtherSessionsAction, updatePlayingAction } from '@/actions/player';
import {
  Notice,
  PasswordField,
  TeamSelect,
  useAutoHide,
  useFocusAfterSubmit,
  useMessage,
  useSubmitKeepingValues,
} from '@/components/form';
import { LockIcon, PositionIcon, ShirtIcon } from '@/components/icons';
import type { Position, Team } from '@/lib/db/schema';
import { POSITIONS } from '@/lib/positions';

function Result({ state }: { state: FormState }) {
  const msg = useMessage();
  const visible = useAutoHide(state);
  return (
    <div role="status" aria-live="polite">
      {state.status === 'success' && state.message && visible && <Notice tone="success">{msg(state.message)}</Notice>}
    </div>
  );
}

type Playing = { team: string; position: string };

const readPlaying = (form: HTMLFormElement): Playing => {
  const data = new FormData(form);
  return { team: String(data.get('team') ?? ''), position: String(data.get('position') ?? '') };
};

/** Team and position share one save; "Guardar" only enables once something differs from what's saved. */
export function PlayingForm({
  team,
  position,
  onSaved,
}: {
  team: string | null;
  position: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(updatePlayingAction, idle);
  const submit = useSubmitKeepingValues(formAction, state);
  const [saved, setSaved] = useState<Playing>({ team: team ?? '', position: position ?? '' });
  const [current, setCurrent] = useState<Playing>(saved);
  const submitted = useRef<Playing>(saved);
  const dirty = current.team !== saved.team || current.position !== saved.position;
  const teamError = state.status === 'error' ? msg(state.errors?.team) : undefined;
  const positionError = state.status === 'error' ? msg(state.errors?.position) : undefined;

  useEffect(() => {
    if (state.status === 'success') {
      setSaved(submitted.current);
      onSaved();
    }
  }, [state, onSaved]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    submitted.current = readPlaying(e.currentTarget);
    submit(e);
  };

  return (
    <form
      onSubmit={onSubmit}
      onChange={(e) => setCurrent(readPlaying(e.currentTarget))}
      className="flex flex-col gap-4"
      noValidate
    >
      <TeamSelect label={t('profile.team')} defaultValue={team} error={teamError} />
      <fieldset aria-describedby={positionError ? 'position-error' : undefined}>
        <legend className="label">{t('profile.position')}</legend>
        {/* One column on very narrow phones so "Mediocampo" isn't clipped. */}
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          {POSITIONS.map((p) => (
            <label key={p}>
              <input type="radio" name="position" value={p} defaultChecked={position === p} className="peer sr-only" />
              <span className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 border-border bg-surface px-3 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-fg peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand sm:text-base">
                <PositionIcon position={p} className="size-5 shrink-0" />
                {t(`positions.${p}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {positionError && (
        <p id="position-error" className="text-sm font-semibold text-danger">
          {positionError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || !dirty}>
          {t('profile.save')}
        </button>
        {dirty && !pending && <span className="text-sm font-semibold text-maybe">{t('profile.unsaved')}</span>}
      </div>
    </form>
  );
}

export function ChangePasswordForm({ username, onSaved }: { username: string; onSaved: () => void }) {
  const t = useTranslations();
  const msg = useMessage();
  const [state, formAction, pending] = useActionState(changePasswordAction, idle);
  const onSubmit = useSubmitKeepingValues(formAction, state);
  const formRef = useRef<HTMLFormElement>(null);
  const err = (f: string) => msg(state.errors?.[f]);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      onSaved();
    }
  }, [state, onSaved]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="text" name="username" value={username} autoComplete="username" readOnly hidden />
      <PasswordField
        name="current"
        label={t('profile.current')}
        autoComplete="current-password"
        required
        error={err('current')}
      />
      <PasswordField
        name="password"
        label={t('profile.new')}
        hint={t('errors.password.min')}
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
        error={err('password')}
      />
      <PasswordField
        name="confirm"
        label={t('profile.confirm')}
        autoComplete="new-password"
        required
        error={err('confirm')}
      />
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {t('profile.save')}
      </button>
    </form>
  );
}

export function CloseSessionsForm() {
  const t = useTranslations('profile');
  const [state, formAction, pending] = useActionState(closeOtherSessionsAction, idle);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusAfterSubmit(formRef, state);
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <button type="submit" className="btn-secondary self-start" disabled={pending}>
        {t('closeOthers')}
      </button>
      <Result state={state} />
    </form>
  );
}

/**
 * Rarely-used Perfil section folded into one row. Opens itself for its `#hash` links; `useFoldAfterSave`
 * collapses it after a save and shows the confirmation under the row.
 */
function ProfileAccordion({
  id,
  hashes,
  icon,
  title,
  meta,
  notice,
  detailsRef,
  children,
}: {
  id: string;
  hashes: string[];
  icon: ReactNode;
  title: string;
  meta?: string;
  notice?: string;
  detailsRef: RefObject<HTMLDetailsElement | null>;
  children: ReactNode;
}) {
  useEffect(() => {
    if (detailsRef.current && hashes.includes(window.location.hash)) {
      detailsRef.current.open = true;
      detailsRef.current.scrollIntoView({ block: 'start' });
    }
  }, [detailsRef, hashes]);

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="card mt-4 scroll-mt-20 p-0 sm:p-0">
      <details ref={detailsRef} className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
          {icon}
          <span className="min-w-0">
            <span id={`${id}-heading`} className="block text-xl font-extrabold">
              {title}
            </span>
            {meta && <span className="block truncate text-sm text-muted">{meta}</span>}
          </span>
          <span aria-hidden className="ml-auto text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">{children}</div>
      </details>
      <div role="status" aria-live="polite">
        {notice && (
          <div className="px-4 pb-4 sm:px-6">
            <Notice tone="success">{notice}</Notice>
          </div>
        )}
      </div>
    </section>
  );
}

function useFoldAfterSave() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const visible = useAutoHide(savedAt);
  const onSaved = useCallback(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
      detailsRef.current.querySelector('summary')?.focus();
    }
    setSavedAt(Date.now());
  }, []);
  return { detailsRef, onSaved, showNotice: savedAt !== null && visible };
}

const PLAYING_HASHES = ['#equipo'];
const SECURITY_HASHES = ['#seguridad', '#cambiar-contrasena'];

/** Set once and rarely changed, so folded; the row shows the current team and position. */
export function PlayingSection({ team, position }: { team: Team | null; position: Position | null }) {
  const t = useTranslations();
  const { detailsRef, onSaved, showNotice } = useFoldAfterSave();
  const meta = [
    team ? t(`teams.${team}`) : t('teams.none'),
    position ? t(`positions.${position}`) : t('profile.noPosition'),
  ].join(' · ');
  return (
    <ProfileAccordion
      id="equipo"
      hashes={PLAYING_HASHES}
      icon={
        <ShirtIcon filled={team === 'color'} className={`size-5 shrink-0 ${team === 'color' ? 'text-brand' : ''}`} />
      }
      title={t('profile.playingHeading')}
      meta={meta}
      notice={showNotice ? t('profile.playingSaved') : undefined}
      detailsRef={detailsRef}
    >
      <PlayingForm team={team} position={position} onSaved={onSaved} />
    </ProfileAccordion>
  );
}

/** Rarely used, so folded: password change + closing other sessions. */
export function SecuritySection({ username }: { username: string }) {
  const t = useTranslations('profile');
  const { detailsRef, onSaved, showNotice } = useFoldAfterSave();
  return (
    <ProfileAccordion
      id="seguridad"
      hashes={SECURITY_HASHES}
      icon={<LockIcon className="size-5 shrink-0 text-brand" />}
      title={t('securityHeading')}
      notice={showNotice ? t('passwordSaved') : undefined}
      detailsRef={detailsRef}
    >
      <section id="cambiar-contrasena" aria-labelledby="password-heading">
        <h2 id="password-heading" className="mb-3 text-lg font-extrabold">
          {t('passwordHeading')}
        </h2>
        <ChangePasswordForm username={username} onSaved={onSaved} />
      </section>
      <section aria-labelledby="sessions-heading" className="mt-6 border-t border-border pt-6">
        <h2 id="sessions-heading" className="text-lg font-extrabold">
          {t('sessionsHeading')}
        </h2>
        <p className="mt-1 mb-3 text-muted">{t('sessionsHint')}</p>
        <CloseSessionsForm />
      </section>
    </ProfileAccordion>
  );
}
