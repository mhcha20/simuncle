/**
 * Bring the database up to date: apply pending drizzle migrations and make sure
 * the two columns that were added outside drizzle exist. Runs as Railway's
 * pre-deploy command (`node dist/db-setup.js`) and locally with `pnpm db:setup`;
 * running it again is a no-op.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "./db";

const MIGRATIONS_FOLDER = path.resolve(process.env.MIGRATIONS_DIR || "drizzle");
const MIGRATIONS_TABLE = "__drizzle_migrations";
/** Migrations that already existed when the database was moved from Manus (0000 ... 0024). */
const PRE_RAILWAY_MIGRATION_COUNT = 25;
const PRE_RAILWAY_SNAPSHOT = "0024_snapshot.json";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function tableExists(db: Db, table: string): Promise<boolean> {
  const [rows] = (await db.execute(
    sql`select count(*) as n from information_schema.tables where table_schema = database() and table_name = ${table}`,
  )) as unknown as [Array<{ n: number | string }>];
  return Number(rows[0]?.n ?? 0) > 0;
}

type SnapshotTables = Record<string, { name: string; columns: Record<string, { name: string }> }>;

/** Tables/columns the pre-Railway schema (migration 0024 snapshot) has that the live database lacks. */
async function findMissingPreRailwaySchema(db: Db): Promise<string[]> {
  const snapshot = JSON.parse(
    readFileSync(path.join(MIGRATIONS_FOLDER, "meta", PRE_RAILWAY_SNAPSHOT), "utf8"),
  ) as { tables: SnapshotTables };
  const [rows] = (await db.execute(
    sql`select table_name as t, column_name as c from information_schema.columns where table_schema = database()`,
  )) as unknown as [Array<{ t: string; c: string }>];
  const existing = new Set(rows.map((row) => `${row.t}.${row.c}`));
  const missing: string[] = [];
  for (const table of Object.values(snapshot.tables)) {
    for (const column of Object.values(table.columns)) {
      if (!existing.has(`${table.name}.${column.name}`)) missing.push(`${table.name}.${column.name}`);
    }
  }
  return missing;
}

/**
 * The Manus-era database already has the full pre-Railway schema, but a SQL
 * dump has no migration history. When every table and column of migrations
 * 0000-0024 exists, record any of those migrations missing from the history as
 * applied, so only newer migrations run. If the schema does not match, nothing
 * is recorded and the missing columns are reported.
 */
async function reconcilePreRailwayHistory(db: Db) {
  if (!(await tableExists(db, "users"))) return; // brand-new database: run everything

  if (!(await tableExists(db, MIGRATIONS_TABLE))) {
    await db.execute(sql`
      create table ${sql.identifier(MIGRATIONS_TABLE)} (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `);
  }

  const [rows] = (await db.execute(
    sql`select max(created_at) as last from ${sql.identifier(MIGRATIONS_TABLE)}`,
  )) as unknown as [Array<{ last: number | string | null }>];
  const lastRecorded = Number(rows[0]?.last ?? 0);
  const preRailway = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER }).slice(0, PRE_RAILWAY_MIGRATION_COUNT);
  const unrecorded = preRailway.filter((migration) => migration.folderMillis > lastRecorded);
  if (unrecorded.length === 0) return; // history already covers the pre-Railway schema

  const missing = await findMissingPreRailwaySchema(db);
  if (missing.length > 0) {
    throw new Error(
      `Migration history stops before 0024 and the database is missing ${missing.length} expected column(s): ` +
        `${missing.slice(0, 20).join(", ")}${missing.length > 20 ? ", ..." : ""}. Not recording history; fix the schema first.`,
    );
  }

  for (const migration of unrecorded) {
    await db.execute(
      sql`insert into ${sql.identifier(MIGRATIONS_TABLE)} (hash, created_at) values (${migration.hash}, ${migration.folderMillis})`,
    );
  }
  console.log(
    `[db-setup] schema already matches migration 0024; recorded ${unrecorded.length} missing pre-Railway migration(s) as applied`,
  );
}

/**
 * `orders.errorMessage` and `orders.startDate varchar(32)` are in drizzle/schema.ts
 * but were applied to the Manus database by hand, so no migration creates them.
 * Add them when missing (a fresh database built from migrations, or an old dump).
 */
async function ensureOrdersColumns(db: Db) {
  const [rows] = (await db.execute(
    sql`select column_name as c, character_maximum_length as len from information_schema.columns
        where table_schema = database() and table_name = 'orders' and column_name in ('errorMessage', 'startDate')`,
  )) as unknown as [Array<{ c: string; len: number | string | null }>];
  const found = new Map(rows.map((row) => [row.c, Number(row.len ?? 0)]));

  if (!found.has("errorMessage")) {
    await db.execute(sql`alter table \`orders\` add \`errorMessage\` varchar(512)`);
    console.log("[db-setup] added orders.errorMessage");
  }
  if (found.get("startDate") !== 32) {
    await db.execute(sql`alter table \`orders\` modify column \`startDate\` varchar(32)`);
    console.log("[db-setup] set orders.startDate to varchar(32)");
  }
}

export async function runDatabaseSetup() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is required");

  await reconcilePreRailwayHistory(db);
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER, migrationsTable: MIGRATIONS_TABLE });
  await ensureOrdersColumns(db);
  console.log("[db-setup] database is up to date");
}
