import net from "net";
import assert from "assert";
import { before, after, test, describe } from "node:test";
import { buildRedisCommand } from "../src/utils/build-command";

let redisClient: net.Socket;

const generateCommand = (cmd: string, key: string = "", ...args: string[]) =>
  `${cmd} ${key} ${args.join(" ")}`;

const connectToRedis = () => {
  return new Promise((resolve, reject) => {
    redisClient = net.createConnection({ port: 6379 }, () => {
      console.log("Connected to Redis server");
      resolve(redisClient);
    });

    redisClient.on("error", (err) => {
      console.error("Error connecting to Redis server:", err);
      reject(err);
    });
  });
};

const onError = (err: Error, reject: Function) => {
  reject("Error:", err);
};

const sendCommand = (command: string) => {
  return new Promise((resolve, reject) => {
    if (!redisClient || redisClient.destroyed) {
      reject(new Error("Client is not connected"));
    }

    redisClient.write(buildRedisCommand(command));

    redisClient.once("data", (data: Buffer) => {
      resolve(data.toString());

      redisClient.removeListener("error", onError);
    });

    redisClient.once("error", onError);
  });
};

describe("Set tests", () => {
  before(async () => {
    await connectToRedis();
  });

  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });

  test("should SET a VALUE", async () => {
    const setResponse = await sendCommand("set foo bar");
    assert.strictEqual(setResponse, "+OK\r\n");
  });
  test("should return -ERR for wrong number of arguments for SET", async () => {
    const setResponse = await sendCommand("set foo");
    assert.strictEqual(
      setResponse,
      "-ERR wrong number of arguments for 'set' command\r\n"
    );
  });
});

describe("Get tests", () => {
  before(async () => {
    await connectToRedis();
  });

  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });

  test("should GET a VALUE", async () => {
    await sendCommand("set jaa bar");
    const getResponse = await sendCommand("get jaa");
    assert.strictEqual(getResponse, "$3\r\nbar\r\n");
  });

  test("should return $-1 for non-existing key", async () => {
    const getResponse = await sendCommand("get non_existing_key");
    assert.strictEqual(getResponse, "$-1\r\n");
  });

  test("should return -ERR for wrong number of arguments for GET", async () => {
    const getResponse = await sendCommand("get");
    assert.strictEqual(
      getResponse,
      "-ERR missing argument for 'get' command\r\n"
    );
  });
});

describe("Delete tests", () => {
  before(async () => {
    await connectToRedis();
  });

  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });

  test("should DELETE a VALUE", async () => {
    await sendCommand("set foo bar");
    const deleteResponse = await sendCommand("delete foo");
    assert.strictEqual(deleteResponse, ":1\r\n");

    const getResponse = await sendCommand("get foo");
    assert.strictEqual(getResponse, "$-1\r\n");
  });

  test("should return :0 for non-existing key on DELETE", async () => {
    const deleteResponse = await sendCommand("delete non_existing_key");
    assert.strictEqual(deleteResponse, ":0\r\n");
  });
  test("should return :1 for existing key on DELETE", async () => {
    await sendCommand("set foo bar");
    const deleteResponse = await sendCommand("delete foo");
    assert.strictEqual(deleteResponse, ":1\r\n");
  });

  test("should return -ERR for wrong number of arguments for DELETE", async () => {
    const deleteResponse = await sendCommand("delete");
    assert.strictEqual(
      deleteResponse,
      "-ERR wrong number of arguments for 'delete' command\r\n"
    );
  });
});

describe("EXPIRE command tests", () => {
  before(async () => {
    await connectToRedis();
  });

  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });
  test("should set an expiration time for a key", async () => {
    await sendCommand("set foo bar");
    const expireResponse = await sendCommand("expire foo 10");
    assert.strictEqual(expireResponse, "+OK\r\n");
  });
  test("should return -ERR for wrong number of arguments for EXPIRE", async () => {
    const expireResponse = await sendCommand("expire");
    assert.strictEqual(
      expireResponse,
      "-ERR wrong number of arguments for 'expire' command\r\n"
    );
  });
});

describe("EXPIRE with TTL tests", () => {
  before(async () => {
    await connectToRedis();
  });
  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });

  test("should return correct TTL for an existing key", async () => {
    const ttls: number = 10;
    await sendCommand("set hoo bar");

    const expireResponse = await sendCommand(`expire hoo ${ttls}`);
    assert.strictEqual(expireResponse, "+OK\r\n");

    const ttlResponse = (await sendCommand("ttl hoo")) as string;

    const matches = ttlResponse.match(/^:(\d+)/);

    const remainingTime = matches?.length ? parseInt(matches[1]) : -1;
    assert.ok(
      remainingTime <= ttls && remainingTime >= 0,
      `TTL should be between 0 and ${ttls}`
    );
  });

  test("should return -1 for non-existing key", async () => {
    const ttlResponse = await sendCommand("ttl non_existing_key");

    assert.strictEqual(ttlResponse, "-2\r\n");
  });

  test("should return -ERR for wrong number of arguments for TTL", async () => {
    const ttlResponse = await sendCommand("ttl");
    assert.strictEqual(
      ttlResponse,
      "-ERR wrong number of arguments for 'ttl' command\r\n"
    );
  });
});

