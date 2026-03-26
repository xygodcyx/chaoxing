import MappingData from '../data/mapping.json';
import fs from 'fs/promises';
import { LoggerManager } from '../runtime/LoggerManager';
import path from 'path';

// 开发环境实时生成mapping，生产环境直接使用
export async function decodeFont(
  base64Font: string,
  encryptedText: string,
) {
  // 2. 替换字符串
  if (process.env.NODE_ENV === 'production') {
    return encryptedText
      .split('')
      .map(char => (MappingData as any)[char] || char)
      .join('');
  }

  try {
    const { default: axios } = await import('axios');
    const response = await axios.post(
      'http://localhost:8080/get_ttf',
      {
        base64: base64Font,
      },
    );
    const dataPath = path.resolve(
      'src',
      'data',
      'mapping.json',
    );
    const mapping = response.data;
    LoggerManager.Instance.debug(
      `[DEV] mapping数据已更新:${dataPath}`,
    );
    fs.writeFile(
      dataPath,
      JSON.stringify({ ...MappingData, ...mapping }),
    );
    return encryptedText
      .split('')
      .map(char => mapping[char] || char)
      .join('');
  } catch (e) {
    console.warn(
      '[Dev] Python server not responding, returning original text.',
    );
    return encryptedText;
  }
}
