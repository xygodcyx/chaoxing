import type { Locator } from 'playwright'

/**
 * 章节测验/考试里“选项”的解析。
 *
 * 超星在不同皮肤、不同题型下给出的结构并不一致，目前见到过的形态有：
 *
 * 1. 最常见：一个选项就是一个 `[class*="before-after"]` 元素
 *    `<li class="before-after"><a class="before"></a><a class="after">选项文本</a></li>`
 *
 * 2. 部分皮肤（如部分新版课程/判断题）：一行选项里同时存在一个**空的**
 *    `.after`（占位/装饰）和真正带文本的 `.after`，直接 `locator('.after').textContent()`
 *    会命中多个元素抛出 strict mode violation。
 *
 * 3. 少数皮肤：`[class*="before-after"]` 只是外层包裹，真正的选项是其中的 `li`。
 *
 * 为了让「解析」和「点击」始终使用同一份、同一顺序的选项列表，这里把它们收敛成
 * 两个函数：`collectChoiceLocs` 负责取选项元素，`readChoiceText` 负责取选项文本。
 */

/**
 * 读取单个选项元素自身的选项文本。
 *
 * 优先取「属于当前选项自身的、非空且最长的 `.after` 文本」，这样空的占位节点会被
 * 自动忽略，嵌套在更内层选项容器里的 `.after` 也不会串到当前选项上。都取不到时
 * 再退化到 `innerText`。
 */
export async function readChoiceText(
  choiceLoc: Locator,
): Promise<string> {
  // 注意：这个回调会被原样序列化进页面里执行（tsx/esbuild 的 keepNames 会给
  // 具名函数/函数变量插上 `__name(...)` 这样的本地辅助函数，页面里并不存在，
  // 会直接抛 ReferenceError），所以函数体内不要声明具名函数或函数变量。
  return choiceLoc.evaluate((el: HTMLElement) => {
    const afterNodes = Array.from(
      el.querySelectorAll('.after'),
    ) as Array<HTMLElement>

    let ownMaxLength = 0
    let ownText = ''
    let anyMaxLength = 0
    let anyText = ''

    for (const node of afterNodes) {
      let text = (node.textContent || '')
        .replace(/[\n\r\t]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!text) continue
      if (text.length > anyMaxLength) {
        anyMaxLength = text.length
        anyText = text
      }

      // 排除嵌套在更内层选项容器里的 `.after`（它们属于其它选项）
      let parent = node.parentElement
      let nested = false
      while (parent && parent !== el) {
        if (/(^|\s)before-after/.test(parent.className || '')) {
          nested = true
          break
        }
        parent = parent.parentElement
      }
      if (nested) continue

      if (text.length > ownMaxLength) {
        ownMaxLength = text.length
        ownText = text
      }
    }

    return (
      ownText ||
      anyText ||
      (el.innerText || '')
        .replace(/[\n\r\t]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
  })
}

/**
 * 判断某个命中 `[class*="before-after"]` 的元素是不是「外层包裹」。
 * 它内部还含有同类元素时，说明真正的选项在更里层。
 */
async function isChoiceContainer(loc: Locator): Promise<boolean> {
  return loc.evaluate((el: HTMLElement) => {
    if (
      el.querySelector('.before-after, .before-after-checkbox')
    ) {
      return true
    }

    // 有些皮肤把 before-after 挂在“选项列表”这一层，里面是一个个 li；
    // 这种元素内部会包含多个带 `.after` 的行，同样属于外层包裹。
    let rowsWithAfter = 0
    const rows = el.querySelectorAll('li')
    for (const row of Array.from(rows)) {
      if (row.querySelector('.after')) rowsWithAfter++
      if (rowsWithAfter > 1) return true
    }
    return false
  })
}

/**
 * 收集一道题的选项元素。
 *
 * - 多选题优先用 `.before-after-checkbox`，其它题型优先用 `.before-after`；
 *   首选选择器取不到时回退到另一个（不同皮肤会给单选题挂 checkbox 类名）。
 * - 过滤掉「外层包裹」元素，只保留真正的选项行。
 * - 若命中的全是外层包裹（说明该类名挂在了包裹层上），退化为按 `li` 行收集。
 */
export async function collectChoiceLocs(
  subjectLoc: Locator,
  isMultipleChoice: boolean,
): Promise<Array<Locator>> {
  const selectors = isMultipleChoice
    ? ['.before-after-checkbox', '.before-after']
    : ['.before-after', '.before-after-checkbox']

  for (const selector of selectors) {
    const locs = await subjectLoc.locator(selector).all()
    if (!locs.length) continue

    const rowLocs: Array<Locator> = []
    for (const loc of locs) {
      if (!(await isChoiceContainer(loc))) rowLocs.push(loc)
    }
    if (rowLocs.length) return rowLocs

    // 该类名只是外层包裹，真正的选项在包裹层内部
    const rowInnerLocs = await subjectLoc
      .locator('.Zy_ulTop li, .Zy_ulTop > div')
      .all()
    if (rowInnerLocs.length) return rowInnerLocs
  }

  // 部分皮肤连 `.before-after` 都没有，只能按选项行取
  const fallbackLocs = await subjectLoc.locator('.Zy_ulTop li').all()
  if (fallbackLocs.length) return fallbackLocs

  return []
}

/**
 * 点击一个选项。
 *
 * 选中逻辑绑在哪一层各皮肤不一样：有的在 `li` 上，有的在 `a.before`/`a.after`
 * 上，有的在隐藏的 `input` 上。点最内层那个元素最稳：无论事件绑在它自己还是
 * 冒泡到 `li`，都能触发。
 */
export async function clickChoice(
  choiceLoc: Locator,
): Promise<void> {
  await choiceLoc.evaluate((el: HTMLElement) => {
    const input = el.querySelector(
      'input[type="radio"], input[type="checkbox"]',
    ) as HTMLElement | null
    if (input) {
      input.click()
      return
    }

    // 优先点带文本的 a（空的占位 a 往往没有选中事件）
    let textAnchor: HTMLElement | null = null
    const anchors = Array.from(el.querySelectorAll('a'))
    for (const anchor of anchors) {
      if ((anchor.textContent || '').trim()) {
        textAnchor = anchor as HTMLElement
        break
      }
    }
    if (textAnchor) {
      textAnchor.click()
      return
    }

    el.click()
  })
}
