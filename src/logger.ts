const debugNamespaces = (process.env.DEBUG || "*")
  .split(",")
  .map((ns) => ns.trim());

type LogLevel = "log" | "info" | "debug" | "warn" | "error";

type Logger = {
  [key in LogLevel]: (...message: unknown[]) => void;
};

/**
 * Creates a logger instance for a specific namespace.
 *
 * @param namespace - The namespace to associate with the logger.
 * @returns A `Logger` object with methods for logging messages at various levels.
 *
 * The logger provides the following methods:
 * - `log`: Logs a general message.
 * - `info`: Logs an informational message.
 * - `debug`: Logs a debug message.
 * - `error`: Logs an error message.
 * - `warn`: Logs a warning message.
 *
 * The logger formats messages with a timestamp, log level, and namespace.
 * Messages are conditionally logged based on the `debugNamespaces` array.
 * If the log level is "error", the message is always logged to `console.error`.
 */
const logger = (namespace: string): Logger => {
  const log = (mode: LogLevel, ...message: unknown[]) => {
    const logMessage: string = `${new Date().toISOString()} ${mode} [${namespace}]: ${message}`;

    if (mode === "error") {
      console.error(logMessage);
      return;
    }

    if (
      !debugNamespaces.includes(namespace) ||
      !debugNamespaces.includes("*")
    ) {
      console?.[mode]?.(logMessage);
    }
  };

  return {
    log: (...message) => log("log", ...message),
    info: (...message) => log("info", ...message),
    debug: (...message) => log("debug", ...message),
    error: (...message) => log("error", ...message),
    warn: (...message) => log("warn", ...message),
  };
};

export { logger };
