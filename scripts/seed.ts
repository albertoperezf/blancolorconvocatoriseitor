import { createDb, type Db } from '../src/lib/db/create';
import { faqs, users } from '../src/lib/db/schema';
import { hashPassword } from '../src/lib/auth/password';
import { getSettings } from '../src/lib/match/queries';

// Usernames and long-term absences as shown on the legacy public page (13/10/2026).
const LEGACY_PLAYERS = [
  'ALBERTO',
  'ALBERTOJOSE',
  'ALBERTON',
  'ALFONSO',
  'ARTURO',
  'DAVID',
  'DAVIDJ',
  'DIEGO',
  'FERNANDO',
  'JEVI',
  'JORGE',
  'JOSE',
  'JUAN',
  'MARIO',
  'MIJAN',
  'ORIOL',
  'OSCAR',
  'QUINO',
  'ROGER',
  'WILLIAM',
];
const LEGACY_ABSENT = ['CAMBA', 'CHEMA', 'JESUSB', 'JOSEANGEL', 'JULIO', 'LUIS', 'PACOJ', 'RICARDO'];

const FAQS = [
  { question: '¿Dónde se juega?', answer: 'Donde siempre: en el Polideportivo La Concepción.' },
  { question: '¿A qué hora se juega?', answer: 'A la misma que siempre: los jueves a las 20:30.' },
  {
    question: '¿Cuál es la web del blancoloriset, blancolorizarei, como se diga?',
    answer:
      'El señor es mi pastor nada me falta, en verdes praderas me hace recostar; me conduce hacia fuentes tranquilas y repara mis fuerzas.',
  },
  {
    question: 'He olvidado mi contraseña',
    answer:
      'Es porque eres un botarate. Pulsa «¿Has olvidado tu contraseña?» en la pantalla de entrar y un admin te mandará un enlace para crear una nueva.',
  },
];

async function seedAdmin(db: Db) {
  const username = (process.env.ADMIN_USERNAME ?? process.env.BLANCOLOR_USER)?.trim().toUpperCase();
  const password = process.env.ADMIN_TEMP_PASSWORD ?? process.env.BLANCOLOR_PASSWORD;
  if (!username || !password) {
    console.warn('No ADMIN_USERNAME / ADMIN_TEMP_PASSWORD set: skipping admin.');
    return;
  }
  await db
    .insert(users)
    .values({
      username,
      displayName: process.env.ADMIN_DISPLAY_NAME ?? username,
      role: 'admin',
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    })
    .onConflictDoUpdate({ target: users.username, set: { role: 'admin' } });
  console.log(`Admin ${username} ready (must change password on first login).`);
}

async function seedLegacyPlayers(db: Db) {
  const rows = [
    ...LEGACY_PLAYERS.map((u) => ({ username: u, displayName: u })),
    ...LEGACY_ABSENT.map((u) => ({ username: u, displayName: u, longTermAbsence: true })),
  ];
  await db.insert(users).values(rows).onConflictDoNothing({ target: users.username });
  console.log(`Legacy players ensured (${rows.length}). Send each one a reset link from /admin/usuarios.`);
}

async function seedFaqs(db: Db) {
  const existing = await db.select({ id: faqs.id }).from(faqs);
  if (existing.length) return;
  await db.insert(faqs).values(FAQS.map((f, i) => ({ ...f, position: i })));
  console.log('FAQs seeded.');
}

async function main() {
  const handle = await createDb();
  await handle.migrate('drizzle');
  await getSettings(handle.db);
  await seedFaqs(handle.db);
  await seedAdmin(handle.db);
  if (!process.argv.includes('--no-legacy')) await seedLegacyPlayers(handle.db);
  await handle.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
