# AI 圆桌 (AI Roundtable) v1.0.2

![GitHub Repo stars](https://img.shields.io/github/stars/CHOSENX-GPU/ai-roundtable?style=social)
![GitHub forks](https://img.shields.io/github/forks/CHOSENX-GPU/ai-roundtable?style=social)
![License](https://img.shields.io/github/license/CHOSENX-GPU/ai-roundtable)

> **Forked from [axtonliu/ai-roundtable](https://github.com/axtonliu/ai-roundtable) with enhancements**

让多个 AI 助手围桌讨论，交叉评价，深度协作。通过 Chrome 扩展统一控制 Claude、ChatGPT、Gemini、DeepSeek、Kimi、豆包、ChatGLM 等 AI 平台。

## v1.0.2 更新内容

### 新功能
- **一键打开控制台**：侧边栏新增「打开控制台」按钮，点击即可在扩展内部打开 Web App，无需配对
- **多标签页检测**：当同一 AI 打开多个标签页时，显示警告提示，避免消息发送异常
- **智能快速打开**：已连接的 AI 自动禁用打开按钮，防止重复打开

### 技术改进
- 扩展内部 Web App 自动连接，跳过配对流程
- 内部页面使用 `chrome.runtime.connect()` 原生通信
- 新增 `tabCounts` 状态追踪每个 AI 的标签页数量

## 快速开始

### 方式一：扩展内置控制台（推荐）

1. 安装扩展（从 Release 下载或开发者模式加载）
2. 打开你需要的 AI 平台并登录
3. 点击扩展图标打开侧边栏
4. 点击「打开控制台」按钮
5. 开始使用！

### 方式二：独立 Web App

1. 安装扩展
2. 打开 AI 平台并登录
3. 运行 Web App：`cd web && npm run dev`
4. 输入 Extension ID 和 6 位配对码完成配对
5. 开始使用

## 核心特性

| 功能 | 说明 |
|------|------|
| 多目标发送 | 一条消息同时发给多个 AI，对比回答 |
| /mutual 互评 | 让所有选中的 AI 互相评价对方的回复 |
| /cross 交叉引用 | 让指定 AI 评价另一个 AI 的回复 |
| Discussion Mode | 两个 AI 就同一主题进行多轮深度讨论 |
| 一键新对话 | 快速为选中的 AI 开启新对话 |
| 多标签页警告 | 检测到同一 AI 多个标签页时提醒用户 |
| 智能快速打开 | 已连接的 AI 不可重复打开 |

## 支持的 AI 平台

| AI | 平台 | URL |
|---|---|---|
| Claude | Anthropic | https://claude.ai |
| ChatGPT | OpenAI | https://chatgpt.com |
| Gemini | Google | https://gemini.google.com |
| DeepSeek | DeepSeek | https://chat.deepseek.com |
| Kimi | 月之暗面 | https://kimi.com |
| 豆包 | 字节跳动 | https://www.doubao.com/chat/ |
| ChatGLM | 智谱清言 | https://chatglm.cn |

## 项目结构

```
ai-roundtable/
├── ai-roundtable-v1.0.1/   # Chrome 扩展
│   ├── manifest.json       # 扩展配置
│   ├── background.js       # Service Worker
│   ├── sidepanel/          # 侧边栏 UI
│   ├── content/            # 各 AI 平台注入脚本
│   └── web/                # 内置 Web App (构建产物)
├── web/                    # Web App 源码 (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── hooks/          # React Hooks
│   │   └── lib/            # 工具库
│   └── package.json
├── README.md
├── CLAUDE.md               # 开发规范
└── LICENSE
```

## 架构

```
┌─────────────────────────────────────────────────────────┐
│                      Web App                            │
│  (chrome-extension://[ID]/web/index.html 或 localhost)  │
└─────────────────────┬───────────────────────────────────┘
                      │ chrome.runtime.connect()
┌─────────────────────▼───────────────────────────────────┐
│                Chrome Extension                         │
│                  (background.js)                        │
└─────────────────────┬───────────────────────────────────┘
                      │ chrome.tabs.sendMessage()
┌─────────────────────▼───────────────────────────────────┐
│              Content Scripts                            │
│  (claude.js, chatgpt.js, gemini.js, ...)               │
└─────────────────────┬───────────────────────────────────┘
                      │ DOM 操作
┌─────────────────────▼───────────────────────────────────┐
│                AI 网站                                  │
│  (claude.ai, chatgpt.com, gemini.google.com, ...)      │
└─────────────────────────────────────────────────────────┘
```

## 开发

```bash
# 安装依赖
cd web && npm install

# 开发模式
npm run dev

# 构建（输出到 ../ai-roundtable-v1.0.1/web/）
npm run build
```

## 隐私说明

- 扩展完全在本地运行，不上传任何数据
- 不收集使用数据，不依赖第三方服务
- 无需 API Key，直接操作 AI 网页界面
- 卸载扩展即可清除本地存储

## 常见问题

### Q: 点击「打开控制台」后页面空白？
**A:** 请确保已构建 Web App：`cd web && npm run build`

### Q: 状态显示未连接？
**A:** 刷新 AI 页面，确保已登录且页面完全加载。

### Q: 同一个 AI 打开了多个标签页怎么办？
**A:** 关闭多余的标签页，只保留一个，否则消息可能发送到错误的标签页。

### Q: 外部 Web App 无法连接？
**A:** 确保在 Chrome 中打开，并正确输入 Extension ID 和配对码。

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0.2 | 2025-01-22 | 一键打开控制台、多标签页检测、智能快速打开 |
| v1.0.1 | 2025-01-21 | Web App 架构、配对机制、实时状态同步 |
| v1.0.0 | 2025-01-20 | 初始版本，支持 7 个 AI 平台 |

## 许可证

MIT License

Copyright (c) 2025 Axton Liu (原项目)
Copyright (c) 2025 CHOSENX (修改部分)

详见 [LICENSE](LICENSE) 文件。
