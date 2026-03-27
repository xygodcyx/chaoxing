import * as p from '@clack/prompts';

import fs from 'fs/promises';
import path from 'path';

import { registerCommand } from './index';
import type { CommandClear } from '../types/index';
import { CHAOXING_DIR_URL } from '../consts/index';
import { LoggerManager } from '../runtime/LoggerManager';
import {
  formatBytes,
  getStorageDirName,
} from '../utils/index';
import type { Dirent, Stats } from 'fs';

interface DeleteItem {
  dirent: Dirent<string>;
  stats: Stats;
}
export function registerClearCommand() {
  registerCommand<CommandClear>(
    'clear',
    '清除指定用户的缓存（也可以全部清除）',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '要清除用户缓存的手机号',
      },
      {
        short: 'a',
        long: 'all',
        description: '指定该参数时清除所有用户的缓存',
      },
    ],
    async str => {
      let phone = str.phone;
      const all = str.all;
      if (!phone && !all) {
        phone = (await p.password({
          message: '请输入手机号',
          validate(value) {
            if (!value || value.length !== 11)
              return '手机号格式不正确';
          },
        })) as string;
        if (!phone) {
          LoggerManager.Instance.error('请提供手机号');
          return;
        }
      }

      const deletedList: Array<DeleteItem> = [];

      if (phone && !all) {
        const cacheDirPath = path.resolve(
          CHAOXING_DIR_URL,
          getStorageDirName(phone),
          'cache',
        );
        const list = await deleteCacheForDir(cacheDirPath);
        deletedList.push(...list);
      } else if (all && !phone) {
        const list = await findAllCacheDirAndDelete(
          CHAOXING_DIR_URL,
        );
        deletedList.push(...list);
      } else if (phone && all) {
        LoggerManager.Instance.error(
          '不能同时指定phone和all参数, 请任选其一',
        );
        return;
      }
      let allSize = 0;
      deletedList.forEach(async f => {
        allSize += f.stats.size;
        LoggerManager.Instance.info(
          `删除文件${f.dirent.name} : ${path.join(f.dirent.parentPath, f.dirent.name)} (${formatBytes(f.stats.size)})`,
        );
      });
      LoggerManager.Instance.success(
        `删除缓存成功, 共删除${deletedList.length}个文件, 共${formatBytes(allSize)}大小`,
      );
    },
  );
}

async function deleteCacheForDir(dir: string) {
  const deletedList: Array<DeleteItem> = [];
  const dirs = await fs.opendir(dir);
  for await (const dirent of dirs) {
    if (dirent.isFile()) {
      const stats = await fs.stat(
        path.join(dir, dirent.name),
      );
      fs.unlink(path.join(dir, dirent.name));
      deletedList.push({ dirent, stats });
    }
  }
  return deletedList;
}

async function findAllCacheDirAndDelete(
  baseDir: string,
  deletedList: Array<DeleteItem> = [],
) {
  const dirs = await fs.opendir(baseDir);
  for await (const dirent of dirs) {
    const isDir = dirent.isDirectory();
    const name = dirent.name;
    if (!isDir) continue;
    if (name === 'cache') {
      const list = await deleteCacheForDir(
        path.resolve(baseDir, 'cache'),
      );
      deletedList.push(...list);
    } else {
      await findAllCacheDirAndDelete(
        path.resolve(baseDir, dirent.name),
        deletedList,
      );
    }
  }
  return deletedList;
}
