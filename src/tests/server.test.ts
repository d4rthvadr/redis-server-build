import net from "net";
import assert from "assert";
import { before, after, test, describe } from "node:test";
import { buildRedisCommand } from "../utils";

let redisClient: net.Socket;

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
