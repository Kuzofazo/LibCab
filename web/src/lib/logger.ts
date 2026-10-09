/**
 * Structured Logging Utility
 * Ensures application logs are safely formatted, sanitized, and easy to monitor.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  message: string;
  context?: Record<string, any>;
  error?: Error | unknown;
  userId?: string;
}

const sanitizeContext = (context?: Record<string, any>) => {
  if (!context) return undefined;
  const sanitized = { ...context };
  
  // Strip potentially sensitive fields
  const sensitiveKeys = ['password', 'token', 'authorization', 'payment', 'card'];
  for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
      }
  }
  return sanitized;
};

const formatOutput = (level: LogLevel, payload: LogPayload) => {
  const timestamp = new Date().toISOString();
  
  const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: payload.message,
      userId: payload.userId,
      context: sanitizeContext(payload.context),
      error: payload.error instanceof Error ? {
          name: payload.error.name,
          message: payload.error.message,
          stack: process.env.NODE_ENV === 'development' ? payload.error.stack : undefined
      } : payload.error,
  };

  // Convert to JSON string for structured logging environments (like Datadog, AWS CloudWatch, etc.)
  return JSON.stringify(logEntry);
};

export const logger = {
  info: (payload: LogPayload) => {
      console.log(formatOutput("info", payload));
  },
  warn: (payload: LogPayload) => {
      console.warn(formatOutput("warn", payload));
  },
  error: (payload: LogPayload) => {
      console.error(formatOutput("error", payload));
  },
  debug: (payload: LogPayload) => {
      if (process.env.NODE_ENV !== 'production') {
          console.debug(formatOutput("debug", payload));
      }
  }
};