describe.only("INCR tests", () => {
  before(async () => {
    await connectToRedis();
  });

  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });

  test("should increment a key", async () => {
    await sendCommand("set counter 10");
    const incrResponse = await sendCommand("incr counter");
    assert.strictEqual(incrResponse, ":11\r\n");
  });

  test("should return -ERR for non-numeric value", async () => {
    await sendCommand("set counter foo");
    const incrResponse = await sendCommand("incr counter");
    assert.strictEqual(
      incrResponse,
      "-ERR value is not an integer or out of range\r\n"
    );
  });
});

describe("DECR tests", () => {
  before(async () => {
    await connectToRedis();
  });
  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });
  test("should decrement a key", async () => {
    await sendCommand("set counter 10");
    const decrResponse = await sendCommand("decr counter");
    assert.strictEqual(decrResponse, ":9\r\n");
  });
  test("should return -ERR for non-numeric value", async () => {
    await sendCommand("set counter foo");
    const decrResponse = await sendCommand("decr counter");
    assert.strictEqual(
      decrResponse,
      "-ERR value is not an integer or out of range\r\n"
    );
  });
  test("should return -ERR for wrong number of arguments for DECR", async () => {
    const decrResponse = await sendCommand("decr");
    assert.strictEqual(
      decrResponse,
      "-ERR wrong number of arguments for 'decr' command\r\n"
    );
  });
});

describe("LIST tests", () => {
  before(async () => {
    await connectToRedis();
  });
  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });
  test("should return an empty list for non-existing key", async () => {
    const listResponse = await sendCommand("lrange non_existing_key 0 -1");
    assert.strictEqual(listResponse, "$-1\r\n");
  });

  test("should return an item from list", async () => {
    const largs = ["one", "two"];
    await sendCommand("lpush lfoo" + " " + largs.join(" "));
    const listResponse = await sendCommand("lrange lfoo 0 1");
    assert.strictEqual(listResponse, "*2\r\n$3\r\none\r\n$3\r\ntwo\r\n");
  });

  test("should return -ERR for wrong data structure on LPUSH ", async () => {
    await sendCommand("set foo bar");

    const listResponse = await sendCommand("lpush foo one");
    assert.strictEqual(listResponse, "-ERR wrong type of key\r\n");
  });

  test("should return -ERR for wrong number of arguments for LPUSH", async () => {
    const listResponse = await sendCommand("lpush");
    assert.strictEqual(
      listResponse,
      "-ERR wrong number of arguments for 'lpush' command\r\n"
    );
  });

  test("should return -ERR for wrong number of arguments for LRANGE", async () => {
    const listResponse = await sendCommand("lrange");
    assert.strictEqual(
      listResponse,
      "-ERR wrong number of arguments for 'lrange' command\r\n"
    );
  });
  test("should return -ERR for wrong number of arguments for LPOP", async () => {
    const listResponse = await sendCommand("lpop");
    assert.strictEqual(
      listResponse,
      "-ERR wrong number of arguments for 'lpop' command\r\n"
    );
  });

  test("should return -1 for empty list on LPOP", async () => {
    const listResponse = await sendCommand("lpop non_existing_key");
    assert.strictEqual(listResponse, "$-1\r\n");
  });

  test("should return an item from list for LPOP", async () => {
    const largs = ["one", "two"];
    await sendCommand("lpush lpop" + " " + largs.join(" "));
    const listResponse = await sendCommand("lpop lpop");
    assert.strictEqual(listResponse, "$3\r\none\r\n");
  });

  test("should return -ERR for wrong data structure on LPOP", async () => {
    await sendCommand("set lpoo bar");
    const listResponse = await sendCommand("lpop lpoo");
    assert.strictEqual(listResponse, "$-1\r\n");
  });

  test("should return an item from list for RPOP", async () => {
    const rargs = ["one", "two", "three"];
    await sendCommand("lpush rvoo" + " " + rargs.join(" "));
    const listResponse = await sendCommand("rpop rvoo");
    assert.strictEqual(listResponse, "*1\r\n$5\r\nthree\r\n");
  });
  test("should return -ERR for wrong data structure on RPUSH", async () => {
    await sendCommand("set rpush bar");
    const listResponse = await sendCommand("rpush rpush one");
    assert.strictEqual(listResponse, "-ERR wrong type of key\r\n");
  });

  test("should return -ERR for wrong number of arguments for RPUSH", async () => {
    const listResponse = await sendCommand("rpush");
    assert.strictEqual(
      listResponse,
      "-ERR wrong number of arguments for 'rpush' command\r\n"
    );
  });

  test("should return item from list for RPUSH", async () => {
    const rargs = ["one", "two"];
    await sendCommand("rpush lfoo" + " " + rargs.join(" "));
    const listResponse = await sendCommand("lrange lfoo 0 1");
    assert.strictEqual(listResponse, "*2\r\n$3\r\none\r\n$3\r\ntwo\r\n");
  });
});

describe.skip("PING tests", () => {
  test.todo("should return +PONG for PING", async () => {
    const pingResponse = await sendCommand("ping");
    assert.strictEqual(pingResponse, "+PONG\r\n");
  });
});

describe("COMMAND tests", () => {
  before(async () => {
    await connectToRedis();
  });

  after(() => {
    if (redisClient && !redisClient.destroyed) {
      redisClient.end();
    }
  });

  test("should return +OK for COMMAND", async () => {
    const commandResponse = await sendCommand("command");
    assert.strictEqual(commandResponse, "+OK\r\n");
  });

  test("should return -ERR for unknown command", async () => {
    const unknownCommandResponse = await sendCommand("unknown_command");
    assert.strictEqual(
      unknownCommandResponse,
      "-ERR unknown command UNKNOWN_COMMAND\r\n"
    );
  });
});
