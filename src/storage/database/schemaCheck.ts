import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { getDatabase } from './database';
import { placeholders } from './sql';

type SqliteObjectRow = {
  name: string;
};

const requiredTables = [
  'audio_items',
  'tags',
  'audio_item_tags',
  'playlists',
  'playlist_items',
  'playback_sessions',
  'app_settings',
] as const;

const requiredIndexes = [
  'idx_audio_items_media_type',
  'idx_audio_items_added_at',
  'idx_audio_items_last_played_at',
  'idx_audio_items_is_favorite',
  'idx_tags_name',
  'idx_playlist_items_playlist_position',
  'idx_audio_item_tags_tag_id',
] as const;

export async function runSchemaCheck(): Promise<void> {
  try {
    await assertSqliteObjectsExist('table', requiredTables);
    await assertSqliteObjectsExist('index', requiredIndexes);

    logger.info('Database schema check passed', {
      tables: requiredTables.length,
      indexes: requiredIndexes.length,
    });
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError('DATABASE_ERROR', 'Database schema check failed.', {
            cause: error,
          });

    logger.error('Database schema check failed', {
      code: appError.code,
      errorMessage: appError.message,
    });

    throw appError;
  }
}

async function assertSqliteObjectsExist(
  type: 'table' | 'index',
  names: readonly string[],
): Promise<void> {
  const db = getDatabase();
  const result = await db.query<SqliteObjectRow>(
    `
      SELECT name
      FROM sqlite_master
      WHERE type = ?
        AND name IN (${placeholders(names.length)})
    `,
    [type, ...names],
  );
  const foundNames = new Set(result.rows.map(row => row.name));
  const missingNames = names.filter(name => !foundNames.has(name));

  if (missingNames.length > 0) {
    throw new AppError(
      'DATABASE_ERROR',
      `Missing SQLite ${type}s: ${missingNames.join(', ')}`,
      {
        context: { type, missingNames },
      },
    );
  }
}
