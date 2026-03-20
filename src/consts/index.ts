import path from 'path';

export const LOGGER_FILE_PATH = path.resolve(
  'src',
  'logs',
  'index.log',
);
export const CACHE_DIR_PATH = path.resolve('src', 'cache');

export const AUTH_FILE_BASE_PATH = path.resolve(
  'playwright',
  '.auth',
);

export const BASE_URL = 'https://mooc2-ans.chaoxing.com';
export const BASE_VERSION_ONE_URL =
  'https://mooc1.chaoxing.com';

export const TASK_LABELS = ['视频', '章节测验'];

export const BASE_TASK_URL = `${BASE_VERSION_ONE_URL}/mooc-ans/knowledge/cards`;

export const BASE_READ_URL = `${BASE_VERSION_ONE_URL}/mooc-ans/course`;
