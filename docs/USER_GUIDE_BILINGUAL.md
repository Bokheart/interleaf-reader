# Interleaf Reader User Guide / 用户指南

Interleaf Reader is a local-first EPUB reader for English fiction and long-form reading. It helps non-native English readers stay in the story while checking useful vocabulary in context.

Interleaf Reader 是一个本地优先的 EPUB 阅读器，面向阅读英文小说和长篇文本的非英语母语读者。它会在尽量不打断阅读的情况下，帮助你理解上下文中的词汇。

Chinese Reading Mode and Mixed Mode are placeholders in the current MVP. They do not translate book text yet.

中文阅读模式和混合模式目前只是 MVP 中的占位功能，还不会翻译书籍正文。

## 1. Import an EPUB / 导入 EPUB

1. Open Interleaf Reader in your browser.
2. Choose an EPUB file on the Home screen, or drag and drop an EPUB into the import area.
3. Wait for the book to load and be stored locally in your browser.
4. If import fails, check the diagnostics message.

1. 在浏览器中打开 Interleaf Reader。
2. 在首页选择 EPUB 文件，或把 EPUB 文件拖放到导入区域。
3. 等待书籍加载，并保存到浏览器本地。
4. 如果导入失败，请查看诊断信息。

Only import books you have the right to use.

请只导入你有权使用的书籍。

## 2. Read and Navigate / 阅读与导航

Use Previous and Next to move between chapters, Back to Top to return to the current chapter start, and Contents to jump through the chapter list. Interleaf Reader saves approximate scroll progress locally so you can resume later.

使用 Previous 和 Next 切换章节，使用 Back to Top 回到当前章节顶部，也可以通过 Contents 查看章节列表并跳转。Interleaf Reader 会在本地保存近似阅读进度，方便之后继续阅读。

On mobile-sized screens, reader controls may appear as an overlay.

在手机尺寸屏幕上，阅读控制可能以浮层形式出现。

## 3. Contents / Progress / Preview / Mode

- Contents: browse and jump between chapters.
- Progress: view or adjust chapter progress with the chapter slider.
- Preview: review vocabulary candidates from the current reading context.
- Mode: view reading mode options.

- Contents：查看章节并跳转。
- Progress：通过章节滑块查看或调整章节进度。
- Preview：查看当前阅读内容中的词汇候选。
- Mode：查看阅读模式选项。

Mode status:

- English Study Mode is implemented.
- Chinese Reading Mode is a placeholder.
- Mixed Mode is a placeholder.

模式状态：

- English Study Mode 已实现。
- Chinese Reading Mode 是占位功能。
- Mixed Mode 是占位功能。

## 4. Vocabulary Preview and Bubbles / 词汇预览与词汇气泡

Vocabulary Preview uses bundled vocabulary data to identify useful words and phrases in the current book text. Underlined terms can be clicked or tapped to open a vocabulary bubble with the term, an English definition, and IELTS-related usage when available.

Vocabulary Preview 会使用应用内置词汇数据，从当前书籍文本中识别可能有帮助的单词和短语。带下划线的词可以点击或轻触，打开词汇气泡；气泡中可能显示词条、英文释义，以及可用的 IELTS 相关用法。

Vocabulary suggestions are local reading aids, not a complete dictionary.

词汇建议是本地阅读辅助，不是完整词典。

## 5. Known / Save / Hide

- Known: mark a word as familiar and move it into the Mastered/Known area.
- Save: add a word to Learning in the Vocabulary Library.
- Hide: hide a word from future vocabulary previews.

- Known：标记为已经熟悉，并进入 Mastered/Known 区域。
- Save：保存到 Vocabulary Library 的 Learning 列表。
- Hide：从后续词汇预览中隐藏。

These actions update only your local profile. They do not modify the bundled vocabulary datasets.

这些操作只更新你的本地个人资料，不会修改应用内置的词汇数据集。

## 6. Vocabulary Library / 词汇库

The Vocabulary Library includes Learning, Mastered, and Hidden tabs. You can review saved words, manually add words to Learning, and remove items from your personal lists.

Vocabulary Library 包含 Learning、Mastered 和 Hidden 标签。你可以查看已保存词汇，手动添加词汇到 Learning，也可以从个人列表中移除词汇。

The current Mastered/Known behavior records familiarity only. It is not a full spaced-repetition system.

当前 Mastered/Known 只记录熟悉程度，并不是完整的间隔复习系统。

## 7. Local-Only Storage Warning / 本地存储提醒

Interleaf Reader stores imported books, reading progress, and vocabulary profile data locally in your browser.

Interleaf Reader 会把导入书籍、阅读进度和词汇资料保存在浏览器本地。

Important limits:

- Data is not synced to an account or cloud service.
- Clearing browser data can delete imported books, progress, and vocabulary lists.
- Using another browser, device, or private/incognito session may show an empty library.
- Browser storage quotas can affect very large EPUBs.

重要限制：

- 数据不会同步到账户或云端。
- 清除浏览器数据可能会删除导入书籍、阅读进度和词汇列表。
- 换用浏览器、设备，或使用隐私/无痕窗口时，书库可能为空。
- 浏览器存储配额可能影响很大的 EPUB 文件。

Treat local storage as convenient browser storage, not a permanent backup.

请把本地存储视为方便的浏览器存储，而不是永久备份。

## 8. Export Basics / 导出基础

Vocabulary export tools include Copy Learning, Copy All, and Download CSV.

词汇导出工具包括 Copy Learning、Copy All 和 Download CSV。

Exports are intended for personal backup or review. Review exported content before sharing it, especially if it includes book-specific context.

导出内容主要用于个人备份或复习。分享之前请先检查导出内容，尤其是其中包含书籍上下文时。

## 9. Not Implemented Yet / 尚未实现

The following are planned or placeholder-only:

- Chinese Reading Mode translation.
- Mixed Mode translation or mixed-language reading.
- Translation providers such as DeepL.
- Cloud sync, accounts, or cross-device sync.
- Full flashcard or spaced-repetition learning.

以下功能仍在计划中或只是占位：

- Chinese Reading Mode 翻译。
- Mixed Mode 翻译或混合语言阅读。
- DeepL 等翻译服务提供商。
- 云同步、账户或跨设备同步。
- 完整闪卡或间隔复习学习系统。

The current MVP should not ask for translation API keys.

当前 MVP 不应要求你输入翻译 API key。

