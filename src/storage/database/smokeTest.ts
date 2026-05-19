import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { getDatabase } from './database';
import { nowIso } from './sql';

type DebugKvRow = {
  value: string;
};

const SMOKE_TEST_KEY = 'db_smoke_test';

export async function runDatabaseSmokeTest(): Promise<void> {
  const db = getDatabase();
  const value = nowIso();

  try {
    await db.transaction(async transactionDb => {
      const existing = await transactionDb.query<{ created_at: string }>(
        'SELECT created_at FROM debug_kv WHERE key = ?',
        [SMOKE_TEST_KEY],
      );
      const createdAt = existing.rows[0]?.created_at ?? value;

      await transactionDb.execute(
        `
          INSERT OR REPLACE INTO debug_kv (key, value, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `,
        [SMOKE_TEST_KEY, value, createdAt, value],
      );
    });

    const result = await db.query<DebugKvRow>(
      'SELECT value FROM debug_kv WHERE key = ?',
      [SMOKE_TEST_KEY],
    );

    if (result.rows[0]?.value !== value) {
      throw new AppError(
        'DATABASE_ERROR',
        'Database smoke test readback did not match written value.',
      );
    }

    logger.info('Database smoke test passed', { key: SMOKE_TEST_KEY });
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError('DATABASE_ERROR', 'Database smoke test failed.', {
            cause: error,
            context: { key: SMOKE_TEST_KEY },
          });

    logger.error('Database smoke test failed', {
      code: appError.code,
      errorMessage: appError.message,
    });

    throw appError;
  }
}
