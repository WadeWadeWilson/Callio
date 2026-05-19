export type AppErrorCode =
  | 'UNKNOWN_ERROR'
  | 'FILE_PICKER_ERROR'
  | 'FILE_COPY_ERROR'
  | 'DATABASE_ERROR'
  | 'PLAYBACK_ERROR'
  | 'BACKUP_ERROR'
  | 'RESTORE_ERROR';

export type AppErrorOptions = {
  cause?: unknown;
  context?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly cause?: unknown;
  readonly code: AppErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    message: string,
    options: AppErrorOptions = {},
  ) {
    super(message);

    this.name = 'AppError';
    this.code = code;
    this.cause = options.cause;
    this.context = options.context;
  }
}
