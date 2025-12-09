/**
 * Browser-compatible logger for client-side code.
 * Uses console methods with log level filtering based on environment.
 *
 * This is separate from the server-side pino logger since pino
 * requires Node.js APIs that aren't available in the browser.
 */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
};

function getLogLevel(): LogLevel {
  // In browser, check for development mode
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Default: 'warn' in production, 'debug' in development
  return isDevelopment ? 'debug' : 'warn';
}

function shouldLog(level: LogLevel): boolean {
  const currentLevel = getLogLevel();
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[currentLevel];
}

function formatMessage(module: string, message: string): string {
  return `[${module}] ${message}`;
}

export interface BrowserLogger {
  trace: (message: string, data?: Record<string, unknown>) => void;
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}

export function createBrowserLogger(module: string): BrowserLogger {
  return {
    trace: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('trace')) {
        if (data) {
          console.trace(formatMessage(module, message), data);
        } else {
          console.trace(formatMessage(module, message));
        }
      }
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('debug')) {
        if (data) {
          console.debug(formatMessage(module, message), data);
        } else {
          console.debug(formatMessage(module, message));
        }
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('info')) {
        if (data) {
          console.info(formatMessage(module, message), data);
        } else {
          console.info(formatMessage(module, message));
        }
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('warn')) {
        if (data) {
          console.warn(formatMessage(module, message), data);
        } else {
          console.warn(formatMessage(module, message));
        }
      }
    },
    error: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog('error')) {
        if (data) {
          console.error(formatMessage(module, message), data);
        } else {
          console.error(formatMessage(module, message));
        }
      }
    },
  };
}

/**
 * Pre-configured browser loggers for common modules
 */
export const browserLoggers = {
  sentry: createBrowserLogger('Sentry'),
  auth: createBrowserLogger('Auth'),
  api: createBrowserLogger('API'),
};
