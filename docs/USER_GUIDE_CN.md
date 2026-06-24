# Interleaf Reader 用户指南

Interleaf Reader 是一个移动端优先、本地优先、阅读优先的长篇英文阅读器。

它面向有一定英语基础、但在阅读英文小说或长篇文本时容易感到疲惫、抗拒或频繁被查词打断的读者。

本指南说明当前已经存在的用户功能。

当前实现与验证状态以 `docs/PROJECT_STATE.md` 为准。

本指南已与 R1 acceptance candidate `4b7e94e` 同步。

---

## 1. 当前功能边界

对于用户导入的 EPUB：

* **English Study Mode** 是当前支持的核心阅读模式。
* **Chinese Reading Mode** 是占位功能。
* **Mixed Mode** 是占位功能。
* 当前没有接入真实翻译服务。

内置的 Interleaf Reader Guide 包含人工编写的英文、独立编写的中文，以及专门编写的混合阅读内容。

这只是 Guide 的特殊内容，并不代表导入的 EPUB 已经能够自动翻译。

Interleaf Reader 不是通用词典、闪卡应用、间隔复习系统、公共电子书库或云书架。

---

## 2. 首次使用、界面语言与帮助

首次使用时，可以选择界面语言：

* English
* 中文

Interface Language 会改变：

* 应用按钮和标签；
* 对话框；
* Settings；
* Help；
* 相关无障碍文本。

它不会翻译或改变：

* 导入书籍的标题和作者；
* 章节正文；
* Reading Mode；
* 已保存的词汇状态。

Settings 中可以包含 Help、本地存储说明、Vocabulary Level、词汇资料备份与恢复，以及 Guide 显示控制。

Reader 中也提供上下文帮助入口。

---

## 3. 内置 Guide

内置的 **Interleaf Reader Guide** 会作为一本特殊的虚拟书出现在 Local Library 中。

你可以：

* 通过 Reader 打开它；
* 浏览 Guide 章节；
* 使用 Reading Mode 查看人工编写的英文、中文或中英混合 Guide 内容；
* 把 Guide 从 Local Library 中隐藏；
* 之后通过 Settings 恢复显示。

Guide 不是用户导入的 EPUB。

隐藏 Guide 不会删除普通书籍。

Reading Mode 决定 Guide 使用英文、中文或混合正文。Interface Language 只控制应用界面，不会改变 Guide 正文。

Mixed Guide 是专门编写的混合阅读内容，不是逐句使用斜杠分隔的中英对照。Guide 的多语言内容是本地人工内容，不是机器翻译结果。

---

## 4. 导入 EPUB

1. 通过支持的 HTTP 地址打开 Interleaf Reader。
2. 在 Home 选择 EPUB 文件，或把文件拖入导入区域。
3. 等待书籍加载。
4. 加载成功后，Reader 会打开这本书。

Interleaf 会把 EPUB 保存在当前浏览器 origin 的本地存储中。

导入失败时：

* 查看界面显示的错误或诊断；
* 确认 HTTP server 从仓库根目录启动；
* 确认 JSZip 和 epub.js 已经加载；
* 项目测试时使用版权安全的 smoke fixture。

请只导入你有权访问的书籍。

不要把私人 EPUB 或受版权保护的 EPUB 提交到项目仓库。

---

## 5. Home 与 Local Library

Home 提供：

* 导入书籍；
* Continue Reading；
* Local Library；
* 内置 Guide；
* Vocabulary Library；
* Settings。

Local Library 只显示当前浏览器 origin 中保存的书籍。

不同 hostname 或 port 会使用不同的浏览器存储。

例如：

```text
http://localhost:8000
```

和：

```text
http://127.0.0.1:8000
```

不会共享 IndexedDB 与 localStorage。

### Continue Reading

Continue Reading 会在可用时打开最近的本地阅读状态。

### Forget Book

Forget 会删除浏览器中保存的 EPUB 和对应阅读进度。

必须完成确认后才会删除。

如果删除的是当前已经打开的书，持久化副本可能已经被删除，但当前内存中的 Reader 仍可能暂时保持打开，直到之后发生导航变化。

