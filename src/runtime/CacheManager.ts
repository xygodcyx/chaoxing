import path from 'path';
import fs from 'fs/promises';
import Singleton from '../base/Singleton.ts';
import { CACHE_DIR_PATH } from '../consts/index.ts';
import {
  loadJsonDataForFile,
  saveJsonDataToFile,
} from '../utils/index.ts';

export class CacheManager extends Singleton {
  static get Instance(): CacheManager {
    return super.GetInstance<CacheManager>();
  }

  private keys: Set<string> = new Set();

  private cacheMap: Map<string, unknown | null> = new Map();

  async init() {
    await this.createKeys();
    for (const key of this.keys) {
      const data = await loadJsonDataForFile(
        `${CACHE_DIR_PATH}/${key}`,
        null,
      );
      this.cacheMap.set(key, data);
    }
  }

  async createKeys() {
    try {
      const dir = await fs.opendir(
        path.join('src', 'cache'),
      );
      for await (const dirent of dir)
        this.keys.add(dirent.name);
    } catch (err) {
      console.error(err);
    }
  }

  async save(key: string, data: unknown) {
    this.cacheMap.set(key, data);
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
