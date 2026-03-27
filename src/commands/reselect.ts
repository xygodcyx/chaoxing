import * as p from '@clack/prompts';
import { registerCommand } from './index';

import type { CommandReselect } from '../types/index';
import { LoggerManager } from '../runtime/LoggerManager';
import {
  formatBytes,
  getLoggedChromePage,
  getStorageDirName,
} from '../utils/index';
import type { Dirent, Stats } from 'fs';
import { ConfigManager } from '../runtime/ConfigManager';
import { CacheManager } from '../runtime/CacheManager';
import { CACHE_KEY_ENUM } from '../enum';
import { enterPersonCenter } from '../steps/step-1-enter-person-center-page';

export function registerReselectCommand() {
  registerCommand<CommandReselect>(
    'reselect',
    '重新选择指定用户的待刷课程',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '要重新选择课程的手机号',
      },
    ],
    async str => {
      let phone = str.phone;
      const show = str.show;
      ConfigManager.Instance.launchOption.headless = !show;
      if (!phone) {
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
      try {
        await CacheManager.Instance.reLinkCacheDirPath(
          getStorageDirName(phone),
        );
        const { browser, page } =
          await getLoggedChromePage(phone);
        const courses = await enterPersonCenter(page);
        await CacheManager.Instance.save(
          `${CACHE_KEY_ENUM.COURSES}`,
          courses,
        );
        await browser.close();
      } catch (error: any) {
        LoggerManager.Instance.error(
          `重选课程出错：${error.message}`,
          error,
        );
      }
    },
  );
}
