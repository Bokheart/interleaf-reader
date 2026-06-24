export const GUIDE_BOOK_KEY = "built-in:interleaf-reader-guide";
export const GUIDE_BOOK_ID = GUIDE_BOOK_KEY;
export const GUIDE_BOOK_TITLE = "Interleaf Reader Guide";
export const GUIDE_BOOK_AUTHOR = "BookHeart";

/** @deprecated Legacy content key; Guide content now follows Reading Mode. */
export const DEFAULT_GUIDE_VERSION_ID = "english";

export const GUIDE_CONTENT_KEYS = Object.freeze(["english", "chinese", "bilingual"]);

export const GUIDE_MODE_TO_CONTENT_KEY = Object.freeze({
  "english-study": "english",
  chinese: "chinese",
  "cloze-mixed": "bilingual"
});

const GUIDE_CONTENT_LABELS = Object.freeze({
  english: "English Guide",
  chinese: "中文指南",
  bilingual: "混合指南"
});

const GUIDE_CHAPTERS = Object.freeze([
  {
    id: "guide-welcome",
    titles: {
      english: "Start in Three Minutes",
      chinese: "三分钟开始使用",
      bilingual: "三分钟开始使用：Reading Loop"
    },
    html: {
      english: `
        <section class="guide-chapter">
          <div class="guide-intro">
            <p class="guide-kicker">Your reading loop</p>
            <h2>Start in Three Minutes</h2>
            <p>Interleaf Reader helps you remain inside a long English story instead of repeatedly switching between a reader, dictionary, notes app, and vocabulary app.</p>
          </div>
          <div class="guide-flow" aria-label="Core reading flow">
            <span>Import</span><span aria-hidden="true">→</span><span>Read</span><span aria-hidden="true">→</span><span>Tap a word</span><span aria-hidden="true">→</span><span>Save it</span><span aria-hidden="true">→</span><span>Continue</span>
          </div>
          <div class="guide-task">
            <h3>Try it now</h3>
            <ol>
              <li>Use <strong>Next Chapter</strong> to continue through this Guide.</li>
              <li>Open <strong>Contents</strong> once so you know where chapter navigation lives.</li>
              <li>When you are ready, return Home and import your own EPUB.</li>
            </ol>
          </div>
          <p class="guide-result"><strong>You should know:</strong> this built-in Guide is a practice space. Reading Mode owns its English, Chinese, or Mixed authored content; Interface Language changes app chrome only.</p>
        </section>
      `,
      chinese: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">核心阅读流程</p>
            <h2>三分钟开始使用</h2>
            <p>Interleaf Reader 的目标，是让你尽量留在长篇英文故事中，不必在阅读器、词典、备忘录和背单词软件之间反复切换。</p>
          </div>
          <div class="guide-flow" aria-label="核心阅读流程">
            <span>导入</span><span aria-hidden="true">→</span><span>阅读</span><span aria-hidden="true">→</span><span>点击生词</span><span aria-hidden="true">→</span><span>保存词汇</span><span aria-hidden="true">→</span><span>继续阅读</span>
          </div>
          <div class="guide-task">
            <h3>现在试一试</h3>
            <ol>
              <li>点击 <strong>Next Chapter</strong>，继续阅读这份指南。</li>
              <li>打开一次 <strong>Contents</strong>，确认章节入口在哪里。</li>
              <li>熟悉后返回 Home，再导入自己的 EPUB。</li>
            </ol>
          </div>
          <p class="guide-result"><strong>你应该理解：</strong>这份内置 Guide 是练习场。Reading Mode 决定英文、中文或混合正文；Interface Language 只改变应用界面。</p>
        </section>
      `,
      bilingual: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">核心阅读流程</p>
            <h2>三分钟开始使用</h2>
            <p>先把 reading loop 记住：进入长篇故事后，只在真正需要时打开 Vocabulary Preview 或词汇气泡，然后立刻回到正文。</p>
          </div>
          <div class="guide-flow" aria-label="核心阅读流程">
            <span>Import</span><span aria-hidden="true">→</span><span>Read</span><span aria-hidden="true">→</span><span>理解词汇</span><span aria-hidden="true">→</span><span>Save</span><span aria-hidden="true">→</span><span>Continue</span>
          </div>
          <div class="guide-task">
            <h3>Try it now</h3>
            <ol>
              <li>用 <strong>Next Chapter</strong> 继续阅读。</li>
              <li>打开 <strong>Contents</strong>，熟悉章节入口。</li>
              <li>观察 Reading Mode 如何控制整份 Guide，而 Interface Language 只控制 app chrome。</li>
            </ol>
          </div>
          <p class="guide-result"><strong>目标：</strong>需要帮助时获取 context-supported assistance，理解后继续读，不把故事变成练习题。</p>
        </section>
      `
    }
  },
  {
    id: "guide-first-book",
    titles: {
      english: "Import and Resume",
      chinese: "导入与继续阅读",
      bilingual: "Import、保存与继续阅读"
    },
    html: {
      english: `
        <section class="guide-chapter">
          <div class="guide-intro">
            <p class="guide-kicker">Home and Local Library</p>
            <h2>Import and Resume</h2>
            <p>Choose or drop an English EPUB on Home. After import, Reader opens the first available chapter and stores the book locally when browser storage is available.</p>
          </div>
          <div class="guide-task">
            <h3>What to use later</h3>
            <ul>
              <li><strong>Continue Reading</strong> restores the most recent saved local book.</li>
              <li><strong>Local Library</strong> lists books saved in this browser.</li>
              <li><strong>Forget Book</strong> removes a saved EPUB and its saved progress after confirmation.</li>
            </ul>
          </div>
          <p class="guide-result"><strong>Keep the original EPUB.</strong> Clearing browser data may remove local books, progress, settings, and vocabulary.</p>
        </section>
      `,
      chinese: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Home 与 Local Library</p>
            <h2>导入与继续阅读</h2>
            <p>在 Home 选择英文 EPUB，或把文件拖入导入区域。导入成功后，Reader 会打开第一个可读章节；浏览器存储可用时，书籍会保存在本地。</p>
          </div>
          <div class="guide-task">
            <h3>之后从哪里继续</h3>
            <ul>
              <li><strong>Continue Reading</strong>：恢复最近保存的一本本地书籍。</li>
              <li><strong>Local Library</strong>：查看当前浏览器中保存的书。</li>
              <li><strong>Forget Book</strong>：确认后删除保存的 EPUB 与对应进度。</li>
            </ul>
          </div>
          <p class="guide-result"><strong>请自行保留原始 EPUB。</strong>清除浏览器数据可能会删除本地书籍、进度、设置和词汇资料。</p>
        </section>
      `,
      bilingual: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Home 与 Local Library</p>
            <h2>Import、保存与继续阅读</h2>
            <p>在 Home import 英文 EPUB 后，Reader 直接进入第一个可读章节；可用时，Local Library 会把它留在当前 browser。</p>
          </div>
          <div class="guide-task">
            <h3>Resume path</h3>
            <ul>
              <li><strong>Continue Reading</strong> 回到最近一本书。</li>
              <li><strong>Local Library</strong> 管理本地保存的书。</li>
              <li><strong>Forget Book</strong> 删除书和对应 progress，但不会影响内置 Guide。</li>
            </ul>
          </div>
          <p class="guide-result"><strong>Local-first：</strong>请保留原始 EPUB；清除 browser data 可能移除书籍、进度、设置和 vocabulary profile。</p>
        </section>
      `
    }
  },
  {
    id: "guide-reader-tools",
    titles: {
      english: "Read and Navigate",
      chinese: "阅读与导航",
      bilingual: "Reader：阅读与导航"
    },
    html: {
      english: `
        <section class="guide-chapter">
          <div class="guide-intro">
            <p class="guide-kicker">Reader controls</p>
            <h2>Read and Navigate</h2>
            <p>The story should remain the visual focus. Reader controls help you move without losing your place.</p>
          </div>
          <div class="guide-task">
            <h3>Try these controls</h3>
            <ol>
              <li>Open <strong>Contents</strong> and select another Guide chapter.</li>
              <li>Use <strong>Previous Chapter</strong> and <strong>Next Chapter</strong>.</li>
              <li>Open <strong>Progress</strong>; it changes chapters rather than paragraph position.</li>
              <li>Use <strong>Preview</strong> for chapter vocabulary support and <strong>Mode</strong> for Reading Mode.</li>
              <li>Use <strong>Home</strong> when you want to leave Reader.</li>
            </ol>
          </div>
          <p class="guide-result"><strong>Expected result:</strong> you can leave, return, and move between chapters without re-importing the book.</p>
        </section>
      `,
      chinese: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Reader 控制</p>
            <h2>阅读与导航</h2>
            <p>故事正文应始终是视觉中心；Reader 控制只在你需要移动、查看辅助或离开时出现。</p>
          </div>
          <div class="guide-task">
            <h3>现在依次试一遍</h3>
            <ol>
              <li>打开 <strong>Contents</strong>，选择另一个 Guide 章节。</li>
              <li>使用 <strong>Previous Chapter</strong> 和 <strong>Next Chapter</strong>。</li>
              <li>打开 <strong>Progress</strong>；它切换章节，不表示段落位置。</li>
              <li>用 <strong>Preview</strong> 查看章节词汇辅助，用 <strong>Mode</strong> 切换 Reading Mode。</li>
              <li>想离开 Reader 时，使用 <strong>Home</strong>。</li>
            </ol>
          </div>
          <p class="guide-result"><strong>你应该做到：</strong>不重新导入书籍，也能离开、返回并在章节之间移动。</p>
        </section>
      `,
      bilingual: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Reader controls</p>
            <h2>Reader：阅读与导航</h2>
            <p>正文保持 visual focus，controls 负责移动和辅助，不应抢走故事本身。</p>
          </div>
          <div class="guide-task">
            <h3>Control map</h3>
            <ol>
              <li><strong>Contents</strong> 选择章节。</li>
              <li><strong>Progress</strong> 切换章节，不是 paragraph-position slider。</li>
              <li><strong>Vocabulary Preview</strong> 提供本章阅读辅助。</li>
              <li><strong>Mode</strong> 切换 Reading Mode，并更换整份 Guide 的 authored variant。</li>
              <li><strong>Home</strong> 离开 Reader。</li>
            </ol>
          </div>
          <p class="guide-result"><strong>Expected result：</strong>在不丢失 progress 的前提下自由移动，然后回到 reading flow。</p>
        </section>
      `
    }
  },
  {
    id: "guide-vocabulary",
    titles: {
      english: "Understand and Decide",
      chinese: "不离开故事也能理解词汇",
      bilingual: "Vocabulary：理解、Known、Save、Hide"
    },
    html: {
      english: `
        <section class="guide-chapter">
          <div class="guide-intro">
            <p class="guide-kicker">Vocabulary Preview and bubbles</p>
            <h2>Understand a Word Without Leaving</h2>
            <p>This chapter contains a short literary practice passage. Preview, underlines, and vocabulary bubbles use the terms that occur in the chapter.</p>
          </div>
          <div class="guide-task">
            <h3>Try it now</h3>
            <ol>
              <li>Open <strong>Preview</strong> and note the listed terms.</li>
              <li>Return to the passage and tap an underlined term.</li>
              <li>Choose <strong>Known</strong>, <strong>Save</strong>, or <strong>Hide</strong> only when that action matches your intention.</li>
            </ol>
          </div>
          <section class="guide-practice" aria-label="Practice text">
            <p class="guide-practice-kicker">Practice text</p>
            <div class="guide-practice-text">
              <p>For one <strong>anxious</strong> moment, Elizabeth was <strong>reluctant</strong> to join the circle around Mr Darcy, yet she could not resist a <strong>glance</strong> in his direction. He seemed to <strong>mutter</strong> something to Bingley, and a quiet <strong>tension</strong> spread through the room. She tried to <strong>figure out</strong> whether to <strong>bring up</strong> the insult, then chose to <strong>back off</strong> and return to the dance.</p>
            </div>
          </section>
          <p class="guide-result"><strong>Expected result:</strong> vocabulary support keeps the story moving; it does not turn the chapter into a required drill.</p>
        </section>
      `,
      chinese: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Vocabulary Preview 与词汇气泡</p>
            <h2>不离开故事也能理解词汇</h2>
            <p>本章包含一段文学练习文本。Preview、正文下划线与词汇气泡会根据本章实际出现的目标词工作。</p>
          </div>
          <div class="guide-task">
            <h3>现在试一试</h3>
            <ol>
              <li>打开 <strong>Preview</strong>，先看本章列出的词。</li>
              <li>回到正文，点击一个带下划线的英文词。</li>
              <li>只有在符合真实意图时，才选择 <strong>Known</strong>、<strong>Save</strong> 或 <strong>Hide</strong>。</li>
            </ol>
          </div>
          <section class="guide-practice" aria-label="练习文本">
            <p class="guide-practice-kicker">练习文本</p>
            <div class="guide-practice-text">
              <p>短暂的 <strong>anxious</strong> 之后，Elizabeth 虽然有些 <strong>reluctant</strong>，却仍忍不住朝 Darcy 的方向 <strong>glance</strong> 了一眼。他似乎向 Bingley 低声 <strong>mutter</strong> 了什么，房间里的 <strong>tension</strong> 随即变得明显。她试着 <strong>figure out</strong> 是否该 <strong>bring up</strong> 那句冒犯，最后决定暂时 <strong>back off</strong>，重新转向舞会。</p>
            </div>
          </section>
          <p class="guide-result"><strong>你应该看到：</strong>词汇辅助帮助你继续理解故事，而不是要求你停下来完成训练。</p>
        </section>
      `,
      bilingual: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Context-supported re-exposure</p>
            <h2>Vocabulary：理解、Known、Save、Hide</h2>
            <p>Mixed reading 不是逐句翻译。English targets 留在完整中文语境中，让你先理解 scene，再决定是否处理词汇。</p>
          </div>
          <div class="guide-task">
            <h3>Choose by intention</h3>
            <ul>
              <li><strong>Known</strong>：这个 term 已经认识。</li>
              <li><strong>Save</strong>：放入 Learning，供以后复习或 export。</li>
              <li><strong>Hide</strong>：它不适合作为学习目标。</li>
            </ul>
          </div>
          <section class="guide-practice" aria-label="混合练习文本">
            <p class="guide-practice-kicker">Mixed practice</p>
            <div class="guide-practice-text">
              <p>一阵 <strong>anxious</strong> 之后，Elizabeth 虽然 <strong>reluctant</strong>，仍忍不住向 Darcy <strong>glance</strong> 了一眼。他低声 <strong>mutter</strong> 后，房间里的 <strong>tension</strong> 突然清晰起来。她试图 <strong>figure out</strong> 是否应该 <strong>bring up</strong> 那句冒犯，最后决定先 <strong>back off</strong>，让故事继续。</p>
            </div>
          </section>
          <p class="guide-result"><strong>Reading first：</strong>先依靠 context 继续读，只有 explicit action 才记录 vocabulary decision。</p>
        </section>
      `
    }
  },
  {
    id: "guide-level-export-backup",
    titles: {
      english: "Build, Export, and Back Up",
      chinese: "管理词汇、导出与备份",
      bilingual: "Vocabulary Library、Export 与 Backup"
    },
    html: {
      english: `
        <section class="guide-chapter">
          <div class="guide-intro">
            <p class="guide-kicker">Vocabulary Library</p>
            <h2>Build, Export, and Back Up</h2>
            <p>Vocabulary Library collects terms saved while reading and terms captured with Manual Add outside Interleaf.</p>
          </div>
          <div class="guide-task">
            <h3>Keep the formats distinct</h3>
            <ul>
              <li><strong>Vocabulary Level:</strong> sets which basic words are treated as already known; it is not a test score.</li>
              <li><strong>TXT / CSV / Copy:</strong> current vocabulary export tools for moving collected terms into another workflow.</li>
              <li><strong>Vocabulary Profile Backup / Restore:</strong> current JSON backup for Interleaf vocabulary status and preferences.</li>
            </ul>
          </div>
          <p class="guide-result"><strong>Manual Add is capture, not dictionary search.</strong> It records a term without promising definitions, examples, pronunciation, or automatic enrichment.</p>
        </section>
      `,
      chinese: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Vocabulary Library</p>
            <h2>管理词汇、导出与备份</h2>
            <p>Vocabulary Library 会收集阅读时保存的词，也可以通过 Manual Add 记录在 Interleaf 之外遇到的新词。</p>
          </div>
          <div class="guide-task">
            <h3>不要混淆不同功能</h3>
            <ul>
              <li><strong>Vocabulary Level：</strong>控制哪些基础词默认视为已经认识；它不是考试分数。</li>
              <li><strong>TXT / CSV / Copy：</strong>当前已经可用，用于把收集的词转移到其他学习流程。</li>
              <li><strong>Vocabulary Profile Backup / Restore：</strong>当前已经可用，用 JSON 保存 Interleaf 词汇状态和偏好。</li>
            </ul>
          </div>
          <p class="guide-result"><strong>Manual Add 是快速收集，不是词典搜索。</strong>它只负责记录词条，不承诺自动补充释义、例句、发音或扩展信息。</p>
        </section>
      `,
      bilingual: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Vocabulary workflow</p>
            <h2>Vocabulary Library、Export 与 Backup</h2>
            <p>阅读中的 Save 和生活中的 Manual Add 都会把 term 放进 Learning；之后再决定如何 export 或 backup。</p>
          </div>
          <div class="guide-task">
            <h3>Three boundaries</h3>
            <ul>
              <li><strong>Vocabulary Level</strong> 是 baseline，不是 test score。</li>
              <li><strong>TXT / CSV / Copy</strong> 是当前可用的 vocabulary export。</li>
              <li><strong>Vocabulary Profile Backup / Restore</strong> 是当前可用的 JSON profile backup，不是整本 EPUB 备份。</li>
            </ul>
          </div>
          <p class="guide-result"><strong>Keep it lightweight：</strong>先 capture term，再回到 reading；不把 Manual Add 误当成 dictionary search。</p>
        </section>
      `
    }
  },
  {
    id: "guide-local-first",
    titles: {
      english: "Current Boundaries",
      chinese: "当前功能边界",
      bilingual: "Local-first 与未来边界"
    },
    html: {
      english: `
        <section class="guide-chapter">
          <div class="guide-intro">
            <p class="guide-kicker">Local-first and honest placeholders</p>
            <h2>Current Boundaries</h2>
            <p>Interleaf Reader is local-first. There is no required account, cloud sync, or cross-device sync; books, progress, settings, and vocabulary stay in this browser unless you export them.</p>
          </div>
          <div class="guide-boundary">
            <h3>What is not implemented</h3>
            <ul>
              <li>Imported-book Chinese Reading Mode and Mixed Mode remain placeholders.</li>
              <li>Real imported-book Chinese or Mixed reading requires future Translation Versions, alignment, candidate analysis, and generation contracts.</li>
              <li>Provider availability alone is insufficient.</li>
              <li>Only this built-in Guide contains human-authored Chinese and Mixed content.</li>
            </ul>
          </div>
          <p class="guide-result"><strong>You are ready:</strong> return Home, import a book, and use only the assistance you need. A hidden Guide can be restored from Settings → Help Center.</p>
        </section>
      `,
      chinese: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">本地优先与诚实占位</p>
            <h2>当前功能边界</h2>
            <p>Interleaf Reader 保持本地优先。当前没有必需账号、云同步或跨设备同步；书籍、进度、设置和词汇资料都留在这个浏览器中，除非你主动导出。</p>
          </div>
          <div class="guide-boundary">
            <h3>尚未实现的能力</h3>
            <ul>
              <li>导入书籍的 Chinese Reading Mode 和 Mixed Mode 仍是占位功能。</li>
              <li>真实的导入书籍中文或混合阅读需要未来的 Translation Version、alignment、candidate analysis 和 generation contracts。</li>
              <li>仅有翻译服务或 provider 并不足够。</li>
              <li>只有这份内置 Guide 包含人工编写的中文与 Mixed 内容。</li>
            </ul>
          </div>
          <p class="guide-result"><strong>现在可以开始：</strong>返回 Home，导入一本书，只在真正需要时使用辅助。隐藏后的 Guide 可以从 Settings → Help Center 恢复。</p>
        </section>
      `,
      bilingual: `
        <section class="guide-chapter" lang="zh-CN">
          <div class="guide-intro">
            <p class="guide-kicker">Local-first and honest boundaries</p>
            <h2>Local-first 与未来边界</h2>
            <p>Books、progress、settings 和 vocabulary profile 默认留在当前 browser；没有 required account 或 cloud sync。</p>
          </div>
          <div class="guide-boundary">
            <h3>Placeholder means placeholder</h3>
            <ul>
              <li>Imported-book Chinese 和 Mixed 目前都不生成真实正文。</li>
              <li>未来实现需要 Translation Version、alignment、candidate analysis 和 generation contracts。</li>
              <li>Provider availability alone cannot make the artifact reproducible or position-safe。</li>
              <li>当前只有 built-in Guide 提供 human-authored Chinese 与 Mixed reading content。</li>
            </ul>
          </div>
          <p class="guide-result"><strong>Continue reading：</strong>回到 Home 导入一本书，按需要使用 support；Guide 可从 Settings → Help Center 恢复。</p>
        </section>
      `
    }
  }
]);

const GUIDE_CONTENT_KEY_SET = new Set(GUIDE_CONTENT_KEYS);

export function getGuideContentKeyForMode(readingMode = "english-study") {
  return GUIDE_MODE_TO_CONTENT_KEY[readingMode] || GUIDE_MODE_TO_CONTENT_KEY["english-study"];
}

export function getGuideModeLabel(readingMode = "english-study") {
  const contentKey = getGuideContentKeyForMode(readingMode);
  return GUIDE_CONTENT_LABELS[contentKey] || GUIDE_CONTENT_LABELS.english;
}

/** @deprecated Guide content now follows Reading Mode; use getGuideContentKeyForMode instead. */
export function getDefaultGuideVersionId(versionId = DEFAULT_GUIDE_VERSION_ID) {
  return GUIDE_CONTENT_KEY_SET.has(versionId) ? versionId : DEFAULT_GUIDE_VERSION_ID;
}

/** @deprecated Guide no longer exposes a separate version selector. */
export function getGuideVersionOptions() {
  return GUIDE_CONTENT_KEYS.map((id) => ({
    id,
    label: GUIDE_CONTENT_LABELS[id]
  }));
}

export function createGuideLibraryItem() {
  return {
    bookKey: GUIDE_BOOK_KEY,
    title: GUIDE_BOOK_TITLE,
    author: GUIDE_BOOK_AUTHOR,
    chapterCount: GUIDE_CHAPTERS.length,
    progressText: "Built-in guide",
    isBuiltInGuide: true,
    canOpen: true,
    canForget: false
  };
}

function buildGuideContentVariants(spec) {
  return Object.fromEntries(
    GUIDE_CONTENT_KEYS.map((contentKey) => {
      const html = (spec.html[contentKey] || spec.html.english).trim();
      return [
        contentKey,
        {
          title: spec.titles[contentKey] || spec.titles.english,
          html,
          plainText: toPlainText(html)
        }
      ];
    })
  );
}

export function resolveGuideChapterContent(chapter, readingMode = "english-study") {
  const contentKey = getGuideContentKeyForMode(readingMode);
  const variant = chapter?.contentVariants?.[contentKey]
    || chapter?.contentVariants?.english;

  if (variant) {
    return variant;
  }

  return {
    title: chapter?.title || "",
    html: chapter?.originalHtml || "",
    plainText: chapter?.plainText || ""
  };
}

export function syncGuideBookForReadingMode(book, readingMode = "english-study") {
  if (!book?.isBuiltInGuide || !Array.isArray(book.chapters)) {
    return book;
  }

  const contentKey = getGuideContentKeyForMode(readingMode);

  book.guideContentKey = contentKey;
  book.guideModeLabel = getGuideModeLabel(readingMode);
  book.readingMode = readingMode;

  for (const chapter of book.chapters) {
    const variant = resolveGuideChapterContent(chapter, readingMode);
    chapter.title = variant.title;
    chapter.originalHtml = variant.html;
    chapter.plainText = variant.plainText;
  }

  book.plainText = book.chapters.map((guideChapter) => guideChapter.plainText).join(" ");
  return book;
}

export function createGuideBook(readingMode = "english-study") {
  const chapters = GUIDE_CHAPTERS.map((spec) => {
    const contentVariants = buildGuideContentVariants(spec);
    const defaultVariant = contentVariants.english;

    return {
      id: spec.id,
      href: `${GUIDE_BOOK_KEY}/${spec.id}.html`,
      contentVariants,
      title: defaultVariant.title,
      originalHtml: defaultVariant.html,
      plainText: defaultVariant.plainText
    };
  });

  return syncGuideBookForReadingMode({
    id: GUIDE_BOOK_KEY,
    title: GUIDE_BOOK_TITLE,
    author: GUIDE_BOOK_AUTHOR,
    isBuiltInGuide: true,
    chapters,
    plainText: chapters.map((guideChapter) => guideChapter.plainText).join(" ")
  }, readingMode);
}

export function isGuideBookKey(bookKey) {
  return bookKey === GUIDE_BOOK_KEY;
}

function toPlainText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
