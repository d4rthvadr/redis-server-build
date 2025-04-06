import assert from "assert";
import { describe, test } from "node:test";
import { buildRedisCommand } from "../src/utils/build-command";

describe("buildRedisCommand", () => {
  test("should construct a valid Redis command for a single argument", () => {
    const command = buildRedisCommand("PING");
    assert.strictEqual(command, "*1\r\n$4\r\nPING\r\n");
  });

  test("should construct a valid Redis command for multiple arguments", () => {
    const command = buildRedisCommand("SET key value");
    assert.strictEqual(
      command,
      "*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n"
    );
  });

  test("should handle empty input", () => {
    const command = buildRedisCommand("");
    assert.strictEqual(command, "*1\r\n$0\r\n\r\n");
  });

  test("should handle input with extra spaces", () => {
    const command = buildRedisCommand("  SET   key   value  ");
    assert.strictEqual(
      command,
      "*5\r\n$0\r\n\r\n$3\r\nSET\r\n$0\r\n\r\n$3\r\nkey\r\n$0\r\n\r\n$5\r\nvalue\r\n$0\r\n\r\n"
    );
  });

  test("should handle special characters in arguments", () => {
    const command = buildRedisCommand("SET key !@#$%^&*()");
    assert.strictEqual(
      command,
      "*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$10\r\n!@#$%^&*()\r\n"
    );
  });

  test("should handle numeric arguments", () => {
    const command = buildRedisCommand("INCRBY counter 10");
    assert.strictEqual(
      command,
      "*3\r\n$6\r\nINCRBY\r\n$7\r\ncounter\r\n$2\r\n10\r\n"
    );
  });
});
