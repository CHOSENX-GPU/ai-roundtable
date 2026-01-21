# 快速开始指南

## 🚀 5 分钟快速上手

### 步骤 1: 安装扩展

![下载 ZIP](https://img.shields.io/badge/下载-ZIP-blue)

1. 访问 [GitHub Releases](https://github.com/CHOSENX-GPU/ai-roundtable/releases)
2. 下载 `ai-roundtable-v1.0.1.zip`
3. 解压到文件夹（例如：`D:\ai-roundtable\`）
4. 打开 Chrome 浏览器
5. 地址栏输入：`chrome://extensions/`
6. 开启右上角的 **「开发者模式」**
7. 点击 **「加载已解压的扩展程序」**
8. 选择解压后的文件夹

### 步骤 2: 准备 AI 平台

在新的标签页中打开并登录以下 AI 平台（至少需要 2 个）：

| AI | 网址 |
|---|------|
| Claude | https://claude.ai |
| ChatGPT | https://chatgpt.com |
| Gemini | https://gemini.google.com |
| DeepSeek | https://chat.deepseek.com |
| 豆包 | https://www.doubao.com/chat/ |

### 步骤 3: 刷新页面

**⚠️ 重要**：按 `Ctrl+Shift+R` (Windows) 或 `Cmd+Shift+R` (Mac) 刷新所有 AI 页面

### 步骤 4: 打开扩展

点击 Chrome 工具栏中的扩展图标 📌，侧边栏将自动打开

### 步骤 5: 开始使用

## 📖 基础用法

### 发送消息到多个 AI

```
1. 在侧边栏勾选 2-3 个 AI
2. 输入问题：什么是量子力学？
3. 按 Enter 或点击「发送」
```

### 让 AI 互相评价 (/mutual)

```
1. 先发送问题给多个 AI，等待回复
2. 输入：/mutual 请对比你们的回答
3. 点击发送
4. 每个 AI 会收到其他 AI 的回复并评价
```

### 交叉引用 (/cross)

```
输入：/cross @Claude <- @ChatGPT 请总结上面的要点
效果：Claude 会收到 ChatGPT 的回复并进行总结
```

## 🎯 推荐工作流

### 对比不同 AI 的回答

1. 勾选 Claude, ChatGPT, DeepSeek
2. 发送同一问题
3. 对比三者的回答风格
4. 使用 `/mutual` 让它们互相评价

### 深度讨论某个话题

1. 切换到「讨论」模式
2. 选择 2 个 AI（例如 Claude 和 ChatGPT）
3. 输入讨论主题：AI 的未来发展
4. 点击「开始讨论」
5. 点击「下一轮」进行深入辩论

## 🎨 界面说明

### 侧边栏布局

```
┌─────────────────────────────┐
│  ☑ Claude    ☑ ChatGPT     │ ← AI 选择区
│  ☐ Gemini   ☐ DeepSeek     │
├─────────────────────────────┤
│  [输入框]                   │ ← 消息输入区
│  [@] [/mutual] [/cross]    │ ← 快捷按钮
│  [新对话] [发送]           │ ← 操作按钮
├─────────────────────────────┤
│  活动日志：                 │ ← 活动日志
│  ✓ Claude: Message sent    │
│  ✓ ChatGPT: Message sent   │
└─────────────────────────────┘
```

### 颜色含义

- 🟢 绿色：连接成功 / 消息已发送
- 🔴 红色：连接失败 / 发送错误
- 🟡 黄色：等待响应

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| Enter | 发送消息 |
| Shift+Enter | 换行 |

## 🔧 常见问题

### Q: 为什么 AI 显示未连接？

**A**: 
1. 确保已登录 AI 平台
2. 刷新 AI 页面（F5 或 Ctrl+Shift+R）
3. 重新打开扩展侧边栏

### Q: 如何开始新对话？

**A**:
1. 勾选想要开启新对话的 AI
2. 点击「新对话」按钮
3. 所有选中的 AI 会自动导航到新对话页面

### Q: 消息发送失败怎么办？

**A**:
1. 检查 AI 页面是否正常加载
2. 刷新 AI 页面
3. 等待几秒后重试（扩展会自动重试 4 次）

## 📚 进阶技巧

### 使用 @ 语法快速指定目标

```
@Claude 请解释什么是机器学习
@ChatGPT 同样的问题，你怎么看？
```

### 2. 批量测试多个 AI

1. 勾选所有 7 个 AI
2. 发送测试问题
3. 对比它们的回答质量和风格

### 3. 构建多轮对话

```
Round 1: 发送问题给 A, B, C
Round 2: /cross @A <- @B @C 总结他们的观点
Round 3: /cross @B <- @A @C 你同意吗？
Round 4: /mutual 请综合三方观点得出结论
```

## 🎓 示例场景

### 场景 1: 代码审查

```
1. 将代码发给 Claude 和 ChatGPT
2. 使用 /mutual 让它们互相审查
3. 获取多方意见和改进建议
```

### 场景 2: 翻译对比

```
1. 发送同一段中文给 DeepSeek 和 ChatGPT
2. 让它们翻译成英文
3. 对比翻译质量
4. 让 Claude 评判哪个更好
```

### 场景 3: 创意头脑风暴

```
1. 切换到讨论模式
2. 选择 Claude 和 Gemini
3. 主题：设计一个创新的手机功能
4. 让它们进行 3-4 轮讨论
5. 生成讨论总结
```

## 🆘 需要帮助？

- 📖 [完整文档](https://github.com/CHOSENX-GPU/ai-roundtable/blob/dev/README.md)
- 🐛 [报告问题](https://github.com/CHOSENX-GPU/ai-roundtable/issues)
- 💬 [讨论区](https://github.com/CHOSENX-GPU/ai-roundtable/discussions)

---

**享受与多个 AI 协作的乐趣！** 🎉
