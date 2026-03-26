import { SubjectItem } from '../types';
import OpenAI from 'openai';

let openai: OpenAI;

export async function fetchAnswersFromAI(
  quizData: SubjectItem[],
) {
  if (!openai) {
    openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.API_KEY,
    });
  }
  try {
    const completion = await openai.chat.completions.create(
      {
        messages: [
          {
            role: 'system',
            content: `
            # Role
你是一个精准的答题助手。

# Task
根据用户提供的 JSON 题目列表，给出每道题正确答案对应的 index。

# Constraints
1. 逻辑要求：分析题目背景（如电影史、格里菲斯作品等），确保答案准确。
2. 多选题要求：如果某题是多选题且有多个正确答案，请将这些 index 全部平铺展开。
3. 格式要求：输出必须是一个纯粹的 JSON 整数数组，例如 [0, 1, 2, 4]。
4. 严禁事项：禁止包含任何解释、引言、Markdown 代码块（如 \`\`\`json）、换行符或多余空格。

# Output Example
[0, 3, 5, 6, 8]
                `,
          },
          {
            role: 'user',
            content: `这是你要回答的问题列表：${JSON.stringify(quizData)}, 此次的题目数量为:${quizData.length}，请回答完检查一遍答案数量，确保没有漏答`,
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
