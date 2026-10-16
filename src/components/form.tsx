'use client';

import { useTranslations } from 'next-intl';
import { startTransition, useEffect, useId, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react';

/** `<form action>` auto-resets after every submit, even on validation errors; onSubmit keeps the values. */
export function useSubmitKeepingValues(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}

export const NOTICE_MS = 15_000;

/** False once `ms` have passed since `trigger` last changed (e.g. a new action state), so notices fade out. */
export function useAutoHide(trigger: unknown, ms = NOTICE_MS) {
  const [expired, setExpired] = useState<unknown>(undefined);
  useEffect(() => {
    const id = window.setTimeout(() => setExpired(() => trigger), ms);
    return () => window.clearTimeout(id);
  }, [trigger, ms]);
  return expired !== trigger;
}

/** Resolves a message key from a FormState: tries `errors.<key>` first, then the key itself. */
export function useMessage() {
  const t = useTranslations();
  return (key: string | undefined, values?: Record<string, string>) => {
    if (!key) return undefined;
    if (t.has(`errors.${key}`)) return t(`errors.${key}`, values);
    if (t.has(key)) return t(key, values);
    return t('errors.generic');
  };
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  /** Short hints can sit on the label's line instead of between the label and the input. */
  hintInline?: boolean;
};

export function Field({ label, name, error, hint, hintInline = false, id, ...input }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? `${name}-${autoId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div>
      {hint && hintInline ? (
        <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2">
          <label htmlFor={inputId} className="font-semibold">
            {label}
          </label>
          <p id={hintId} className="text-sm text-muted">
            {hint}
          </p>
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="label">
            {label}
          </label>
          {hint && (
            <p id={hintId} className="mb-1 text-sm text-muted">
              {hint}
            </p>
          )}
        </>
      )}
      <input
        id={inputId}
        name={name}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, 'type'>) {
  const t = useTranslations('login');
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // A native form reset unticks the checkbox without React noticing; hide the password again too.
  useEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const hide = () => setVisible(false);
    form.addEventListener('reset', hide);
    return () => form.removeEventListener('reset', hide);
  }, []);

  return (
    <div ref={ref}>
      <Field {...props} type={visible ? 'text' : 'password'} />
      <label className="mt-2 inline-flex min-h-6 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="size-5" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
        {t('showPassword')}
      </label>
    </div>
  );
}

export function TeamSelect({
  name = 'team',
  label,
  defaultValue,
  error,
  allowNone = false,
}: {
  name?: string;
  label: string;
  defaultValue?: string | null;
  error?: string;
  allowNone?: boolean;
}) {
  const t = useTranslations('teams');
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <select
        id={id}
        name={name}
        className="input"
        defaultValue={defaultValue ?? ''}
        required={!allowNone}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      >
        <option value="" disabled={!allowNone}>
          {allowNone ? t('none') : t('choose')}
        </option>
        <option value="blancos">{t('blancos')}</option>
        <option value="color">{t('color')}</option>
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Notice({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const styles = tone === 'success' ? 'bg-success-bg text-going' : 'bg-danger-bg text-danger';
  return <p className={`rounded-xl px-4 py-3 font-semibold ${styles}`}>{children}</p>;
}

/** Always-mounted live region so screen readers announce results of async actions. */
export function LiveRegion({ children, assertive = false }: { children?: React.ReactNode; assertive?: boolean }) {
  return (
    <div role={assertive ? 'alert' : 'status'} aria-live={assertive ? 'assertive' : 'polite'} aria-atomic="true">
      {children}
    </div>
  );
}