---

## 6. Reader 与导航

导入后，Reader 会使用 English Study Mode 打开书籍。

Reader 支持：

* 纵向长篇阅读；
* Contents；
* Previous 和 Next 章节导航；
* Progress；
* Vocabulary Preview；
* Reading Mode；
* 返回 Home；
* 近似阅读进度恢复；
* 适合手机触控的阅读控制。

阅读位置恢复是近似的，不保证精确到同一个段落。

屏幕尺寸、字体、布局、章节 HTML 或词汇标注变化都可能让恢复位置产生少量偏差。

---

## 7. Reader 面板

### Contents

显示规范化后的可阅读章节，并支持章节跳转。

### Progress

显示章节或阅读进度，并在可用时提供章节导航控制。

### Preview

显示当前章节中匹配到的有限词汇列表。

Preview 是阅读辅助，不是完整词典，也不是必须完成的学习任务。

### Mode

显示：

* English Study Mode；
* Chinese Reading Mode；
* Mixed Mode。

对于导入的 EPUB，Chinese 和 Mixed 目前只显示明确的占位内容，不会生成翻译。

真实的导入书籍中文或 Mixed 仍是未来工作，需要 Translation Version、alignment、candidate analysis 和 generation contracts；仅有 provider 并不足够。

---

## 8. Vocabulary Preview 与词汇气泡

Vocabulary Preview 使用应用内置的 app-ready 词汇数据，在当前章节中匹配部分单词和短语。

匹配词可能在 Reader 中显示为可交互文字。

点击或轻触词汇，可以打开紧凑的词汇气泡。

根据已有数据，气泡可能显示：

* 词条；
* 简短中文含义；
* 简短英文定义；
* 有限的用法信息。

词汇气泡的目的是提供足够的信息，让你继续阅读。

它不是完整词典，也不会覆盖所有英文单词。

如果可选词汇数据加载失败，优先行为应是保持原始章节仍然可读。

---

## 9. Known、Save 与 Hide

这些操作会更新当前浏览器中的本地 vocabulary profile。

这是一份全局词汇资料：已认识（Known）、Learning 和 Hidden 状态会作用于当前浏览器资料中的所有书籍和章节。

### Known

当你的意思是：

> 我已经认识这个词。

使用 Known。

当前效果：

* 把规范化后的词加入 Known collection；
* 从 Learning 和 Hidden 中移除；
* 降低或取消之后普通 Preview 中的推荐。

Vocabulary Library 会在 **已认识（Known）** 标签中显示这些词。已认识表示用户明确标记自己认识该词，不代表经过测试的掌握结论。

### Save

当你的意思是：

> 我想保存这个词，以后学习或导出。

使用 Save。

当前效果：

* 加入 Learning；
* 从 Known 和 Hidden 中移除；
* 可以在 Vocabulary Library 与相关导出中使用。

### Hide

当你的意思是：

> 这个词不适合作为我的学习目标。

使用 Hide。

当前效果：

* 加入 Hidden；
* 从 Known 和 Learning 中移除；
* 在普通词汇推荐中隐藏。

词汇在存储前会被规范化，原始大小写可能不会保留。

---

## 10. Vocabulary Level

Vocabulary Level 用于帮助决定：在生成 Preview 时，哪些常见词可以被视为已经熟悉。

它是：

* 一项过滤偏好；
* 可以随时调整；
* 保存在当前浏览器 profile 中。

它不是：

* IELTS 分数；
* 英语能力诊断；
* 强制分级测试；
* 完整词典等级；
* 对可阅读书籍的限制。

---

## 11. Vocabulary Library

Vocabulary Library 当前包含三个 collection：

### Learning

阅读时 Save 的词，以及手动添加的词。

### 已认识（Known）

用户明确标记为已经认识的词。它不代表经过测试、复习计划或记忆验证后的真正掌握。

### Hidden

从普通推荐中隐藏的词。

Vocabulary Library 支持：

* 查看本地 collection；
* 手动添加单词或短语到 Learning；
* 移除词汇；
* 复制或下载导出；
* vocabulary profile 备份与恢复。

