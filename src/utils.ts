const buildRedisCommand = (input: string) => {
  const args = input.split(" ");
  let command = `*${args.length}\r\n`;

  for (const arg of args) {
    command += `$${arg.length}\r\n${arg}\r\n`;
  }
  return command;
};

export { buildRedisCommand };
