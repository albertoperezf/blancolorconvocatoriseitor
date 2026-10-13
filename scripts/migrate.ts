import { createDb } from '../src/lib/db/create';

async function main() {
  const handle = await createDb();
  await handle.migrate('drizzle');
  await handle.close();
  console.log('Migrations applied.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
