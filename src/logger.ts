const debugNamespaces = (process.env.DEBUG || "*")
  .split(",")
  .map((ns) => ns.trim());

type LogLevel = "log" | "info" | "debug" | "warn" | "error";

type Logger = {
  [key in LogLevel]: (...message: unknown[]) => void;
};

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
