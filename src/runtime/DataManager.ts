import type { Browser, Page } from 'playwright';
import Singleton from '../base/Singleton.ts';
import type {
  CourseItem,
  TaskItem,
  UserStatus,
} from '../types/index.ts';

export class DataManager extends Singleton {
  static get Instance(): DataManager {
    return super.GetInstance<DataManager>();
  }

  public userStatus: Record<string, UserStatus> = {};

  globalTaskId: number = 0;
}
