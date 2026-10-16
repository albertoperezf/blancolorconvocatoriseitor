import { z } from 'zod';
import { POSITIONS } from './positions';

export const TEAMS = ['blancos', 'color'] as const;
export const DECISIONS = ['going', 'maybe', 'not_going'] as const;

export const usernameSchema = z
  .string()
  .trim()
  .min(2, 'username.min')
  .max(30, 'username.max')
  .regex(/^[\p{L}\p{N}._-]+$/u, 'username.chars')
  .transform((v) => v.toUpperCase());

export const passwordSchema = z.string().min(12, 'password.min').max(128, 'password.max');

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .transform((v) => v.toUpperCase()),
  password: z.string().min(1).max(128),
});

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'password.mismatch', path: ['confirm'] });

export const changePasswordSchema = z
  .object({ current: z.string().min(1).max(128), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'password.mismatch', path: ['confirm'] });

export const teamSchema = z.enum(TEAMS, { message: 'team.required' });

export const positionSchema = z.enum(POSITIONS, { message: 'position.required' });

export const decisionSchema = z.enum(DECISIONS).nullable();

export const guestNameSchema = z
  .string()
  .trim()
  .min(2, 'guest.min')
  .max(30, 'guest.max')
  .regex(/^[\p{L}][\p{L} .'-]*$/u, 'guest.chars')
  .transform((v) => v.replace(/\s+/g, ' '));

export const displayNameSchema = z.string().trim().min(2, 'displayName.min').max(40, 'displayName.max');

export const enrolSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  team: teamSchema.optional(),
  role: z.enum(['player', 'admin']).default('player'),
});

export const adminUpdateUserSchema = z.object({
  displayName: displayNameSchema,
  team: teamSchema.nullable(),
  role: z.enum(['player', 'admin']),
  longTermAbsence: z.boolean(),
  absenceNote: z.string().trim().max(200).nullable(),
  canBringGuests: z.boolean(),
  active: z.boolean(),
});

export const settingsSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  kickoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'settings.time'),
  venue: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  rolloverHours: z.coerce.number().int().min(0).max(48),
});

const goalsSchema = z
  .string()
  .trim()
  .min(1, 'result.required')
  .regex(/^\d{1,2}$/, 'result.goals')
  .transform(Number);

export const resultSchema = z.object({ blancos: goalsSchema, color: goalsSchema });

/** Answer sent by the service worker from a reminder's "Voy" / "No voy" buttons. */
export const pushAnswerSchema = z.object({
  decision: z.enum(['going', 'not_going']),
  matchId: z.uuid(),
});

export const scorersSchema = z
  .array(
    z.object({
      team: teamSchema,
      kind: z.enum(['user', 'guest']),
      id: z.uuid(),
      goals: z.number().int().min(1).max(99),
    }),
  )
  .max(100);

/** The scorers form field carries JSON; anything malformed is null. */
export function parseScorers(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = scorersSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'contact.name').max(60, 'contact.name'),
  email: z.string().trim().max(120, 'contact.email').pipe(z.email('contact.email')),
  message: z.string().trim().min(10, 'contact.message').max(1000, 'contact.message'),
});

/** Maps zod issues to { field: messageKey } for form UIs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
