import fs from "fs";
import { logger } from "./utils/logger";
import path from "path";

type StoreType = Record<string, { type: string; value: unknown }>;
type StoreExpirationTimes = Record<string, number>;

import config from "./config.json";
import { ExecuteCommand } from "./core";

const log = logger("persistence");

class Persistence {
  #filePath = path.join(__dirname, "snapshot.ss");
  #aofPath = path.join(__dirname, "appendonly.aof");
  store: StoreType;
  expirationTimes: StoreExpirationTimes;

  constructor() {
    this.store = {};
    this.expirationTimes = {};
  }

  loadSnapshotSync() {
    if (!fs.existsSync(this.#filePath)) {
      return;
    }

    try {
      const data = fs.readFileSync(this.#filePath, "utf8").toString();

      if (!data) {
        log.warn("Snapshot file is empty.");
        return;
      }

      const { store = {}, expirationTimes = {} } = JSON.parse(data);

      // Merge the loaded data with the current store and expiration times
      // This ensures that any new keys in the snapshot are added to the current store
      // and any existing keys are updated with the new values.
      Object.assign(this.store, store);
      Object.assign(this.expirationTimes, expirationTimes);

      log.info("Snapshot loaded successfully.");
    } catch (error) {
      log.error("Error loading snapshot:", error);
    }
  }

  async saveSnapshotAsync() {
    const data = JSON.stringify({
      store: this.store,
      expirationTimes: this.expirationTimes,
    });

    try {
      await fs.promises.writeFile(this.#filePath, data);
    } catch (error) {
      log.error("Error saving snapshot:", error);
    }
  }

  async appendAOF(command: string, args: string[]) {
    let aoflog = `${command} ${args.join(" ")}\r\n`;

    try {
      await fs.promises.appendFile(this.#aofPath, aoflog);
      log.info(`AOF log appended: ${aoflog.trim()}`);
    } catch (e: Error | any) {
      log.error("Error appending to AOF file:", e?.message);
    }
  }

  replayAofSync(executeCommand: ExecuteCommand) {
    if (!fs.existsSync(this.#aofPath) || !config.appendOnly) {
      return;
    }

    try {
      const data = fs.readFileSync(this.#aofPath, "utf8").toString();
      if (!data) {
        log.warn("AOF file is empty.");
        return;
      }

      const logs = data.split("\r\n").filter((log) => log.trim() !== "");

      for (const logEntry of logs) {
        const [command, ...args] = logEntry.split(" ");
        executeCommand(command, args, true);
      }
    } catch (error) {
      log.error("Error loading AOF file:", error);
    }
  }
}

const persistence = new Persistence();

export { persistence };
