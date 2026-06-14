// Dev seed: создаёт демо-пользователя demo@example.com / demo1234 (FREE).

import { hashSync } from "bcryptjs";
import { closePool, getPool, loadEnv } from "./index";

async function main() {
  loadEnv();
  const pool = getPool();
  const email = "demo@example.com";

  const existing = await pool.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [
    email,
  ]);
  if (existing.rows[0]) {
    console.log("Seed: демо-пользователь уже существует, пропускаю");
    await closePool();
    return;
  }

  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO users (email, name, password_hash, privacy_accepted_at, personal_data_accepted_at)
     VALUES ($1, $2, $3, now(), now())
     RETURNING id`,
    [email, "Демо Пользователь", hashSync("demo1234", 10)]
  );

  await pool.query(
    `INSERT INTO subscriptions (user_id, plan) VALUES ($1, 'FREE')
     ON CONFLICT (user_id) DO NOTHING`,
    [inserted.rows[0].id]
  );

  console.log("Seed: создан demo@example.com / demo1234");
  await closePool();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
