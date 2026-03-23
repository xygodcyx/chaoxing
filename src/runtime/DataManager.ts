import type { Browser, Page } from 'playwright';
import Singleton from '../base/Singleton';
import type {
  CourseItem,
  TaskItem,
  UserStatus,
} from '../types/index';

export class DataManager extends Singleton {
  static get Instance(): DataManager {
    return super.GetInstance<DataManager>();
  }

  public userStatus: UserStatus = {
    info: {
      phone: '',
    },
    curCourseName: '',
    curTaskName: '',
  };

  public globalTaskId: number = 0;
}
