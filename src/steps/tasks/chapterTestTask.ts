import { Locator, Page } from 'playwright'
import { EVENTS_ENUM } from '../../enum'
import { resolveContentFrameLocator } from '../../parsers/pageContext'
import EventManager from '../../runtime/EventManager'
import { LoggerManager } from '../../runtime/LoggerManager'
import {
  ChoiceItem,
  SubjectItem,
  SubjectType,
  TaskItem,
} from '../../types'
import {
  cleanString,
  waitAlways,
  waitForRandomTime,
} from '../../utils'
import { decodeFont } from '../../utils/fontDecoder'
import {
  clickChoice,
  collectChoiceLocs,
  readChoiceText,
} from '../../utils/choice'
import { fetchAnswersFromAI } from '../../utils/ai'
import { DataManager } from '../../runtime/DataManager'

export async function execChapterTestTask(
  page: Page,
  task: TaskItem,
) {
  // TODO 完成章节测验的自动答题功能
  LoggerManager.Instance.start(
    `当前为 ${task.title} 的章节测验页面, 开始执行任务...题目网页: ${page.url()}`,
  )

  if (DataManager.Instance.onlyVideoMode) {
    LoggerManager.Instance.info('跳过答题')
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    LoggerManager.Instance.warn(
      `没有 DEEPSEEK_API_KEY, 无法执行自动答任务, 请前往deepseek官网生成DEEPSEEK_API_KEY: https://platform.deepseek.com/DEEPSEEK_API_KEYs`,
    )
    LoggerManager.Instance.warn(
      '请运行 "chaoxing where" 命令前往配置目录编辑.env文件并添加DEEPSEEK_API_KEY字段, eg: DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx',
    )
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  }

  // 章节测验的外壳: 老版本是 work/index.html 这个 iframe, 新版本可能直接挂在
  // #frame_content 下, 逐级回退, 别让某一版结构把整轮跑崩
  const workFrameCount = await page
    .locator('iframe[src*="work/index.html"]')
    .count()

  const taskFrame = workFrameCount > 0
    ? page.frameLocator('iframe[src*="work/index.html"]').first()
    : await resolveContentFrameLocator(page)

  const innerFrameCount = await taskFrame
    .locator('iframe#frame_content')
    .count()

  const finalQuizFrame = innerFrameCount > 0
    ? taskFrame.frameLocator('iframe#frame_content').first()
    : taskFrame

  // 绝大多数皮肤都把题目套在 #ZyBottom 里; 个别新皮肤没有这一层, 退回整个文档
  const zyBottom = finalQuizFrame.locator('#ZyBottom')
  const wrapLoc = (await zyBottom.count()) > 0
    ? zyBottom
    : finalQuizFrame.locator('body')

  // 认题的锚点: 老皮肤 .singleQuesId, 新皮肤 .questionLi, 都没有就不是答题页
  const questionNodeCount = await wrapLoc
    .locator('.singleQuesId, .questionLi')
    .count()
  if (questionNodeCount === 0) {
    LoggerManager.Instance.warn(
      '当前页面不是测试页, 跳过',
    )
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  }

  // 状态标签有可能没有(新皮肤), 取不到就当"还没做过"
  const status = await finalQuizFrame
    .locator('.testTit_status')
    .first()
    .textContent({ timeout: 3000 })
    .catch(() => '')

  if (status === '已完成' || status === 'Completed') {
    LoggerManager.Instance.success(
      `${task.title} 刷完啦, 开始刷下一个`,
    )
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  }

  // 提交按钮在各版皮肤里叫法不一样, 挨个试
  const SUBMIT_SELECTORS = [
    '.btnSubmit',
    '#submitBtn',
    '.completeBtn',
    'a[onclick*="submit"]',
  ]
  let submitLoc: Locator | null = null
  for (const selector of SUBMIT_SELECTORS) {
    if ((await finalQuizFrame.locator(selector).count()) > 0) {
      submitLoc = finalQuizFrame.locator(selector).first()
      break
    }
  }
  if (!submitLoc) {
    LoggerManager.Instance.warn(
      `${task.title} 没有找到提交按钮, 跳过该任务`,
    )
    EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
    return
  }

  const subjectTypeLocs = await wrapLoc
    .locator('.newTestType')
    .all()

  // 不同皮肤的题目容器类名不同：老皮肤用 .singleQuesId，部分新皮肤用
  // .questionLi，这里两者都收，取能取到的那一份。
  let subjectLocs = await wrapLoc
    .locator('.singleQuesId')
    .all()

  if (!subjectLocs.length) {
    subjectLocs = await wrapLoc.locator('.questionLi').all()
  }

  // 选项元素与解析顺序严格一一对应，避免「解析时一套 DOM、点击时另一套 DOM」
  // 导致全局 index 错位。
  const allChoiceLocs: Array<Locator> = []

  const subjectList: Array<SubjectItem> = []

  const subjectLengthRegex = /\s*(\d+)\s*/
  const subjectTypeRegex =
    /(单选题|多选题|填空题|判断题|简答题)/

  let subjectLocIndexOffset = 0

  // 答完题后不加载加密字体
  let fontBase64 = ''
  const cxSecretStyleLocal = finalQuizFrame.locator(
    '#cxSecretStyle',
  )

  const cxSecretStyleCount =
    await cxSecretStyleLocal.count()

  if (cxSecretStyleCount > 0) {
    let cxSecretStyle = (
      await cxSecretStyleLocal.innerHTML()
    ).split('font-ttf;charset=utf-8;base64,')
    if (cxSecretStyle.length > 1) {
      fontBase64 = cxSecretStyle[1].split("')")[0]
    }
  }

  let choiceIndex = 0
  // 题型标注: 常见的皮肤是每组题前面有个 .newTestType; 个别皮肤没有这一层,
  // 这时退化成"一题一组", 题型留空(后面按选项结构自己判断)
  const hasTypeMarkers = subjectTypeLocs.length > 0
  const typeGroups = await Promise.all(
    (hasTypeMarkers ? subjectTypeLocs : subjectLocs).map(
      async (loc) => {
        const content = hasTypeMarkers
          ? (await loc.textContent()) || ''
          : ''
        return {
          type: (content.match(subjectTypeRegex)?.[1] || '') as SubjectType,
          length: hasTypeMarkers
            ? +(content.match(subjectLengthRegex)?.[1] || '1')
            : 1,
        }
      },
    ),
  )

  // 题目元素先耗尽时（题型标注与题目元素数量对不上），直接结束解析
  let subjectLocsExhausted = false
  for (const group of typeGroups) {
    if (subjectLocsExhausted) break
    const subjectType = group.type
    for (let index = 0; index < group.length; index++) {
      const subjectLoc = subjectLocs[subjectLocIndexOffset]
      if (!subjectLoc) {
        LoggerManager.Instance.warn(
          `${task.title} 解析到的题目数量少于题型标注的数量, 停止解析`,
        )
        subjectLocsExhausted = true
        break
      }
      subjectLocIndexOffset++
      const subjectTitle =
        (
          await subjectLoc
            .locator('.Zy_TItle')
            .textContent()
        )?.trim() || ''
      const cleanedTitle = cleanString(subjectTitle)

      const decodeTitle = await decodeFont(fontBase64, cleanedTitle)

      const choiceLocs = await collectChoiceLocs(
        subjectLoc,
        subjectType === '多选题',
      )
      const choices: Array<ChoiceItem> = []
      for (const choiceLoc of choiceLocs) {
        const choiceContent = await readChoiceText(choiceLoc)
        const cleanChoiceContent = cleanString(
          choiceContent || '',
        )
        const decodeChoiceContent = await decodeFont(
          fontBase64,
          cleanChoiceContent,
        )
        const choiceItem = {
          index: choiceIndex,
          content: decodeChoiceContent,
        }
        choices.push(choiceItem)
        allChoiceLocs.push(choiceLoc)
        choiceIndex++
      }

      if (!choices.length) {
        const outerHTML = await subjectLoc
          .evaluate((el: HTMLElement) => el.outerHTML)
          .catch(() => '')
        LoggerManager.Instance.warn(
          `${task.title} 第 ${subjectLocIndexOffset} 题没有解析到选项, 题目: ${decodeTitle}, 结构: ${outerHTML.slice(0, 2000)}`,
        )
      }

      subjectList.push({
        title: decodeTitle,
        type: subjectType,
        choices,
      })
    }
  }

  LoggerManager.Instance.debug(
    `${task.title} 的题目列表:\r\n ${JSON.stringify(subjectList)}`,
  )

  LoggerManager.Instance.info(
    `${task.title} 的题目数量：${subjectList.length}`,
  )

  LoggerManager.Instance.info(
    `${task.title} 题目的所有选项数量：${allChoiceLocs.length}`,
  )

  const aiAnswers: number[] = []
  for (const subject of subjectList) {
    const answer = await fetchAnswersFromAI(subject)
    aiAnswers.push(...answer)
    await LoggerManager.Instance.info(
      `AI为题目: ${subject.title} 返回了答案: ${answer}`,
    )
  }

  LoggerManager.Instance.info(
    `AI 返回了答案: ${JSON.stringify(aiAnswers)}`,
  )

  if (!allChoiceLocs.length) {
    throw new Error(
      `${task.title} 没有解析到任何选项, 无法自动答题`,
    )
  }

  const clickedIndexes = new Set<number>()
  for (const rawIndex of aiAnswers.flat()) {
    const answerIndex = Number(rawIndex)
    if (!Number.isInteger(answerIndex)) continue
    if (
      answerIndex < 0 ||
      answerIndex >= allChoiceLocs.length
    ) {
      LoggerManager.Instance.warn(
        `AI 返回的选项下标 ${answerIndex} 超出范围, 已跳过`,
      )
      continue
    }
    if (clickedIndexes.has(answerIndex)) continue
    clickedIndexes.add(answerIndex)
    await clickChoice(allChoiceLocs[answerIndex])
    await waitForRandomTime(200, 100)
  }


  await submitLoc.evaluate((el: HTMLElement) => el.click())

  await waitForRandomTime(2000)

  // 交卷后可能弹"确认提交", 也可能直接出成绩, 弹了就点掉
  const CONFIRM_SELECTORS = ['#popok', '.popok', '.btnOk', '#popokBtn']
  for (const selector of CONFIRM_SELECTORS) {
    const confirmLoc = finalQuizFrame.locator(selector).first()
    if ((await confirmLoc.count()) > 0) {
      await confirmLoc
        .evaluate((el: HTMLElement) => el.click())
        .catch(() => {})
      break
    }
  }

  const achievement = await finalQuizFrame
    .locator('.achievement i')
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => '')
  LoggerManager.Instance.success(
    `答题完成, 本次成绩：${achievement || '未知'} 分`,
  )
  // await waitAlways();
  await waitForRandomTime(2000)
  LoggerManager.Instance.success(
    `${task.title} 刷完啦, 开始刷下一个`,
  )
  EventManager.Instance.emit(EVENTS_ENUM.TASK_DONE, task)
  return
}
