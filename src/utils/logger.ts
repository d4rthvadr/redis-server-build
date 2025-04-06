const debugNamespaces = (process.env.DEBUG || "*")
  .split(",")
  .map((ns) => ns.trim());

type LogLevel = "info" | "debug" | "warn" | "error";

type Logger = {
  [key in LogLevel]: (...message: unknown[]) => void;
};

/**
 * Creates a logger instance for a specific namespace.
 *
 * @param namespace - The namespace to associate with the logger.
 * @returns A `Logger` object with methods for logging messages at various levels.
 *
 */
const logger = (namespace: string): Logger => {
  const log = <T>(mode: LogLevel, ...message: T[]) => {
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
    info: (...message) => log("info", ...message),
    debug: (...message) => log("debug", ...message),
    error: (...message) => log("error", ...message),
    warn: (...message) => log("warn", ...message),
  };
};

export { logger };
