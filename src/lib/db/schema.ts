import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { POSITIONS } from '../positions';

export const roleEnum = pgEnum('role', ['player', 'admin']);
export const teamEnum = pgEnum('team', ['blancos', 'color']);
export const decisionEnum = pgEnum('decision', ['going', 'maybe', 'not_going']);
export const positionEnum = pgEnum('position', POSITIONS);

export type Role = (typeof roleEnum.enumValues)[number];
export type Team = (typeof teamEnum.enumValues)[number];
export type Decision = (typeof decisionEnum.enumValues)[number];
export type Position = (typeof positionEnum.enumValues)[number];

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  // Stored upper-cased, like the legacy site.
  username: varchar({ length: 30 }).notNull().unique(),
  displayName: varchar({ length: 40 }).notNull(),
  // Null until the player sets a password through a reset link.
  passwordHash: text(),
  mustChangePassword: boolean().notNull().default(false),
  role: roleEnum().notNull().default('player'),
  team: teamEnum(),
  position: positionEnum(),
  longTermAbsence: boolean().notNull().default(false),
  absenceNote: varchar({ length: 200 }),
  canBringGuests: boolean().notNull().default(true),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const sessions = pgTable('sessions', {
  // sha256(token); the raw token only lives in the cookie.
  id: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const settings = pgTable('settings', {
  id: smallint().primaryKey().default(1),
  weekday: smallint().notNull(),
  kickoffTime: varchar({ length: 5 }).notNull(),
  timezone: text().notNull().default('Europe/Madrid'),
  venue: varchar({ length: 100 }).notNull(),
  address: varchar({ length: 200 })
    .notNull()
    .default('C. de José del Hierro, 5, Ciudad Lineal, 28027 Concepción, Madrid'),
  rolloverHours: smallint().notNull().default(2),
});

export const matches = pgTable('matches', {
  id: uuid().primaryKey().defaultRandom(),
  startsAt: timestamp({ withTimezone: true }).notNull().unique(),
  venue: varchar({ length: 100 }).notNull(),
  // Null until an admin records the result.
  blancosGoals: smallint(),
  colorGoals: smallint(),
});

export const attendances = pgTable(
  'attendances',
  {
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    decision: decisionEnum().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.userId] })],
);

export const guests = pgTable('guests', {
  id: uuid().primaryKey().defaultRandom(),
  matchId: uuid()
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  hostId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar({ length: 30 }).notNull(),
  createdAt: createdAt(),
});

export const matchGoals = pgTable(
  'match_goals',
  {
    id: uuid().primaryKey().defaultRandom(),
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    // The side the goals counted for, fixed at the time so later team changes don't rewrite history.
    team: teamEnum().notNull(),
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    guestId: uuid().references(() => guests.id, { onDelete: 'cascade' }),
    goals: smallint().notNull(),
  },
  (t) => [
    unique().on(t.matchId, t.team, t.userId),
    unique().on(t.matchId, t.team, t.guestId),
    check('match_goals_one_scorer', sql`(${t.userId} is null) <> (${t.guestId} is null)`),
    check('match_goals_positive', sql`${t.goals} > 0`),
  ],
);

export const faqs = pgTable('faqs', {
  id: serial().primaryKey(),
  question: text().notNull(),
  answer: text().notNull(),
  position: integer().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  tokenHash: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdBy: uuid().references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  usedAt: timestamp({ withTimezone: true }),
});

export const passwordResetRequests = pgTable('password_reset_requests', {
  // One pending request per player; asking again just refreshes the time.
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  requestedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: serial().primaryKey(),
  actorId: uuid().references(() => users.id, { onDelete: 'set null' }),
  action: varchar({ length: 50 }).notNull(),
  targetId: uuid(),
  details: text(),
  at: createdAt(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial().primaryKey(),
  name: varchar({ length: 60 }).notNull(),
  email: varchar({ length: 120 }).notNull(),
  message: varchar({ length: 1000 }).notNull(),
  createdAt: createdAt(),
});

/** One row per browser/device with avisos enabled; a player can have several. */
export const pushSubscriptions = pgTable('push_subscriptions', {
  endpoint: text().primaryKey(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  p256dh: text().notNull(),
  auth: text().notNull(),
  createdAt: createdAt(),
});

/** Makes each scheduled reminder idempotent: at most one send per match and kind. */
export const reminderSends = pgTable(
  'reminder_sends',
  {
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    kind: varchar({ length: 20 }).notNull(),
    sentAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.kind] })],
);
