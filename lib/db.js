// Accès base de données.
// En production (Vercel) : Postgres Neon via la variable DATABASE_URL.
// En local sans DATABASE_URL : base Postgres en mémoire (PGlite) pour tester.

let queryFn = null;
let ready = null;

async function connect() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    queryFn = (text, params = []) => sql.query(text, params);
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const db = new PGlite();
    queryFn = async (text, params = []) => (await db.query(text, params)).rows;
  }
  await queryFn(`
    CREATE TABLE IF NOT EXISTS pack_orders (
      id          SERIAL PRIMARY KEY,
      nom         TEXT NOT NULL,
      telephone   TEXT NOT NULL,
      tshirts     JSONB NOT NULL DEFAULT '[]',
      packs       JSONB NOT NULL DEFAULT '[]',
      montant     INTEGER NOT NULL DEFAULT 0,
      statut      TEXT NOT NULL DEFAULT 'nouvelle',
      note        TEXT NOT NULL DEFAULT '',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

export async function query(text, params) {
  if (!ready) ready = connect().catch((e) => { ready = null; throw e; });
  await ready;
  return queryFn(text, params);
}
