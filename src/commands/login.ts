import { registerCommand } from './index';
import type { CommandLogin } from '../types/index';
import { enterLoginPage } from '../tasks/step-0-enter-login-page';
import { DataManager } from '../runtime/DataManager';
import { CacheManager } from '../runtime/CacheManager';
import { CACHE_KEY_ENUM } from '../enum';

export function registerLoginCommand() {
  registerCommand<CommandLogin>(
    'login',
    '登录',
    [
      {
        short: 'p',
        long: 'phone',
        type: 'string',
        description: '手机号',
      },
      {
        short: 'pw',
        long: 'password',
        type: 'string',
        description: '密码',
      },
    ],
    async str => {
      const phone = str.phone ?? process.env.PASSWORD;
      const password = str.password ?? process.env.PASSWORD;
      DataManager.Instance.userStatus.info.phone = phone;
      await CacheManager.Instance.save(
        `${phone}-${CACHE_KEY_ENUM.USER_STATUS}`,
        DataManager.Instance.userStatus,
      );
      await enterLoginPage(phone, password);
    },
  );
}
