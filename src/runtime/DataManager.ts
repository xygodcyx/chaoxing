import type { Browser, Page } from 'playwright'
import Singleton from '../base/Singleton'
import type {
  CourseItem,
  TaskItem,
  UserStatus,
} from '../types/index'

export class DataManager extends Singleton {
  static get Instance(): DataManager {
    return super.GetInstance<DataManager>()
  }

  /** info.phone 存储的是加密后的phone */
  public userStatus: UserStatus = {
    info: {
      phone: '',
    },
    curCourseName: '',
    curTaskName: '',
  }

  public lastQrCodeImagePath = ''

  public password: string = ''

  public onlyVideoMode: boolean = false

  public globalTaskLink: string = ''

  public curTask: TaskItem | null = null
}