Manual Add 是快速收集，不是词典查询。

手动添加一个词时，当前不会自动承诺：

* 释义；
* 翻译；
* 例句；
* 发音；
* 词形变化；
* 近义词；
* 自动 enrichment。

---

## 12. Remove 与 Restore 行为

移除或恢复一个词，会把它从相关状态 collection 中删除，使它之后可以重新选择状态。

当前系统没有独立的历史掌握记录。

通过 Known、Save 或 Hide 改变状态时，对应 action helper 会让选择的状态保持互斥。

但是，如果导入的 vocabulary backup 本身在多个 collection 中包含同一个词，恢复后仍可能保留 cross-list duplicate。

---

## 13. 词汇导出

当前导出入口包括：

* Copy Learning；
* Copy All；
* Download CSV；
* 不背单词 TXT。

不背单词 TXT 只包含 Learning terms，使用 UTF-8 纯文本，每行一个单词或短语。

词条导出用于转移或复习。

它不是完整的 Interleaf backup，除非某个格式明确包含，否则不会保留全部 profile 设置和 collection 关系。

Interleaf 不会登录、上传或同步到不背单词。

---

## 14. Vocabulary Profile Backup / Restore

Vocabulary profile backup 会下载：

```text
interleaf-reader-vocabulary-profile.json
```

当前格式使用：

```text
schemaVersion: 1
```

文件可能包含：

* `exportedAt`；
* `selectedLevel`；
* `knownWords`；
* `learningWords`；
* `ignoredWords`；
* `preferredCategories`。

Backup / Restore 只处理 vocabulary profile。

它不包含：

* EPUB 文件；
* Local Library 书籍；
* 阅读进度；
* 与 vocabulary profile 无关的 preferences；
* Guide 内容；
* 书籍正文；
* 释义或原文句子；
* 翻译数据。

成功恢复时，会替换受支持的 vocabulary profile 字段。

格式错误或不支持的 backup 应在不替换当前资料的情况下被拒绝。

恢复重要资料前，先下载一份当前 backup。

---

## 15. 本地存储与隐私

当前本地数据可能包括：

* 导入的 EPUB Blob；
* 书籍 metadata；
* 阅读进度；
* preferences；
* vocabulary profile。

当前产品：

* 不要求账户；
* 没有云书库；
* 没有跨设备同步；
* 不会自动上传导入书籍；
* 没有 analytics。

清除浏览器数据可能永久删除本地书籍、进度、设置和词汇。

隐私 / 无痕模式可能使用临时存储，或无法使用持久化存储。

浏览器配额可能影响很大的 EPUB。

请把浏览器本地存储视为方便的本地持久化，而不是保证永久存在的档案。

---

## 16. 网络与离线边界

Interleaf Reader 是 local-first，但目前并不是完整离线应用。

应用仍依赖 CDN 上的 JSZip 和 epub.js。

如果这些依赖无法加载，EPUB 导入可能失败。

当前 runtime 没有已验证的 service worker 或完整离线启动能力。

---

## 17. 当前未实现

以下不是当前导入书籍功能：

* 真实 Chinese Reading Mode；
* 真实 Mixed Mode；
* DeepL、Google、GPT 或其他翻译 provider；
* 翻译 API key 输入；
* 自动整本书翻译；
* 账户或云同步；
* 公共书籍或翻译托管；
* 通用词典搜索；
* 为每个手动添加词自动补全内容；
* 闪卡、测验、刷题、streak 或 spaced repetition；
* 经过测试的掌握学习生命周期。

占位功能不能被理解为已经完成。

---

## 18. 数据安全清单

为了减少意外丢失：

1. 始终使用同一个浏览器、profile、hostname 和 port。
2. 除非确定要删除本地数据，否则不要清除 site data。
3. 替换 vocabulary profile 前先导出当前 backup。
4. 在浏览器之外保存原始 EPUB 文件。
5. 区分词条 export 与 vocabulary backup。
6. 不要把 Interleaf 当作重要数据的唯一永久副本。
