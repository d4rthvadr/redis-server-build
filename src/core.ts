import { logger } from "./utils/logger";

const log = logger("core");

import config from "./config.json";

import { persistence } from "./persistence";

const { store, expirationTimes } = persistence;

export type ExecuteCommand = (
  command: string,
  args: string[],
  appendOnly?: boolean
) => string;

type Commands =
  | "SET"
  | "GET"
  | "DELETE"
  | "EXPIRE"
  | "TTL"
  | "INCR"
  | "DECR"
  | "LPUSH"
  | "RPUSH"
  | "LPOP"
  | "RPOP"
  | "LRANGE"
  | "COMMAND";
type CommandHandlers = Record<Commands, (args: string[]) => string>;

const isExpired = (key: string): boolean =>
  !!expirationTimes[key] && expirationTimes[key] < Date.now();

/**
 * Checks if a given key has expired in the store.
 * If the key is expired, it removes the key from both the store and the expiration times,
 * and returns `true`. Otherwise, it returns `false`.
 *
 * @param key - The key to check for expiration.
 * @returns `true` if the key was expired and removed, otherwise `false`.
 */
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
  TTL: (args: string[]) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'ttl' command\r\n";
    }
    const [key] = args;
    if (checkExpiry(key)) {
      return "-1\r\n";
    }
    if (!store[key]) {
      return "-2\r\n";
    }
    const ttl = expirationTimes[key] - Date.now();
    if (ttl < 0) {
      return "-1\r\n";
    }
    return `:${Math.floor(ttl / 1000)}\r\n`;
  },
  INCR: (args: string[]) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'incr' command\r\n";
    }
    const [key] = args;

    if (checkExpiry(key)) {
      return "-1\r\n";
    }

    if (!store[key]) {
      store[key] = { type: "string", value: "1" };
      return ":1\r\n";
    }

    const valueAsInt = parseInt(store[key].value as string, 10);

    if (isNaN(valueAsInt)) {
      return "-ERR value is not an integer or out of range\r\n";
    }

    store[key].value = (valueAsInt + 1).toString();

    return `:${store[key].value}\r\n`;
  },
  DECR: (args: string[]) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'decr' command\r\n";
    }
    const [key] = args;

    if (checkExpiry(key)) {
      return "-1\r\n";
    }

    if (!store[key]) {
      store[key] = { type: "string", value: "-1" };
      return ":-1\r\n";
    }

    const valueAsInt = parseInt(store[key].value as string, 10);

    if (isNaN(valueAsInt)) {
      return "-ERR value is not an integer or out of range\r\n";
    }

    store[key].value = (valueAsInt - 1).toString();

    return `:${store[key].value}\r\n`;
  },
  LPUSH: (args: string[]) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'lpush' command\r\n";
    }
    const [key, ...value] = args; // ["key", "value1", "value2", ...]
    if (checkExpiry(key)) {
      return "-1\r\n";
    }
    if (!store[key]) {
      store[key] = { type: "list", value: [] };
    }

    if (store[key].type !== "list") {
      return "-ERR wrong type of key\r\n";
    }
    const listLength = (store[key].value as string[]).unshift(...value);

    return `:${listLength}\r\n`;
  },
  RPUSH: (args: string[]) => {
    if (args.length < 2) {
      return "-ERR wrong number of arguments for 'rpush' command\r\n";
    }
    const [key, ...value] = args; // ["key", "value1", "value2", ...]
    if (checkExpiry(key)) {
      return "-1\r\n";
    }
    if (!store[key]) {
      store[key] = { type: "list", value: [] };
    }
    if (store[key].type !== "list") {
      return "-ERR wrong type of key\r\n";
    }
    const listLength = (store[key].value as string[]).push(...value);
    return `:${listLength}\r\n`;
  },
  LRANGE: (args: string[]) => {
    if (args.length < 3) {
      return "-ERR wrong number of arguments for 'lrange' command\r\n";
    }
    const [key, start, end] = args;

    if (checkExpiry(key)) {
      return "-1\r\n";
    }

    if (!store[key] || store[key].type !== "list") {
      return "$-1\r\n";
    }

    const list = store[key].value as string[];

    const startIndex = parseInt(start, 10);
    const endIndex = parseInt(end, 10);

    const range = list.slice(startIndex, endIndex + 1);

    return `*${range.length}\r\n${range
      .map((item) => `$${item.length}\r\n${item}`)
      .join("\r\n")}\r\n`;
  },
  LPOP: (args: string[]) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'lpop' command\r\n";
    }
    const [key] = args;
    if (checkExpiry(key)) {
      return "-1\r\n";
    }
    if (!store[key] || store[key].type !== "list") {
      return "$-1\r\n";
    }
    const list = store[key].value as string[];
    const poppedValue = list.shift();
    if (poppedValue === undefined) {
      return "$-1\r\n";
    }
    if (list.length === 0) {
      delete store[key];
      delete expirationTimes[key];
    } else {
      store[key].value = list;
    }
    return `$${poppedValue.length}\r\n${poppedValue}\r\n`;
  },
  RPOP: (args: string[]) => {
    if (args.length < 1) {
      return "-ERR wrong number of arguments for 'rpop' command\r\n";
    }
    const [key] = args;
    if (checkExpiry(key)) {
      return "-1\r\n";
    }
    if (!store[key] || store[key].type !== "list") {
      return "$-1\r\n";
    }
    const list = store[key].value as string[];
    const poppedValue = list.pop();
    if (poppedValue === undefined) {
      return "$-1\r\n";
    }
    if (list.length === 0) {
      delete store[key];
      delete expirationTimes[key];
    } else {
      store[key].value = list;
    }
    return `$${poppedValue.length}\r\n${poppedValue}\r\n`;
  },
  COMMAND: (args: string[]) => "+OK\r\n",
};

