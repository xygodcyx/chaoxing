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
  const envUsers = JSON.parse(
    process.env.USERS || '',
  ) as Array<UserEnvInfo>;

  const cacheUsers = CacheManager.Instance.load<
    Record<string, UserStatus>
  >(CACHE_KEY_ENUM.USER_STATUS, {});

  for (const envUser of envUsers) {
    const cacheUser = cacheUsers[envUser.phone] || {};
    DataManager.Instance.userStatus[envUser.phone] = {
      info: {
        phone: envUser.phone,
        password: envUser.password,
      },
      curCourseName:
        envUser.course || cacheUser.curCourseName || '',
      curTaskName:
        envUser.task || cacheUser.curTaskName || '',
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

    const user = DataManager.Instance.userStatus[key];
    const action = new Action(user);
    await action.init();
  }
}

main();
