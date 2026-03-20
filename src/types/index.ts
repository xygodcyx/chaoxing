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
