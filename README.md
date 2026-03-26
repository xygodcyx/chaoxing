
# 🚀 Chaoxing (超星静默自动刷课答题)

[![Author](https://img.shields.io/badge/author-xygodcyx-orange)](https://github.com/xygodcyx)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
[![Build Tool: tsup](https://img.shields.io/badge/build-tsup-blue)](https://tsup.egoist.dev/)

> **⚠️ 严正声明**：本项目由 **xygodcyx** 原创开发，仅供技术学习与交流。**严禁用于任何商业用途**。使用者需自行承担账号风险及相关法律责任。

---

## ✨ 功能特性

* **⚡ 独家字体解密**：自研 `OCR-free` 字体解密引擎，通过字形 Hash 指纹识别，完美还原网页乱码，无需调用昂贵的 OCR 接口。
* **🤖 AI 智能答题**：深度集成 **DeepSeek-V3** 模型，支持单选、多选、判断题自动识别与高准度填充。
* **全自动化执行**：支持持久化 Session 管理，一次登录，长期有效。
* **图形化调试**：支持 `-s` 参数唤起浏览器界面，直观观察运行过程及手动干预。
* **多用户沙盒**：基于手机号的独立存储机制，支持多账号无缝切换与并发运行。

---

## 🛠️ 技术架构

本项目采用了**双引擎驱动**模式，确保在生产环境下的极速与轻量。

1. **Node.js 控制塔**：基于 Playwright 进行浏览器自动化控制，负责抓取数据与 UI 交互。
2. **Python 解密后端**：基于 `fontTools` 对混淆 TTF 字体进行实时二进制指纹比对，秒级还原混淆字符。
3. **LLM 决策层**：利用 DeepSeek API 对题目进行逻辑推理，输出精准的 index 映射。

---

## 📅 项目路线图 (TODO List)

### ✅ 已完成功能 (Completed)

* [x] **核心自动化架构**：基于 Playwright 的高可靠性浏览器封装。
* [x] **智能登录系统**：支持 Cookie 离线持久化，规避频繁风控。
* [x] **字体解密引擎**：实现 TTF 字形指纹库比对，攻克 `font-cxsecret` 乱码难题。
* [x] **自动答题模块**：集成 DeepSeek API，实现章节测验、作业的自动检索与填写。
* [x] **生产环境优化**：通过 `tsup` 实现 Dead Code Elimination，生产包不包含开发调试依赖。

### 🚧 开发中 (In Progress)

* [ ] **手动选择课程**：提供交互式列表，支持 `reselect` 命令随时切换目标课程。
* [ ] **多端通知推送**：集成 Server 酱/企业微信，任务状态实时推送到手机。

### 🎯 未来目标 (Future)

* [ ] **定时作息模拟**：支持随机起止时间，模拟真人阅读习惯。
* [ ] **验证码自动化**：探索接入轻量级本地卷积神经网络 (CNN) 识别滑块。

---

## 🔐 配置优先级

程序采用**就近原则**加载配置，优先级由高到低为：

1. **Command Line** (终端输入的 `-p`, `-w`, `-s` 等)
2. **Local Cache** (回退到上一次的执行进度)
3. **Local `.env`** (当前执行目录下的配置文件)
4. **Global `.env`** (全局配置文件 `~/.chaoxing/.env`)

### `.env` 示例

```env
# 基础配置
PHONE=138xxxxxxxx
PASSWORD=your_password

# AI 答题配置
DEEPSEEK_API_KEY=sk-xxxxxx
```

---

## 🛠 命令行交互 (CLI)

### 1. 启动任务 `run`

```bash
# 默认启动
chaoxing run

# 指定课程并开启可视化
chaoxing run -c "电影艺术" -s
```

| 参数 | 缩写 | 类型 | 描述 |
| :--- | :--- | :--- | :--- |
| `--phone` | `-p` | string | 指定登录手机号 |
| `--course` | `-c` | string | 课程名关键词匹配 |
| `--show` | `-s` | boolean | **显示浏览器界面**（调试/手动滑块必用） |

---

## ⚠️ 避坑指南

1. **关于验证码**：当触发滑块验证时，请务必带上 `-s` 参数，在弹出的窗口中手动完成滑动。
2. **关于解密服务**：开发模式下需确保 Python 后端正常运行（`python server/app.py`）。
3. **生产构建**：发布时请执行 `NODE_ENV=production npx tsup` 以剔除调试工具包。

---

## 📄 许可协议

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 协议发布。

**Copyright (c) 2026 xygodcyx.**
