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
  password: string;
}
export interface UserEnvInfo {
  phone: string;
  password: string;
  course?: string;
  task?: string;
}

export interface UserStatus {
  info: UserInfo;
  curCourseName?: string;
  curTaskName?: string;
}
