import fs from 'fs/promises';

import { registerCommand } from './index';
import type { CommandClear } from '../types/index';
import { CACHE_DIR_PATH } from '../consts/index';
import path from 'path';
import { LoggerManager } from '../runtime/LoggerManager';
import { formatBytes } from '../utils/index';

export function registerClearCommand() {
  registerCommand<CommandClear>(
    'clear',
    '清除指定用户的缓存（也可以全部清除）',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '要清楚用户缓存的手机号',
      },
      {
        short: 'a',
        long: 'all',
        type: 'string',
        description: '指定该参数时清除所有用户的缓存',
      },
    ],
    async str => {
      const phone = str.phone;
      const dirs = await fs.opendir(CACHE_DIR_PATH);
      const deletedList = [];
      for await (const dirent of dirs) {
        if (
          (dirent.name.includes(phone) || str.all) &&
          dirent.isFile()
        ) {
          const stats = await fs.stat(
            path.join(CACHE_DIR_PATH, dirent.name),
          );
          fs.unlink(path.join(CACHE_DIR_PATH, dirent.name));
          deletedList.push({ dirent, stats });
        }
      }
      let allSize = 0;
      deletedList.forEach(async f => {
        allSize += f.stats.size;
        LoggerManager.Instance.info(
          `删除文件: ${f.dirent.name} (${formatBytes(f.stats.size)})`,
        );
      });
      LoggerManager.Instance.success(
        `删除缓存成功，共删除${deletedList.length}个文件，共${formatBytes(allSize)}大小`,
      );
    },
  );
}
