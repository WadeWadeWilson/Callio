import { IS_DEV } from '../app/config';

export type LogContext = Record<string, unknown>;
type LogMethod = (message: string, context?: LogContext) => void;
type ConsoleLevel = 'debug' | 'info' | 'warn' | 'error';

const createLogMethod =
  (level: ConsoleLevel, enabled: boolean): LogMethod =>
  (message, context) => {
    if (!enabled) {
      return;
    }

    const prefix = `[Callio:${level}]`;

    if (context) {
      console[level](prefix, message, context);
      return;
    }

    console[level](prefix, message);
  };

export const logger: Record<ConsoleLevel, LogMethod> = {
  debug: createLogMethod('debug', IS_DEV),
  info: createLogMethod('info', IS_DEV),
  warn: createLogMethod('warn', true),
  error: createLogMethod('error', true),
};
