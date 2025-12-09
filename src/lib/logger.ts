import pino from 'pino';

/**
 * Log levels in order of severity (lowest to highest):
 * - trace: Very detailed debugging information
 * - debug: Debugging information
 * - info: General information (default for development)
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Critical errors
 * - silent: No logging
 *
 * In production, default is 'warn' to reduce noise.
 * In development, default is 'info' for visibility.
 */
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';

const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;

  // Valid log levels
  const validLevels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

  if (envLevel && validLevels.includes(envLevel)) {
    return envLevel;
  }

  // Default: 'warn' in production, 'info' in development
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info';
};

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Main application logger
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Server started');
 *   logger.error({ err }, 'Failed to connect');
 *   logger.debug({ userId }, 'User logged in');
 */
export const logger = pino({
  level: getLogLevel(),
  // Use pino-pretty in development for readable output
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  // Base context added to all logs
  base: {
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with a specific context/module name
 *
 * Usage:
 *   const log = createLogger('auth');
 *   log.info('User authenticated');
 *   // Output: [auth] User authenticated
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

/**
 * Pre-configured loggers for common modules
 */
export const loggers = {
  db: createLogger('db'),
  auth: createLogger('auth'),
  api: createLogger('api'),
  sentry: createLogger('sentry'),
  admin: createLogger('admin-api'),
};

export default logger;
