/**
 * Constructs a Redis protocol command string from a given input string.
 *
 * The function takes an input string, splits it into arguments, and formats
 * it according to the Redis Serialization Protocol (RESP). Each argument is
 * prefixed with its length and properly terminated with CRLF sequences.
 *
 * @param input - The input string representing a Redis command and its arguments,
 *                separated by spaces (e.g., "SET key value").
 * @returns The formatted Redis command string in RESP format.
 *
 * @example
 * ```typescript
 * const command = buildRedisCommand("SET key value");
 * console.log(command);
 * // Output:
 * // *3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n
 * ```
 */
const buildRedisCommand = (input: string) => {
  const args = input.split(" ");
  let command = `*${args.length}\r\n`;

  for (const arg of args) {
    command += `$${arg.length}\r\n${arg}\r\n`;
  }
  return command;
};

export { buildRedisCommand };
