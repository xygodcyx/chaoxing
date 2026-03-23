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
}

export interface CommandClear {
  phone: string;
  all: string;
}

export interface CommandLogin {
  phone: string;
  password: string;
}
