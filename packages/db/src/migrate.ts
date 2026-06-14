// Minimal forward-only migration runner.
// Applies every *.sql file in ../migrations (sorted) that isn't recorded yet,
// each in its own transaction, tracking applied names in _migrations.

import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closePool, loadEnv } from "./index";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  loadEnv();
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         serial PRIMARY KEY,
      name       text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const applied = new Set(
    (await pool.query<{ name: string }>(`SELECT name FROM _migrations`)).rows.map((r) => r.name)
  );

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO _migrations (name) VALUES ($1)`, [file]);
      await client.query("COMMIT");
      console.log(`✓ ${file}`);
      count++;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`✗ ${file}: ошибка, откат транзакции`);
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(count === 0 ? "Новых миграций нет." : `Применено миграций: ${count}.`);
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
