export const EVENTS_ENUM = {
  VIDEO_DONE: 'VIDEO_DONE',
  CHAPTER_TEST: 'CHAPTER_TEST',
  TASK_DONE: 'TASK_DONE',
  COURSE_DOWN: 'COURSE_DOWN',
} as const;

export type EVENT =
  (typeof EVENTS_ENUM)[keyof typeof EVENTS_ENUM];

export const LOG_LEVEL_ENUM = {
  INFO: 'info',
  START: 'start',
  DEBUG: 'debug',
  BOX: 'box',
  SUCCESS: 'success',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type LOG_LEVEL =
  (typeof LOG_LEVEL_ENUM)[keyof typeof LOG_LEVEL_ENUM];

export const CACHE_KEY_ENUM = {
  KEYS: 'KEYS',
  USER_STATUS: 'USER_STATUS',
  COURSES: 'COURSES',
  TASKS: 'TASKS',
} as const;

export type CACHE_KEY =
  (typeof CACHE_KEY_ENUM)[keyof typeof CACHE_KEY_ENUM];
