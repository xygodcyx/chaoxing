import path from 'path';
import os from 'os';

export const DIR_BASE_URL =
  process.env.NODE_ENV === 'production' ? os.homedir() : '';

export const CHAOXING_DIR_URL = path.resolve(
  DIR_BASE_URL,
  '.chaoxing',
);

export const ENV_FILE_PATH = path.resolve(
  CHAOXING_DIR_URL,
  '.env',
);

export const LOGGER_DIR_PATH = path.resolve(
  CHAOXING_DIR_URL,
  'logs',
);

export const CACHE_DIR_PATH = path.resolve(
  CHAOXING_DIR_URL,
  'cache',
);

export const AUTH_DIR_PATH = path.resolve(
  CHAOXING_DIR_URL,
  'auth',
);

export const BASE_URL = 'https://mooc2-ans.chaoxing.com';

export const BASE_VERSION_ONE_URL =
  'https://mooc1.chaoxing.com';

export const TASK_LABELS = ['视频', '章节测验'];

export const BASE_TASK_URL = `${BASE_VERSION_ONE_URL}/mooc-ans/knowledge/cards`;

export const BASE_READ_URL = `${BASE_VERSION_ONE_URL}/mooc-ans/course`;

export const MULTIPLE_CHOICE = [
  [0],
  [0, 1],
  [0, 1, 2],
  [0, 1, 2, 3],
  [0, 1, 3],
  [0, 2],
  [0, 2, 3],
  [0, 3],
  [1],
  [1, 2],
  [1, 2, 3],
  [1, 3],
  [2],
  [2, 3],
  [3],
];
