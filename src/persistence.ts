import fs from "fs";
import { logger } from "./utils/logger";
import path from "path";

type StoreType = Record<string, { type: string; value: unknown }>;
type StoreExpirationTimes = Record<string, number>;

const log = logger("persistence");

class Persistence {
  #filePath = path.join(__dirname, "snapshot.ss");
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
}

const persistence = new Persistence();

export { persistence };