/**
 * Executes a given command by looking up the appropriate handler and passing the arguments to it.
 *
 * @param command - The name of the command to execute.
 * @param args - An array of arguments to pass to the command handler.
 * @returns The result of the command execution as a string. If the command is unknown,
 *          returns an error message in the format `-ERR unknown command <command>\r\n`.
 */
const executeCommand = (
  command: string,
  args: string[],
  replayFromAOF = false
): string => {
  log.info(
    `Received command: ${command} with args: ${args} replayFromAOF ${replayFromAOF}`
  );

  const handler = commandHandlers[command as Commands];
  if (!handler) {
    return `-ERR unknown command ${command}\r\n`;
  }

  const result = handler(args);

  if (!replayFromAOF) {
    handlePostExecuteCommand(command, args);
  }

  return result;
};

/**
 * Handles the execution of a command after it has been processed.
 * If the command should be appended to the Append-Only File (AOF),
 * it performs the append operation asynchronously and logs the result.
 * Otherwise, it logs that the command is being skipped.
 *
 * @param command - The name of the command to be executed.
 * @param args - An array of arguments associated with the command.
 *
 */
const handlePostExecuteCommand = (command: string, args: string[]) => {
  if (shouldAppendToAOF(command)) {
    persistence
      .appendAOF(command, args)
      .then(() => {
        log.info(`AOF log appended: ${command} ${args}`);
      })
      .catch((e: Error | any) => {
        log.error("Error appending to AOF file:", e?.message);
      });
    return;
  }
  log.info(`Skipping AOF append for command: ${command}`);
};

/**
 * Determines whether a given command should be appended to the Append-Only File (AOF).
 *
 * This function checks if the append-only mode is enabled in the configuration
 * and if the specified command is included in the list of commands that should
 * be appended to the AOF.
 *
 * @param command - The name of the command to check.
 * @returns `true` if the command should be appended to the AOF, otherwise `false`.
 */
const shouldAppendToAOF = (command: string) =>
  config.appendOnly && config.appendOnlyCmds.includes(command);

/**
 * Parses a Redis command string into its command and arguments.
 *
 * @param data - The raw string data received, typically from a Redis client.
 *               The string is expected to follow the RESP (REdis Serialization Protocol) format.
 *
 * @returns An object containing:
 *          - `command`: The parsed command in uppercase.
 *          - `args`: An array of arguments associated with the command.
 *
 * @example
 * ```typescript
 * const input = "*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n";
 * const result = parseCommand(input);
 * console.log(result);
 * // Output:
 * // {
 * //   command: "SET",
 * //   args: ["mykey", "myvalue"]
 * // }
 * ```
 */
const parseCommand = (data: string) => {
  const lines = data
    .toString()
    .split("\r\n")
    .filter((line) => !!line);

  const command = lines[2].toUpperCase();

  const args = lines.slice(4).filter((_, index) => index % 2 === 0);

  log.debug(command, ...lines);

  return {
    command,
    args,
  };
};

/**
 * Handles the snapshot functionality for the application.
 *
 * This function enables snapshot mode, loads the existing snapshot synchronously,
 * and sets up a recurring interval to save snapshots asynchronously.
 *
 * @throws {Error} If there is an issue with loading or saving snapshots.
 */
const handleSnapshot = () => {
  log.info("Snapshot mode is enabled");
  persistence.loadSnapshotSync();

  setInterval(() => {
    persistence.saveSnapshotAsync();
  }, config.snapshotInterval);

  log.info("Snapshot interval set to", config.snapshotInterval, "ms");
};

/**
 * Initializes the server based on the provided configuration.
 *
 * This function determines the persistence mode of the server and performs
 * the necessary setup. It supports three modes:
 *
 * - **Snapshot Mode**: If `config.snapshot` is enabled, it triggers the snapshot handling process.
 * - **Append-Only Mode**: If `config.appendOnly` is enabled, it logs that the append-only mode is active.
 * - **In-Memory Mode**: If neither snapshot nor append-only mode is enabled, it defaults to in-memory persistence.
 *
 */
const init = () => {
  if (config.snapshot) {
    handleSnapshot();
  } else if (config.appendOnly) {
    log.info("Append only mode is enabled");
    persistence.replayAofSync(executeCommand);
  } else {
    log.info("Persistence mode: in-memory");
  }
};

export { parseCommand, executeCommand, init };
