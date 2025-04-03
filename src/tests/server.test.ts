import net from "net";
import assert from "assert";
import { before, after, test } from "node:test";

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

before(async () => {
  await connectToRedis();
});

after(() => {
  if (redisClient && !redisClient.destroyed) {
    redisClient.end();
  }
});

const onError = (err: Error, reject: Function) => {
  reject("Error:", err);
};

const sendCommand = (command: string) => {
  return new Promise((resolve, reject) => {
    if (!redisClient || redisClient.destroyed) {
      reject(new Error("Client is not connected"));
    }

    redisClient.write(command);

    redisClient.once("data", (data: Buffer) => {
      resolve(data.toString());

      redisClient.removeListener("error", onError);
    });

    redisClient.once("error", onError);
  });
};

test("should SET and GET a VALUE", async () => {
  const setResponse = await sendCommand("set foo bar");
  assert.strictEqual(setResponse, "+OK\r\n");

  const getResponse = await sendCommand("get foo");
  assert.strictEqual(getResponse, "$3\r\nbar\r\n");
});
