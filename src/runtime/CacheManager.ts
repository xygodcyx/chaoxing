import path from 'path';
import Singleton from '../base/Singleton.ts';
import { CACHE_DIR_PATH } from '../consts/index.ts';
import { LoggerManager } from './LoggerManager.ts';
import {
  loadJsonDataForFile,
  saveJsonDataToFile,
} from '../utils/index.ts';
import { CACHE_KEY_ENUM } from '../enum/index.ts';

export class CacheManager extends Singleton {
  static get Instance(): CacheManager {
    return super.GetInstance<CacheManager>();
  }

  private keys: Set<string> = new Set();

  private cacheMap: Map<string, unknown | null> = new Map();

  async init() {
    const keys = await loadJsonDataForFile<Array<string>>(
      path.resolve(CACHE_DIR_PATH, CACHE_KEY_ENUM.KEYS),
      [],
    );
    if (!keys) {
      return;
    }
    this.keys = new Set(keys);
    for (const key of this.keys) {
      const data = await loadJsonDataForFile(
        `${CACHE_DIR_PATH}/${key}`,
        null,
      );
      this.cacheMap.set(key, data);
    }
  }

  async addKey(key: string) {
    this.keys.add(key);
    await saveJsonDataToFile(
      path.resolve(CACHE_DIR_PATH, CACHE_KEY_ENUM.KEYS),
      Array.from(this.keys),
    );
  }

  async save(key: string, data: unknown) {
    this.cacheMap.set(key, data);
    await this.addKey(key);
    return await saveJsonDataToFile(
      path.resolve(CACHE_DIR_PATH, key),
      data,
    );
  }

  load<T>(key: string, defaultValue: T) {
    if (!this.cacheMap.has(key)) {
      return defaultValue;
    }
    return this.cacheMap.get(key) as T;
  }
}
