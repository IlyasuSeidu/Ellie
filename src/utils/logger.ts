/**
 * Logging Utility
 *
 * Structured logging with different levels.
 * Console in development, could integrate with service in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger configuration
 */
const config = {
  // Only log debug in development
  minLevel: process.env.NODE_ENV === 'production' ? ('info' as LogLevel) : ('debug' as LogLevel),

  // Format timestamps
  includeTimestamp: true,

  // Include log level in output
  includeLevel: true,
};

/**
 * Log level priorities for filtering
 */
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Format timestamp
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with metadata
 */
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const parts: string[] = [];

  if (config.includeTimestamp) {
    parts.push(`[${getTimestamp()}]`);
  }

  if (config.includeLevel) {
    parts.push(`[${level.toUpperCase()}]`);
  }

  parts.push(message);

  // Add context if provided
  if (context && Object.keys(context).length > 0) {
    parts.push(JSON.stringify(context, null, 2));
  }

  return parts.join(' ');
}

/**
 * Check if log level should be logged
 */
function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[config.minLevel];
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }

  const formattedMessage = formatLogMessage(level, message, context);

  switch (level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(formattedMessage);
      break;
    case 'info':
      // eslint-disable-next-line no-console
      console.info(formattedMessage);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(formattedMessage);
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(formattedMessage);
      break;
  }
}

/**
 * Debug level logging - verbose information for development
 */
function debug(message: string, context?: LogContext): void {
  log('debug', message, context);
}

/**
 * Info level logging - general informational messages
 */
function info(message: string, context?: LogContext): void {
  log('info', message, context);
}

/**
 * Warning level logging - warnings that don't prevent operation
 */
function warn(message: string, context?: LogContext): void {
  log('warn', message, context);
}

/**
 * Error level logging - errors that need attention
 */
function error(message: string, err?: Error, context?: LogContext): void {
  const errorContext: LogContext = {
    ...context,
  };

  if (err) {
    errorContext.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  log('error', message, errorContext);
}

/**
 * Set minimum log level
 */
function setMinLevel(level: LogLevel): void {
  config.minLevel = level;
}

/**
 * Logger instance
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  setMinLevel,
};

/**
 * For testing - allows mocking console methods
 */
export const __testing__ = {
  formatLogMessage,
  shouldLog,
  config,
};
