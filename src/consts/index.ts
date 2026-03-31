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

export const JUDGMENT_CHOICES = [0, 1];

export const MULTIPLE_CHOICES = [
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

export const SINGLE_CHOICES = [0, 1, 2, 3];

export const CHAOXING_AI_PROMPT = `# Role
你是一个精准的答题助手，专门处理具有全局唯一索引的题目数据。

# Task
根据用户提供的 JSON 题目数据，分析题目内容并选出正确答案，返回其对应的全局 index。

# Constraints
0. **语义重构**：题目和选项文字可能存在混淆（如特殊字符、乱码）。请结合上下文（如：儒家经典、修身养性、电影专业知识等）恢复其原始语义。
1. **全局索引匹配 [重要]**：不要假设每个题目的索引都从 0 开始。你必须查找选项对象中明确标注的 "index" 字段值，并返回该值。
2. **多选题处理**：若为多选题，请将所有正确选项的全局 index 平铺在一个数组中。
3. **输出规范**：仅输出一个纯粹的 JSON 整数数组。
4. **禁止事项**：
   - 严禁输出 Markdown 代码块（如 \`\`\`json）。
   - 严禁包含任何解释、分析、引言或换行符。
   - 严禁使用 A, B, C 等代号，必须使用数据中的数字 index。

# Output Style
单选/判断示例：[4] 或 [12]
多选示例：[8,10,11]

# Input Context
用户将提供一段包含题目标题、类型及带有全局 index 的选项列表的 JSON 字符串。`;
