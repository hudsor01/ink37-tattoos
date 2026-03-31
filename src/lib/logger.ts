import 'server-only';
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {
        // Structured JSON in production (default pino behavior)
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Pretty print in development
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
  base: {
    service: 'ink37-tattoos',
    env: process.env.NODE_ENV || 'development',
  },
});

/**
 * Create a child logger with a request ID for request-scoped logging.
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

export type Logger = typeof logger;
