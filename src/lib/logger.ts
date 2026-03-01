/**
 * Simple audit/error logger. In production, pipe console to CloudWatch/Vercel logs
 * or send to a logging service.
 */

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  if (process.env.NODE_ENV === "production") {
    console[level === "error" ? "error" : "log"](JSON.stringify(payload));
  } else {
    console[level](message, meta ?? "");
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    log("error", message, meta),
};

/** Log auth-related events (login failure, signup, etc.) */
export function logAuth(
  event: "login_failure" | "login_success" | "signup" | "reset_request",
  meta?: Record<string, unknown>
) {
  logger.info(`auth:${event}`, meta);
}

/** Log API errors for debugging and monitoring */
export function logApiError(
  route: string,
  message: string,
  meta?: Record<string, unknown>
) {
  logger.error(`api:${route}`, { message, ...meta });
}
