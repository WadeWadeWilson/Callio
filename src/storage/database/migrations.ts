import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { nowIso } from './sql';
import type { DatabaseConnection } from './types';

type Migration = {
  name: string;
  up: (db: DatabaseConnection) => Promise<void>;
  version: number;
};

type AppliedMigrationRow = {
  version: number;
};

const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_debug_kv_table',
    async up(db) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS debug_kv (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    },
  },
];

async function ensureMigrationTable(db: DatabaseConnection): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
}

async function getAppliedVersions(
  db: DatabaseConnection,
): Promise<Set<number>> {
  const result = await db.query<AppliedMigrationRow>(
    'SELECT version FROM schema_migrations',
  );

  return new Set(result.rows.map(row => row.version));
}

export async function runMigrations(db: DatabaseConnection): Promise<void> {
  try {
    await ensureMigrationTable(db);

    const appliedVersions = await getAppliedVersions(db);
    const pendingMigrations = migrations.filter(
      migration => !appliedVersions.has(migration.version),
    );

    for (const migration of pendingMigrations) {
      await db.transaction(async transactionDb => {
        await migration.up(transactionDb);
        await transactionDb.execute(
          `
            INSERT INTO schema_migrations (version, name, applied_at)
            VALUES (?, ?, ?)
          `,
          [migration.version, migration.name, nowIso()],
        );
      });

      logger.info('Database migration applied', {
        version: migration.version,
        name: migration.name,
      });
    }

    logger.info('Database migrations complete', {
      appliedCount: pendingMigrations.length,
    });
  } catch (error) {
    logger.error('Database migration failed', {
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw new AppError('DATABASE_ERROR', 'Database migration failed.', {
      cause: error,
    });
  }
}
