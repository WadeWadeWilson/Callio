export type SqlValue =
  | string
  | number
  | boolean
  | null
  | ArrayBuffer
  | ArrayBufferView;

export type SqlParams = SqlValue[];

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowsAffected: number;
  insertId?: number;
}

export interface DatabaseConnection {
  execute(sql: string, params?: SqlParams): Promise<void>;
  query<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParams,
  ): Promise<QueryResult<T>>;
  transaction<T>(
    callback: (db: DatabaseConnection) => Promise<T>,
  ): Promise<T>;
}
