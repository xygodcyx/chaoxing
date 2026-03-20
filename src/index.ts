import 'dotenv/config';
import { DataManager } from './runtime/DataManager.ts';
import Action from './action/Action.ts';
import { CacheManager } from './runtime/CacheManager.ts';
import type {
  UserEnvInfo,
  UserStatus,
} from './types/index.ts';
import { CACHE_KEY_ENUM } from './enum/index.ts';

function initUserStatus() {
  const users = JSON.parse(
    process.env.USERS || '',
  ) as Array<UserEnvInfo>;

  const cacheData = CacheManager.Instance.load<
    Record<string, UserStatus>
  >(CACHE_KEY_ENUM.USER_STATUS, {});

  for (const user of users) {
    const us = cacheData[user.phone] || {};
    DataManager.Instance.userStatus[user.phone] = {
      info: {
        phone: user.phone,
        password: user.password,
      },
      curCourseName: user.course || us.curCourseName || '',
      curTaskName: user.task || us.curTaskName || '',
    };
  }
}
async function main() {
  await CacheManager.Instance.init();
  initUserStatus();
  for (const key in DataManager.Instance.userStatus) {
    if (
      !Object.hasOwn(DataManager.Instance.userStatus, key)
    )
      continue;

    const us = DataManager.Instance.userStatus[key];
    const action = new Action(us);
    await action.init();
  }
}

main();
