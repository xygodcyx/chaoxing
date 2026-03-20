import type { Page } from 'playwright';
import Singleton from '../base/Singleton.ts';
import type {
  CourseItem,
  TaskItem,
} from '../types/index.ts';

export class DataManager extends Singleton {
  static get Instance(): DataManager {
    return super.GetInstance<DataManager>();
  }

  public page: Page | null = null;

  public courses: Array<CourseItem> = [];
  public curCourse: CourseItem | null = null;

  public tasks: Array<TaskItem> = [];
  public curTask: TaskItem | null = null;
}
