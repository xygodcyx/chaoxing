import { CHAOXING_AI_PROMPT } from '../consts';
import { SubjectItem } from '../types';
import OpenAI from 'openai';

let openai: OpenAI;

export async function fetchAnswersFromAI(
  quizData: SubjectItem,
) {
  if (!openai) {
    openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }
  try {
    const completion = await openai.chat.completions.create(
      {
        messages: [
          {
            role: 'system',
            content: CHAOXING_AI_PROMPT,
          },
          {
            role: 'user',
            content: `这是你要回答的问题：${JSON.stringify(quizData)}`,
          },
        ],
        model: 'deepseek-chat',
      },
    );

    const rawContent =
      completion.choices[0].message.content || '[]';

    // 健壮处理：移除 AI 可能误加的 Markdown 标签
    const cleanJson = rawContent
      .replace(/```json|```/g, '')
      .trim();

    // 强制转为数字数组
    const result: number[] = JSON.parse(cleanJson);
    return result;
  } catch (error) {
    console.error('[DeepSeek] 请求失败:', error);
    return [];
  }
}
