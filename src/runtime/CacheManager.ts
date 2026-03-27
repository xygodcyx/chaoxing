import path from 'path';
import fs from 'fs/promises';
import Singleton from '../base/Singleton';
import { CHAOXING_DIR_URL } from '../consts';
import {
  getStorageDirName,
  loadJsonDataForFile,
  saveJsonDataToFile,
} from '../utils/index';

export class CacheManager extends Singleton {
  static get Instance(): CacheManager {
    return super.GetInstance<CacheManager>();
  }

  private cacheMap: Map<string, unknown | null> = new Map();

  private activeCacheDir = path.resolve(CHAOXING_DIR_URL);

  async init(phone: string) {
    this.activeCacheDir =
      await this.reLinkCacheDirPath(phone);
    const dir = await fs.opendir(this.activeCacheDir);
    for await (const dirent of dir) {
      const data = await loadJsonDataForFile(
        `${this.activeCacheDir}/${dirent.name}`,
        null,
      );
      this.cacheMap.set(dirent.name, data);
    }
  }

  async reLinkCacheDirPath(phone: string) {
    this.activeCacheDir = path.join(
      CHAOXING_DIR_URL,
      phone ? getStorageDirName(phone) : '',
      'cache',
    );
    await fs.mkdir(this.activeCacheDir, {
      recursive: true,
    });
    return this.activeCacheDir;
  }

  async save(key: string, data: unknown) {
    this.cacheMap.set(key, data);
    return await saveJsonDataToFile(
      path.resolve(this.activeCacheDir, key),
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
