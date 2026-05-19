import {
  open,
  type DB,
  type QueryResult as DriverQueryResult,
  type Scalar,
  type Transaction,
} from '@op-engineering/op-sqlite';

import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { DatabaseConnection, QueryResult, SqlParams } from './types';

const DATABASE_NAME = 'callio.db';

type QueryExecutor = Pick<DB, 'execute' | 'transaction'> | Transaction;

let databaseConnection: DatabaseConnection | undefined;

function toDriverParams(params?: SqlParams): Scalar[] | undefined {
  return params as Scalar[] | undefined;
}

function toQueryResult<T>(result: DriverQueryResult): QueryResult<T> {
  return {
    rows: result.rows as T[],
    rowsAffected: result.rowsAffected,
    insertId: result.insertId,
  };
}

function createConnection(
  executor: QueryExecutor,
  supportsNativeTransaction: boolean,
): DatabaseConnection {
  const connection: DatabaseConnection = {
    async execute(sql: string, params?: SqlParams): Promise<void> {
      await executor.execute(sql, toDriverParams(params));
    },

    async query<T>(
      sql: string,
      params?: SqlParams,
    ): Promise<QueryResult<T>> {
      const result = await executor.execute(sql, toDriverParams(params));
      return toQueryResult<T>(result);
    },

    async transaction<T>(
      callback: (db: DatabaseConnection) => Promise<T>,
    ): Promise<T> {
      if (!supportsNativeTransaction || !('transaction' in executor)) {
        return callback(connection);
      }

      let callbackResult: T | undefined;
      let callbackCompleted = false;

      await executor.transaction(async tx => {
        callbackResult = await callback(createConnection(tx, false));
        callbackCompleted = true;
      });

      if (!callbackCompleted) {
        throw new AppError(
          'DATABASE_ERROR',
          'Database transaction completed without running callback.',
        );
      }

      return callbackResult as T;
    },
  };

  return connection;
}

export function getDatabase(): DatabaseConnection {
  if (databaseConnection) {
    return databaseConnection;
  }

  try {
    const driverDb = open({ name: DATABASE_NAME });
    databaseConnection = createConnection(driverDb, true);
    logger.info('SQLite database opened', { databaseName: DATABASE_NAME });
    return databaseConnection;
  } catch (error) {
    logger.error('Failed to open SQLite database', {
      databaseName: DATABASE_NAME,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw new AppError('DATABASE_ERROR', 'Failed to open SQLite database.', {
      cause: error,
      context: { databaseName: DATABASE_NAME },
    });
  }
}
