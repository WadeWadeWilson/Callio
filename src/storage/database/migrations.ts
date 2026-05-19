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
  {
    version: 2,
    name: 'create_callio_mvp_schema',
    async up(db) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS audio_items (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          creator TEXT,
          media_type TEXT NOT NULL CHECK (media_type IN ('music', 'podcast', 'audiobook')),
          file_path TEXT NOT NULL,
          cover_path TEXT,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          progress_ms INTEGER NOT NULL DEFAULT 0,
          play_count INTEGER NOT NULL DEFAULT 0,
          is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
          is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
          file_hash TEXT,
          original_filename TEXT,
          added_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_played_at TEXT,
          completed_at TEXT
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          color TEXT,
          is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
          is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS audio_item_tags (
          audio_item_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (audio_item_id, tag_id),
          FOREIGN KEY (audio_item_id) REFERENCES audio_items(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS playlists (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          cover_path TEXT,
          is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
          is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
          current_audio_item_id TEXT,
          current_position_ms INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_played_at TEXT,
          FOREIGN KEY (current_audio_item_id) REFERENCES audio_items(id) ON DELETE SET NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS playlist_items (
          id TEXT PRIMARY KEY,
          playlist_id TEXT NOT NULL,
          audio_item_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
          FOREIGN KEY (audio_item_id) REFERENCES audio_items(id) ON DELETE CASCADE,
          UNIQUE (playlist_id, position)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS playback_sessions (
          id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL CHECK (source_type IN ('single', 'playlist', 'tag', 'search', 'favorites', 'recent')),
          source_id TEXT,
          current_audio_item_id TEXT,
          queue_json TEXT NOT NULL,
          queue_index INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (current_audio_item_id) REFERENCES audio_items(id) ON DELETE SET NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_audio_items_media_type ON audio_items(media_type)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_audio_items_added_at ON audio_items(added_at)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_audio_items_last_played_at ON audio_items(last_played_at)',
      );
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_audio_items_is_favorite ON audio_items(is_favorite)',
      );
      await db.execute('CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)');
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_position
        ON playlist_items(playlist_id, position)
      `);
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_audio_item_tags_tag_id ON audio_item_tags(tag_id)',
      );
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
    await db.execute('PRAGMA foreign_keys = ON');
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
