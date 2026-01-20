# AI 圆桌 (AI Roundtable)

![GitHub Repo stars](https://img.shields.io/github/stars/axtonliu/ai-roundtable?style=social)
![GitHub forks](https://img.shields.io/github/forks/axtonliu/ai-roundtable?style=social)
![License](https://img.shields.io/github/license/axtonliu/ai-roundtable)

> **Forked from [axtonliu/ai-roundtable](https://github.com/axtonliu/ai-roundtable) with enhancements**

让多个 AI 助手围桌讨论，交叉评价，深度协作

**本版本修改内容：**
- ✨ 新增中国 AI 支持：DeepSeek、通义千问（Qwen）、Kimi、豆包、智谱清言（ChatGLM）
- 🔧 修复连接中断问题，添加动态刷新能力，提升长时间对话稳定性
- 🎨 全新 Apple Dark Mode 风格 UI 设计，玻璃拟态风格
- ✅ 修复豆包回复重复捕获问题，添加内容去重机制
- ✅ 修复 AI 评价中断问题，优化长消息处理和重试机制
- 🆕 新增一键开启新对话功能
- 🌏 优化中国 AI 平台的适配体验

**原项目特性保留：**

**Developer Preview** - 这是开发者抢先版，功能可能变化，不保证向后兼容。

**本地运行，数据不离开你的浏览器** - 无需 API Key，直接操作 AI 网页界面。

**欢迎反馈** - 接受 Issue 和 PR；不承诺长期支持和兼容性。

---

一个 Chrome 扩展，让你像"会议主持人"一样，同时操控多个 AI（Claude、ChatGPT、Gemini、DeepSeek、Qwen、Kimi、豆包、ChatGLM），实现真正的 AI 圆桌会议。

<!-- TODO: 添加 GIF 演示 -->
<!-- ![Demo GIF](assets/demo.gif) -->

## 核心特性

- **统一控制台** - 通过 Chrome 侧边栏同时管理 8 个 AI（4 个国际 + 4 个中国）
- **多目标发送** - 一条消息同时发给多个 AI，对比回答
- **互评模式** - 让所有 AI 互相评价，对等参与（/mutual 命令）
- **交叉引用** - 让 Claude 评价 ChatGPT 的回答，或反过来
- **Discussion Mode** - 两个 AI 就同一主题进行多轮深度讨论
- **无需 API** - 直接操作网页界面，使用你现有的 AI 订阅
- **一键新对话** - 快速为选中的 AI 开启新对话
- **智能重连** - 自动检测并恢复失效的连接

## 支持的 AI 平台

| AI | 平台 | URL |
|---|---|---|
| Claude | Anthropic | https://claude.ai |
| ChatGPT | OpenAI | https://chatgpt.com |
| Gemini | Google | https://gemini.google.com |
| DeepSeek | DeepSeek | https://chat.deepseek.com |
| Qwen 通义千问 | 阿里云 | https://tongyi.aliyun.com/qianwen/ |
| Kimi | 月之暗面 | https://kimi.moonshot.cn |
| 豆包 | 字节跳动 | https://www.doubao.com/chat/ |
| ChatGLM | 智谱清言 | https://chatglm.cn |

## 安装

### 快速安装（推荐）

**方式一：从 Release 下载**

1. 前往 [Releases 页面](https://github.com/CHOSENX-GPU/ai-roundtable/releases)
2. 下载最新版本的 `ai-roundtable-vX.X.X.zip`
3. 解压到任意文件夹
4. 打开 Chrome，进入 `chrome://extensions/`
5. 开启右上角「开发者模式」
6. 点击「加载已解压的扩展程序」
7. 选择解压后的文件夹

**方式二：开发者模式安装**

1. 下载或克隆本仓库
2. 打开 Chrome，进入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本项目文件夹

详细安装说明请查看 [INSTALLATION.md](https://github.com/CHOSENX-GPU/ai-roundtable/blob/master/INSTALLATION.md)

## 使用方法

### 准备工作

1. 打开 Chrome，登录以下 AI 平台（根据需要）：
   - [Claude](https://claude.ai)
   - [ChatGPT](https://chatgpt.com)
   - [Gemini](https://gemini.google.com)
   - [DeepSeek](https://chat.deepseek.com)
   - [通义千问](https://tongyi.aliyun.com/qianwen/)
   - [Kimi](https://kimi.moonshot.cn)
   - [豆包](https://www.doubao.com/chat/)
   - [智谱清言](https://chatglm.cn)

2. 推荐使用 Chrome 的 Split Tab 功能，将多个 AI 页面并排显示

3. 点击扩展图标，打开侧边栏控制台

### Normal Mode（普通模式）

**基本发送**
1. 勾选要发送的目标 AI（支持多选）
2. 输入消息
3. 按 Enter 或点击「发送」按钮

**新对话功能**
- 勾选想要开启新对话的 AI
- 点击「新对话」按钮
- 所有选中的 AI 会自动导航到新对话页面

**@ 提及语法**
- 点击 @ 按钮快速插入 AI 名称
- 或手动输入：`@Claude 你怎么看这个问题？`

**互评（推荐）**

基于当前已有的回复，让所有选中的 AI 互相评价：
```
/mutual
/mutual 重点分析优缺点
```

用法：
1. 先发送一个问题给多个 AI，等待它们各自回复
2. 点击 `/mutual` 按钮或输入 `/mutual`
3. 每个 AI 都会收到其他 AI 的回复并进行评价
   - 2 AI：A 评价 B，B 评价 A
   - 3 AI：A 评价 BC，B 评价 AC，C 评价 AB

**交叉引用（单向）**

两个 AI（自动检测）：
```
@Claude 评价一下 @ChatGPT
```
最后 @ 的是来源（被评价），前面的是目标（评价者）

三个 AI（使用 /cross 命令）：
```
/cross @Claude @Gemini <- @ChatGPT 评价一下
/cross @ChatGPT <- @Claude @Gemini 对比一下
```

**动作下拉菜单**：快速插入预设动作词（评价/借鉴/批评/补充/对比）

### Discussion Mode（讨论模式）

让两个 AI 就同一主题进行深度辩论：

1. 点击顶部「讨论」切换到讨论模式
2. 选择 2 个参与讨论的 AI
3. 输入讨论主题
4. 点击「开始讨论」

**讨论流程**

```
Round 1: 两个 AI 各自阐述观点
Round 2: 互相评价对方的观点
Round 3: 回应对方的评价，深化讨论
...
Summary: 生成讨论总结
```

## UI 设计特色

本版本采用 **Apple Dark Mode 风格**，主要特点：

- **玻璃拟态**：半透明背景 + 模糊效果
- **霓虹品牌色**：每个 AI 都有独特的品牌发光色
- **流畅动画**：悬停效果、状态转换动画
- **清晰层级**：信息架构清晰，重点突出
- **自适应滚动**：活动日志固定高度，内容自动滚动

## 技术架构

```
ai-roundtable/
├── manifest.json           # Chrome 扩展配置 (Manifest V3)
├── background.js           # Service Worker 消息中转
├── sidepanel/
│   ├── panel.html         # 侧边栏 UI
│   ├── panel.css          # Apple Dark Mode 风格样式
│   └── panel.js           # 控制逻辑
├── content/
│   ├── claude.js          # Claude 页面注入脚本
│   ├── chatgpt.js         # ChatGPT 页面注入脚本
│   ├── gemini.js          # Gemini 页面注入脚本
│   ├── deepseek.js        # DeepSeek 页面注入脚本
│   ├── qwen.js            # Qwen 页面注入脚本
│   ├── kimi.js            # Kimi 页面注入脚本
│   ├── doubao.js          # 豆包页面注入脚本
│   └── chatglm.js         # ChatGLM 页面注入脚本
└── icons/                  # 扩展图标
```

## 版本历史

### v0.1.6 (2025-01-21)

**新增功能**:
- ✨ 新增 5 个中国 AI 平台支持
- 🎨 全新 Apple Dark Mode UI 设计
- 🆕 一键开启新对话功能

**Bug 修复**:
- ✅ 修复长时间不操作后连接超时问题
- ✅ 修复豆包回复重复捕获问题
- ✅ 修复 AI 评价时容易中断的问题
- ✅ 修复豆包对话后无法连接的问题

**优化改进**:
- 🔧 心跳机制从 30 秒缩短到 10 秒
- 🔧 增强消息重试机制（4 次重试 + 指数退避）
- 🔧 长消息自动截断（>3000 字符）
- 🔧 消息发送延迟防限流（400-500ms）
- 🔧 内容 hash 去重机制

### v0.1.5 - v0.1.1 (原版本)

详见原项目 [axtonliu/ai-roundtable](https://github.com/axtonliu/ai-roundtable)。

## 隐私说明

- **不上传任何内容** - 扩展完全在本地运行，不向任何服务器发送数据
- **无遥测/日志采集** - 不收集使用数据、不追踪行为
- **数据存储位置** - 仅使用浏览器本地存储（chrome.storage.session）
- **无第三方服务** - 不依赖任何外部 API 或服务
- **如何删除数据** - 卸载扩展即可完全清除，或在 Chrome 扩展设置中清除存储

## 截图

<!-- TODO: 添加截图 -->
<!--
| 主界面 | 讨论模式 |
|-------|---------|
| ![](assets/screenshot-1.png) | ![](assets/screenshot-2.png)

| Apple Dark Mode UI | 新对话功能 |
|------------------|-----------|
| ![](assets/screenshot-3.png) | ![](assets/screenshot-4.png) |
-->

## 常见问题

### Q: 安装后无法连接 AI 页面？
**A:** 安装或更新扩展后，需要刷新已打开的 AI 页面。

### Q: 交叉引用时提示"无法获取回复"？
**A:** 确保源 AI 已经有回复。系统会获取该 AI 的最新一条回复。

### Q: AI 回复很长时会超时吗？
**A:** 不会。系统支持最长 10 分钟的回复捕获。

### Q: 为什么有时会显示 "Receiving end does not exist"？
**A:** 这通常发生在长时间不操作后。扩展会自动重载 content script 来恢复连接。如果问题持续，请手动刷新 AI 页面。

### Q: 豆包的回复会被捕获多次吗？
**A:** 不会。v0.1.6 已添加内容 hash 去重和 3 秒冷却期，确保每条回复只捕获一次。

### Q: 评价功能支持多长的消息？
**A:** 自动截断超过 3000 字符的回复，并添加 "[内容已截断...]" 标记，防止消息过长导致发送失败。

## 已知限制

- 依赖各 AI 平台的 DOM 结构，平台更新可能导致功能失效
- Discussion Mode 固定 2 个参与者
- 不支持 Claude Artifacts、ChatGPT Canvas 等特殊功能
- 某些 AI 平台（如 Qwen）长消息响应时间可能较长（30-60 秒）

## 致谢

本项目基于 [axtonliu/ai-roundtable](https://github.com/axtonliu/ai-roundtable) 进行开发，感谢原作者 Axton Liu 的杰出工作。

## 许可证

MIT License

Copyright (c) 2025 Axton Liu (原项目)
Copyright (c) 2025 CHOSENX (修改部分)

详见 [LICENSE](LICENSE) 文件。
