import { logger } from "./logger";

const log = logger("core");

const store: Record<string, { type: string; value: unknown }> = {};
const expirationTimes: Record<string, number> = {};

type Commands = "SET" | "GET" | "DELETE" | "EXPIRE" | "COMMAND";
type CommandHandlers = Record<Commands, (args: string[]) => string>;

const isExpired = (key: string): boolean =>
  !!expirationTimes[key] && expirationTimes[key] < Date.now();

const checkExpiry = (key: string) => {
  if (isExpired(key)) {
    delete store[key];
    delete expirationTimes[key];
    return true;
  }

  return false;
};

const commandHandlers: CommandHandlers = {
  SET: (args: string[]) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'set' command\r\n";
    }
    const [key, value] = args;

    if (typeof value !== "string") {
      return "-ERR value must be a string\r\n";
    }

    log.info(`Setting ${key} to ${value}`);
    store[key] = { type: "string", value };

    return "+OK\r\n";
  },
  GET: (args: string[]) => {
    if (args.length < 1) {
      return "-ERR missing argument for 'get' command\r\n";
    }
    const [key] = args;

    log.info(`Getting value for ${key}`);

    if (checkExpiry(key) || !store[key] || store[key].type !== "string") {
      return "$-1\r\n";
    }

    const value = store[key].value as string;

    return `$${value.length}\r\n${value}\r\n`;
  },
  DELETE: (args: string[]) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'delete' command\r\n";
    }

    const [key] = args;

    if (store[key]) {
      log.info(`Deleting ${key}`);
      delete store[key];
      delete expirationTimes[key];
      return `:1\r\n`;
    }
    return `:0\r\n`;
  },
  EXPIRE: (args: string[]) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'expire' command\r\n";
    }
    const [key, seconds] = args;
    const expirationTime = parseInt(seconds, 10) * 1000 + Date.now();
    log.info(`Setting expiration for ${key} to ${expirationTime}`);
    expirationTimes[key] = expirationTime;
    return "+OK\r\n";
  },
  COMMAND: (args: string[]) => "+OK\r\n",
};

const executeCommand = (command: string, args: string[]): string => {
  log.info(`Received command: ${command} with args: ${args}`);

  const handler = commandHandlers[command as Commands];
  if (!handler) {
    return `-ERR unknown command ${command}\r\n`;
  }

  return handler(args);
};

const parseCommand = (data: string) => {
  const lines = data
    .toString()
    .split("\r\n")
    .filter((line) => !!line);

  const command = lines[2].toUpperCase();

  const args = lines.slice(4).filter((_, index) => index % 2 === 0);

  log.log(command, ...lines);

  return {
    command,
    args,
  };
};

export { parseCommand, executeCommand };
