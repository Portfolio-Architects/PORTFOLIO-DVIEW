/**
 * @module logger
 * @description Structured JSON logging utility.
 * Architecture Layer: Services (cross-cutting concern)
 * 
 * Rationale: Replaces scattered console.log/warn/error calls with
 * structured output including timestamp, context, and stack traces.
 * Enables future integration with external log aggregation services.
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  error?: { message: string; stack?: string; name?: string };
}

/**
 * Formats and outputs a structured log entry.
 * @param level - Log severity level
 * @param context - The module/function name (e.g., 'PostRepository.listen')
 * @param message - Human-readable log message
 * @param data - Optional key-value data to include
 * @param error - Optional Error object for stack trace capture
 */
function log(level: LogLevel, context: string, message: string, data?: Record<string, unknown>, error?: unknown): void {
  if (level === 'DEBUG' && process.env.NODE_ENV === 'production') {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
  };

  if (data) entry.data = data;

  if (error) {
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      entry.error = {
        name: typeof errObj.name === 'string' ? errObj.name : 'Error',
        message: typeof errObj.message === 'string' ? errObj.message : String(error),
        stack: typeof errObj.stack === 'string' ? errObj.stack : undefined,
      };
    } else {
      entry.error = { message: String(error) };
    }
  }

  const output = JSON.stringify(entry);

  switch (level) {
    case 'ERROR': console.error(output); break;
    case 'WARN': console.warn(output); break;
    case 'DEBUG': console.debug(output); break;
    default: console.log(output);
  }
}

/** Structured logger with level methods */
export const logger = {
  info: (context: string, message: string, data?: Record<string, unknown>) => log('INFO', context, message, data),
  warn: (context: string, message: string, data?: Record<string, unknown>, error?: unknown) => log('WARN', context, message, data, error),
  error: (context: string, message: string, data?: Record<string, unknown>, error?: unknown) => log('ERROR', context, message, data, error),
  debug: (context: string, message: string, data?: Record<string, unknown>) => log('DEBUG', context, message, data),
};
