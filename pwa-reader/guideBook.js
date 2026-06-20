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
  chinese: "Chinese Guide",
  bilingual: "Mixed Guide"
});

const GUIDE_CHAPTERS = Object.freeze([
  {
    id: "guide-welcome",
    titles: {
      english: "Welcome to Interleaf Reader",
      chinese: "欢迎使用",
      bilingual: "Welcome / 欢迎使用"
    },
    html: {
      english: `
        <section>
          <h2>Welcome to Interleaf Reader</h2>
          <p>Interleaf Reader is a reading-first EPUB reader for English Study. This built-in Guide opens through the same Reader flow as a book, so you can try Reader view, Contents, Progress, Preview, Mode, and vocabulary bubbles before importing your own EPUB.</p>
          <p>The Guide is built in. It is not a user-imported EPUB, not an EPUB blob, and not removed by the normal Forget action for user books.</p>
          <p>Reading Mode controls this Guide's content. English Study shows this English Guide. Chinese Reading Mode and Mixed Mode show the built-in Chinese and mixed Guide variants. Interface Language only changes UI labels.</p>
          <p>Try this: open Contents, jump to another Guide chapter, then return here with Previous or Next.</p>
        </section>
      `,
      chinese: `
        <section lang="zh-CN">
          <h2>欢迎使用 Interleaf Reader</h2>
          <p>Interleaf Reader 是阅读优先的 English Study EPUB 阅读器。这个内置指南会像一本书一样通过 Reader 打开，所以你可以先体验 Reader 视图、Contents、Progress、Preview、Mode 和词汇气泡。</p>
          <p>这个指南是内置内容，不是用户导入的 EPUB，不是 EPUB 文件 blob，也不会通过用户图书的 Forget 操作删除。</p>
          <p>Reading Mode 控制这份指南的正文。English Study 显示英文指南，Chinese Reading Mode 显示中文指南，Mixed Mode 显示中英混合指南。界面语言只改变 UI 文案，不改变指南正文或阅读模式。</p>
          <p>可以先试试：打开 Contents，跳到另一个指南章节，再用 Previous 或 Next 回来。</p>
        </section>
      `,
      bilingual: `
        <section>
          <h2>Welcome to Interleaf Reader / 欢迎使用</h2>
          <p>Interleaf Reader is a reading-first English Study EPUB reader. / Interleaf Reader 是阅读优先的 English Study EPUB 阅读器。</p>
          <p>This built-in Guide opens through the Reader flow, like a book. / 这个内置指南会像一本书一样通过 Reader 打开。</p>
          <p>Reading Mode controls Guide content here. / Reading Mode 在这里控制指南正文。</p>
          <p>It is not a user-imported EPUB and is not removed by normal user-book Forget. / 它不是用户导入的 EPUB，也不会通过普通用户图书的 Forget 操作删除。</p>
        </section>
      `
    }
  },
  {
    id: "guide-first-book",
    titles: {
      english: "Your First Book",
      chinese: "阅读第一本书",
      bilingual: "Your First Book / 阅读第一本书"
    },
    html: {
      english: `
        <section>
          <h2>Your First Book</h2>
          <p>Use Home to import an English EPUB. The file stays in this browser on this device when saved to Local Library. Imported book titles, authors, and book text are never translated by the interface-language setting.</p>
          <p>After import, Reader opens the first available chapter. Local Library can restore saved user EPUBs later, while the built-in Guide remains a separate guide-like entry.</p>
          <p>Try this: import the smoke EPUB, open Contents, and move between chapters.</p>
        </section>
      `,
      chinese: `
        <section lang="zh-CN">
          <h2>阅读第一本书</h2>
          <p>在 Home 导入英文 EPUB。保存到 Local Library 后，文件仍然只保存在当前浏览器和当前设备上。界面语言不会翻译导入书籍的标题、作者或正文。</p>
          <p>导入后，Reader 会打开第一个可读章节。Local Library 可以恢复用户保存的 EPUB，而内置指南始终是单独的指南入口。</p>
          <p>可以试试：导入 smoke EPUB，打开 Contents，并在章节之间切换。</p>
        </section>
      `,
      bilingual: `
        <section>
          <h2>Your First Book / 阅读第一本书</h2>
          <p>Use Home to import an English EPUB. / 在 Home 导入英文 EPUB。</p>
          <p>Saved user books stay in this browser on this device. / 保存的用户图书只保存在当前浏览器和当前设备上。</p>
          <p>The UI language system does not translate imported titles, authors, or book text. / 界面语言系统不会翻译导入书籍的标题、作者或正文。</p>
        </section>
      `
    }
  },
  {
    id: "guide-reader-tools",
    titles: {
      english: "Reader Tools",
      chinese: "阅读工具",
      bilingual: "Reader Tools / 阅读工具"
    },
    html: {
      english: `
        <section>
          <h2>Reader Tools</h2>
          <p>Contents lists chapters. Progress changes chapters; it is not a paragraph-position slider. Preview shows vocabulary candidates for the current chapter. Mode switches Reading Mode for the current book.</p>
          <p>For this built-in Guide, Mode also switches the Guide's pre-authored English, Chinese, or mixed content. Imported EPUBs still show Chinese and Mixed placeholders until a translation provider exists.</p>
          <p>The small Reader help button can reopen short contextual help. Use the full Guide Book for a longer walkthrough.</p>
          <p>Try this: open Progress, move the chapter slider, and confirm the target chapter label changes before release.</p>
        </section>
      `,
      chinese: `
        <section lang="zh-CN">
          <h2>阅读工具</h2>
          <p>Contents 显示章节。Progress 用来切换章节，不是段落位置滑块。Preview 显示当前章节的词汇候选。Mode 切换当前图书的阅读模式。</p>
          <p>对于这份内置指南，Mode 也会切换预写的英文、中文或混合指南正文。导入的 EPUB 在 Chinese Reading Mode 和 Mixed Mode 下仍显示占位内容，直到接入翻译服务。</p>
          <p>Reader 右下角的小问号可以打开简短的上下文帮助。完整指南适合查看更系统的说明。</p>
          <p>可以试试：打开 Progress，拖动章节滑块，松开前确认目标章节标题变化。</p>
        </section>
      `,
      bilingual: `
        <section>
          <h2>Reader Tools / 阅读工具</h2>
          <p>Contents lists chapters; Progress changes chapters, not paragraph position. / Contents 显示章节；Progress 切换章节，不是段落位置。</p>
          <p>Preview shows vocabulary candidates, and Mode switches Reading Mode. / Preview 显示词汇候选；Mode 切换阅读模式。</p>
          <p>For this Guide, Mode also switches pre-authored English, Chinese, or mixed Guide content. / 对于这份指南，Mode 也会切换预写的英文、中文或混合指南正文。</p>
        </section>
      `
    }
  },
  {
    id: "guide-vocabulary",
    titles: {
      english: "Vocabulary Support",
      chinese: "词汇辅助",
      bilingual: "Vocabulary Support / 词汇辅助"
    },
    html: {
      english: `
        <section>
          <h2>Vocabulary Support</h2>
          <p>Vocabulary Preview scans the current chapter for useful reading terms. Underlined terms in the Reader can open a small vocabulary bubble. Known hides a word you already know, Save keeps a word in Learning, and Hide removes a word that is not useful to you.</p>
          <p>This Guide includes terms such as anxious, reluctant, glance, mutter, tension, figure out, bring up, and back off so Preview and bubbles can demonstrate real behavior.</p>
          <p>Interleaf Reader is not a flashcard or drill app. Vocabulary support exists to keep reading moving.</p>
        </section>
      `,
      chinese: `
        <section lang="zh-CN">
          <h2>词汇辅助</h2>
          <p>Vocabulary Preview 会根据当前章节显示适合阅读辅助的词。Reader 里带下划线的词可以打开小词汇气泡。Known 表示你已经认识，Save 放入 Learning，Hide 表示这个词暂时不需要。</p>
          <p>本指南保留 anxious、reluctant、glance、mutter、tension、figure out、bring up 和 back off 等词组，用来演示 Preview 和气泡的真实行为。</p>
          <p>Interleaf Reader 不是刷题或背诵软件。词汇功能是为了让阅读不中断。</p>
        </section>
      `,
      bilingual: `
        <section>
          <h2>Vocabulary Support / 词汇辅助</h2>
          <p>Known hides words you already know; Save keeps words in Learning; Hide removes words that are not useful now. / Known 隐藏已认识的词；Save 放入 Learning；Hide 移除暂时不需要的词。</p>
          <p>This Guide includes anxious, reluctant, glance, mutter, tension, figure out, bring up, and back off for real Preview and bubble behavior. / 本指南保留这些英文词和短语，用来演示真实的 Preview 和气泡行为。</p>
          <p>Vocabulary support keeps reading moving; it is not a flashcard drill. / 词汇功能服务阅读，不是刷卡背诵。</p>
        </section>
      `
    }
  },
  {
    id: "guide-level-export-backup",
    titles: {
      english: "Level, Export and Backup",
      chinese: "等级、导出与备份",
      bilingual: "Level, Export and Backup / 等级、导出与备份"
    },
    html: {
      english: `
        <section>
          <h2>Level, Export and Backup</h2>
          <p>Vocabulary Level controls which basic words are treated as already known. It is not a test score, not a full dictionary completeness level, and can be changed anytime.</p>
          <p>M2 adds a learning-only TXT export for 不背单词. It must contain one Learning word or phrase per line, with no definitions, examples, source sentences, book text, or copyrighted context.</p>
          <p>M2 also adds vocabulary profile JSON Backup / Restore for selectedLevel, knownWords, learningWords, ignoredWords, preferredCategories, exportedAt, and schemaVersion only.</p>
        </section>
      `,
      chinese: `
        <section lang="zh-CN">
          <h2>等级、导出与备份</h2>
          <p>Vocabulary Level 控制哪些基础词默认视为已经认识。它不是考试分数，也不是完整词典等级，并且可以随时修改。</p>
          <p>M2 会加入面向 不背单词 的 Learning-only TXT 导出。文件必须是一行一个 Learning 单词或短语，不包含释义、例句、原文句子、书籍正文或受版权保护的上下文。</p>
          <p>M2 也会加入词汇档案 JSON Backup / Restore，只包含 selectedLevel、knownWords、learningWords、ignoredWords、preferredCategories、exportedAt 和 schemaVersion。</p>
        </section>
      `,
      bilingual: `
        <section>
          <h2>Level, Export and Backup / 等级、导出与备份</h2>
          <p>Vocabulary Level controls which basic words are treated as already known. / Vocabulary Level 控制哪些基础词默认视为已认识。</p>
          <p>It is not a test score or a full dictionary completeness level. / 它不是考试分数，也不是完整词典等级。</p>
          <p>M2 TXT export is Learning-only and one term per line; profile Backup / Restore is vocabulary-profile-only. / M2 TXT 导出只包含 Learning，一行一个词；Backup / Restore 只针对词汇档案。</p>
        </section>
      `
    }
  },
  {
    id: "guide-local-first",
    titles: {
      english: "Local-first and Future Features",
      chinese: "本地优先与未来功能",
      bilingual: "Local-first and Future Features / 本地优先与未来功能"
    },
    html: {
      english: `
        <section>
          <h2>Local-first and Future Features</h2>
          <p>Interleaf Reader is local-first. There is no account, backend, upload flow, cloud sync, or cross-device sync in M2. EPUB files, book text, reading progress, and vocabulary profile data stay in this browser unless you export vocabulary yourself.</p>
          <p>Imported EPUBs still use Chinese Reading Mode and Mixed Mode placeholders until a translation provider exists. Only this built-in Guide renders pre-authored Chinese and mixed content without a provider.</p>
          <p>If you hide the Guide from Local Library, reopen or restore it from Settings -> Help Center.</p>
        </section>
      `,
      chinese: `
        <section lang="zh-CN">
          <h2>本地优先与未来功能</h2>
          <p>Interleaf Reader 保持本地优先。M2 没有账号、后端、上传流程、云同步或跨设备同步。EPUB 文件、书籍正文、阅读进度和词汇档案都留在当前浏览器中，除非你主动导出词汇。</p>
          <p>导入的 EPUB 在 Chinese Reading Mode 和 Mixed Mode 下仍显示占位内容。只有这份内置指南可以在没有翻译服务的情况下显示预写的中文和混合正文。</p>
          <p>如果你从 Local Library 隐藏指南，可以从 Settings -> Help Center 重新打开或恢复。</p>
        </section>
      `,
      bilingual: `
        <section>
          <h2>Local-first and Future Features / 本地优先与未来功能</h2>
          <p>No account, backend, upload, cloud sync, or cross-device sync is implemented in M2. / M2 没有账号、后端、上传、云同步或跨设备同步。</p>
          <p>Imported EPUBs still use Chinese and Mixed placeholders; only this built-in Guide renders pre-authored Chinese and mixed content. / 导入 EPUB 仍使用中文和混合占位；只有这份内置指南会渲染预写的中文和混合正文。</p>
          <p>Hide the Guide from Local Library only if you know you can reopen it from Settings -> Help Center. / 从书库隐藏后仍可从 Settings -> Help Center 重新打开或恢复。</p>
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
