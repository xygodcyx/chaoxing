export const EVENTS = {
  TASK_DONE: 'TASK_DONE',
} as const;

export type EVENT_ENUM = typeof EVENTS[keyof typeof EVENTS]