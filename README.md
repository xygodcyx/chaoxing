# 🚀 Chaoxing (超星静默自动刷课答题)

[![Author](https://img.shields.io/badge/author-xygodcyx-orange)](https://github.com/xygodcyx)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![NPM Version](https://img.shields.io/npm/v/chaoxing)](https://www.npmjs.com/package/chaoxing)
[![Build Tool: tsup](https://img.shields.io/badge/build-tsup-yellow)](https://tsup.egoist.dev/)

> **🛡️ 隐私与效率并重**：本项目专为超星（学习通）平台设计，通过 Playwright 自动化技术实现静默刷课与智能答题。采用高度脱敏的存储机制，确保你的账号隐私万无一失。

---

## ✨ 核心特性

* **🔐 极致隐私保护（Privacy First）**：
  * **目录脱敏**：用户数据存储在 `~/.chaoxing/[MD5_Hash]/`，物理隔离且无法反推手机号。
  * **全掩码交互**：手机号、密码、验证码输入均采用 `Password` 掩码模式，防窥视。
  * **日志脱敏**：控制台与本地日志自动屏蔽敏感字段（如手机号中间四位）。
* **⚡ 字体解密引擎**：基于：[chaoxing_solution_of_font_confusion](https://github.com/TellMeYourWish/chaoxing_solution_of_font_confusion)，感谢开源
* **🤖 AI 智能决策**：原生集成 **DeepSeek-V3** 模型，支持单选、多选、判断题的高精准度逻辑推理与自动填充。
* **多用户沙盒架构**：支持无限账号并发或切换，每个账号拥有独立的 `Cookie`、`Cache` 和 `Private Env` 配置文件。

---

## 📦 安装指南

### 环境要求

* **Node.js**: v18.0.0 或更高版本。
* **操作系统**: Windows, macOS, Linux (需安装 Playwright 依赖库)。

### 安装命令

```bash
# 全局安装
npm install -g chaoxing

# 安装浏览器驱动 (Playwright)
npx playwright install chromium
```

---

## ⚙️ 配置系统详解

程序采用**五级优先级**加载策略，确保配置的灵活性与安全性：

### 1. 优先级顺序（从高到低）

1. **CLI 命令行参数** (如 `-p`, `-c`, `-o`)
2. **Local Cache** (位于 `~/.chaoxing/[hash]/cache/`，记录上次刷课进度)
3. **项目局部 `.env`** (执行命令所在目录下的 `.env`)
4. **Private `.env` [⭐ 强烈推荐]**
   * 路径：`~/.chaoxing/[hash]/.env`
   * 用途：为特定账号设置专属的 `DEEPSEEK_API_KEY`。
5. **Global `.env`**
   * 路径：`~/.chaoxing/.env`
   * 用途：设置通用的配置项。

### 2. `.env` 配置文件模板

```env
# 基础登录信息
PHONE=13800000000
PASSWORD=your_password

# AI 答题配置
DEEPSEEK_API_KEY=sk-xxxxxx

# 任务过滤
COURSE=国学智慧
TASK=第一章
```

---

## 🛠 命令行交互 (CLI) 全手册

### 1. `run` 执行任务

这是最常用的命令，用于启动自动化流程。

```bash
# 基本启动（若无缓存则提示输入）
chaoxing run

# 指定课程并开启可视化调试
chaoxing run -c "电影艺术" -s

# 只刷课不答题
chaoxing run -o
```

| 参数 | 缩写 | 类型 | 描述 |
| :--- | :--- | :--- | :--- |
| `--phone` | `-p` | `string` | 指定手机号（支持加密输入） |
| `--course` | `-c` | `string` | 课程名 |
| `--task` | `-t` | `string` | 指定章节开始位置 |
| `--show` | `-s` | `boolean` | **显示浏览器界面**（手动处理滑块验证码或卡住时排错） |
| `--onlyVideo` | `-o` | `boolean` | **只刷视频不答题** |

### 2. 管理命令

* **`login`**：手动触发登录流程，更新指定用户的持久化 Cookie。
* **`clear`**：
  * `clear -p [手机号]`：清除特定账号的缓存和进度。
  * `clear -a`：一键清除所有账号数据。
* **`where`**：
  * `where -p [手机号]`：输出该用户脱敏后的哈希目录路径。
  * `where -g`：输出全局运行目录。
* **`reselect`**：当课程列表更新或需要重新爬取课程 ID 时使用。

---

## ⚠️ 避坑与进阶指南

1. **滑块验证码**：
   若程序卡在登录或验证环节，请带上 `-s` 参数启动，在弹出的浏览器窗口中手动完成滑动验证。
2. **DEEPSEEK_API_KEY 缺失**：
   若未配置 Key，程序将仅完成视频刷课，章节测验将自动跳过并记录。建议配置在 `Private Env` 中。
3. **Linux 服务器运行**：
   在无头模式（Headless）下运行，请确保已安装相关依赖，且不要带上 `-s` 参数。
4. **路径查找**：
   如果不确定 `.env` 放在哪，执行 `chaoxing where -p 你的手机号`，直接跳转到显示的目录下创建即可。

---

## 📄 许可协议

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议发布。

* **BY**: 署名。
* **NC**: 非商业性使用。
* **SA**: 相同方式共享。

**Copyright (c) 2026 xygodcyx. All rights reserved.**
