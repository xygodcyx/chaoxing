import * as p from '@clack/prompts';

import { registerCommand } from './index';
import { CHAOXING_DIR_URL } from '../consts/index';
import { LoggerManager } from '../runtime/LoggerManager';
import type { CommandWhere } from '../types';
import path from 'path';
import { getStorageDirName } from '../utils';
import { DataManager } from '../runtime/DataManager';

export function registerWhereCommand() {
  registerCommand<CommandWhere>(
    'where',
    '查看chaoxing的运行时目录',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '查看指定用户的运行时目录',
      },
      {
        short: 'g',
        long: 'global',
        description: '查看全局运行时目录',
      },
    ],
    async str => {
      let phone = str.phone;
      let global = str.global;
      if (!phone && !global) {
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
        DataManager.Instance.userStatus.info.phone = phone
        LoggerManager.Instance.success(
          `${path.resolve(CHAOXING_DIR_URL, getStorageDirName(phone))}`,
        );
        return;
      }
      LoggerManager.Instance.success(`${CHAOXING_DIR_URL}`);
    },
  );
}
