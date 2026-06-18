# Interleaf Reader 用户指南

Interleaf Reader 是一个本地优先的 EPUB 阅读器，面向阅读英文小说和长篇文本的非英语母语读者。它的目标是在不打断阅读体验的前提下，帮助你理解上下文中的常用词汇。

本指南说明当前 MVP 已实现的功能。中文阅读模式和混合模式目前只是占位功能，还不会翻译书籍正文。

## 1. 导入 EPUB

1. 在浏览器中打开 Interleaf Reader。
2. 在首页选择一个 EPUB 文件，或把 EPUB 文件拖放到导入区域。
3. 等待书籍加载。Interleaf Reader 会在你的浏览器中读取 EPUB，并把导入的书籍保存在本地。
4. 如果导入失败，请查看诊断信息。有些 EPUB 文件结构特殊，或包含当前不支持的内容。

请只导入你有权使用的书籍。不要把受版权保护的 EPUB 文件上传或提交到项目仓库。

## 2. 阅读与导航

导入完成后，阅读器会以 English Study Mode 打开书籍。

- 使用 Previous 和 Next 在章节之间切换。
- 使用 Back to Top 回到当前章节顶部。
- 使用章节列表或 Contents 面板跳转到其他章节。
- 阅读进度会近似保存在本地，重新打开书籍时可以恢复到之前的位置。
- 在手机尺寸屏幕上，阅读控制可能以浮层形式出现。

Interleaf Reader 的核心是阅读。词汇功能用于辅助阅读，而不是把应用变成背单词或刷题工具。

## 3. 阅读器面板：Contents / Progress / Preview / Mode

阅读器工具栏提供四个主要入口：

- Contents：查看书籍章节列表，并跳转到指定章节。
- Progress：通过章节滑块查看或调整当前章节进度。
- Preview：查看当前阅读内容中识别出的词汇候选。
- Mode：查看阅读模式选项。

当前模式状态：

- English Study Mode 已实现。
- Chinese Reading Mode 是占位功能。
- Mixed Mode 是占位功能。

界面中可能会显示占位模式，但它们目前不能视为已实现的翻译功能。

## 4. Vocabulary Preview 与词汇气泡

Vocabulary Preview 会使用应用内置的词汇数据，从当前书籍文本中识别可能有帮助的单词或短语。

在阅读器中：

- 词汇可能以下划线形式显示。
- 点击或轻触带下划线的词汇可以打开词汇气泡。
- 词汇气泡可能显示词条、英文释义，以及可用的 IELTS 相关用法。
- 如果可选的词汇引擎加载失败，阅读本身仍应继续可用。

词汇建议是本地阅读辅助，不是完整词典，也不会覆盖你期望看到的所有词。

## 5. Known / Save / Hide

词汇操作会影响 Interleaf Reader 为你展示的内容。

- Known：标记为已经熟悉。该词会进入 Mastered/Known 区域，并在后续预览中降低优先级。
- Save：保存到 Vocabulary Library 的 Learning 列表。
- Hide：从后续词汇预览中隐藏该词。

这些操作只会更新你的本地个人资料，不会修改应用内置的全局词汇数据集。

## 6. Vocabulary Library

你可以从应用导航进入 Vocabulary Library，查看和管理自己的词汇。

当前词汇库包含：

- Learning：你在阅读时保存或手动添加的词。
- Mastered：你标记为 Known 的词。
- Hidden：你选择 Hide 的词。

你可以手动添加词汇到 Learning，也可以从个人列表中移除词汇。

当前的 Mastered/Known 行为较简单，只记录熟悉程度；它还不是完整的间隔复习或学习周期系统。

## 7. 本地存储提醒

Interleaf Reader 会使用浏览器本地存储（例如 IndexedDB）保存导入的书籍、阅读进度和词汇资料。

重要限制：

- 数据不会同步到账户或云端服务。
- 清除浏览器数据可能会删除导入书籍、阅读进度和词汇列表。
- 换用其他浏览器、设备，或使用隐私/无痕窗口时，书库可能是空的。
- 浏览器存储配额可能影响很大的 EPUB 文件。

请把 Interleaf Reader 的本地存储视为方便的浏览器存储，而不是永久备份。

## 8. 导出基础

Vocabulary Library 提供基础导出工具：

- Copy Learning：复制 Learning 列表。
- Copy All：复制所有个人词汇列表。
- Download CSV：把词汇数据导出为 CSV 文件。

导出内容主要用于个人备份或复习。分享之前请先检查导出内容，尤其是其中包含书籍上下文时。

## 9. 尚未实现的功能

以下功能仍处于计划中或仅为占位：

- Chinese Reading Mode 翻译。
- Mixed Mode 翻译或混合语言阅读。
- DeepL 等翻译服务提供商。
- 云同步、账户或跨设备资料同步。
- 完整的闪卡或间隔复习系统。

当前 MVP 不应要求你输入翻译 API key。

