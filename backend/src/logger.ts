export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: boolean | number | string | null | undefined;
}

function getRuntimeMode(): string {
  return process.env.NODE_ENV ?? process.env.npm_lifecycle_event ?? "runtime";
}

function writeLog(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry: LogContext = {
    timestamp: new Date().toISOString(),
    level,
    mode: getRuntimeMode(),
    message,
    ...context,
  };

  const serializedEntry = JSON.stringify(entry);
  if (level === "error") {
    console.error(serializedEntry);
    return;
  }
  if (level === "warn") {
    console.warn(serializedEntry);
    return;
  }
  console.log(serializedEntry);
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    writeLog("debug", message, context);
  },
  info(message: string, context?: LogContext): void {
    writeLog("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    writeLog("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    writeLog("error", message, context);
  },
};

export function logBuildCompleted(): void {
  writeLog("info", "Backend build completed", { mode: "build" });
}

if (process.argv.includes("--build")) {
  logBuildCompleted();
}
