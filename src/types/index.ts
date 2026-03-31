export interface CourseItem {
  title: string;
  link: string;
  isFinish: boolean;
  index: number;
}

export interface TaskItem {
  title: string;
  link: string;
  isFinish: boolean;
  lessCount: number;
  knowledgeid: string;
  searchParams: string;
  index: number;
}

export interface UserInfo {
  phone: string;
}
export interface EnvUserInfo {
  phone: string;
  course?: string;
  task?: string;
}
export interface CommandUserInfo extends EnvUserInfo {}

export interface UserStatus {
  info: UserInfo;
  curCourseName?: string;
  curTaskName?: string;
}

export interface CommandRun {
  phone: string;
  course: string;
  task: string;
  show: boolean;
  onlyVideo: boolean;
}

export interface CommandClear {
  phone: string;
  all: boolean;
}

export interface CommandLogin {
  phone: string;
  password: string;
  verification: boolean;
  qrcode: boolean;
  show: boolean;
}
export interface CommandWhere {
  phone: string;
  global: boolean;
}

export interface CommandReselect {
  phone: string;
  show: boolean;
}

export interface ChoiceItem {
  index: number;
  content: string;
}

export type SubjectType =
  | '单选题'
  | '多选题'
  | '选择题'
  | '填空题'
  | '判断题'
  | '简答题';
export interface SubjectItem {
  type: SubjectType;
  title: string;
  choices: Array<ChoiceItem>;
}

export interface SafeCallConfig {
  message?: string; // 额外信息
  retries?: number; // 最大重试次数
  delay?: number; // 基础延迟时间 (ms)
  silent?: boolean; // 是否静默处理（不打印 error 级别的日志）
  exponential?: boolean; // 是否启用指数退避 (即重试时间翻倍)
}
