import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { getDatabase } from './database';
import { runMigrations } from './migrations';

let initializationPromise: Promise<void> | undefined;

export function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeDatabaseInternal();
  }

  return initializationPromise;
}

async function initializeDatabaseInternal(): Promise<void> {
  try {
    const db = getDatabase();
    await runMigrations(db);
    logger.info('Database initialized');
  } catch (error) {
    initializationPromise = undefined;

    const appError =
      error instanceof AppError
        ? error
        : new AppError('DATABASE_ERROR', 'Database initialization failed.', {
            cause: error,
          });

    logger.error('Database initialization failed', {
      code: appError.code,
      errorMessage: appError.message,
    });

    throw appError;
  }
}
