import type { Page } from 'playwright';
import Singleton from '../base/Singleton.ts';
import type { TaskItem } from '../tasks/step-2-enter-course-page.ts';

// export interface ChapterContext {
//   title: string;
//   chapterId: string;
//   courseid: string;
//   clazzid: string;
//   cpi: string;
//   enc: string;
//   openc: string;
//   mooc2: string;
//   hidetype: string;
//   //   t: number;
// }

export class DataManager extends Singleton {
  static get Instance(): DataManager {
    return super.GetInstance<DataManager>();
  }

  public curTaskCourseName: string = '';
  public page: Page | null = null;
  public taskItems: Array<TaskItem> = [];
}
