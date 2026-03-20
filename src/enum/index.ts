export const EVENTS_ENUM = {
  TASK_DONE: 'TASK_DONE',
  COURSE_DOWN: 'COURSE_DOWN',
} as const;

export type EVENT =
  (typeof EVENTS_ENUM)[keyof typeof EVENTS_ENUM];

export const LOG_LEVEL_ENUM = {
  INFO: 'info',
  START: 'start',
  SUCCESS: 'success',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LOG_LEVEL =
  (typeof LOG_LEVEL_ENUM)[keyof typeof LOG_LEVEL_ENUM];
