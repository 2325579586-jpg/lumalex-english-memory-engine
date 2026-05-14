const STORAGE_KEYS = {
  language: "lumalex-language",
  progress: "lumalex-progress-v3",
  userKey: "lumalex-user-key",
};

const HOSTED_APP_URL = "https://worldapp-livid.vercel.app";
const WINDOW_NAME_MIGRATION_PREFIX = "lumalex-migration:";

const API_BASE_URL =
  window.location.protocol === "file:" ? "https://worldapp-livid.vercel.app/api" : `${window.location.origin}/api`;

const REVIEW_INTERVALS_MS = [
  10 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  16 * 24 * 60 * 60 * 1000,
];

const VAGUE_INTERVALS_MS = [
  30 * 60 * 1000,
  12 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  4 * 24 * 60 * 60 * 1000,
  8 * 24 * 60 * 60 * 1000,
];

const translations = {
  en: {
    brandEyebrow: "Word Memory",
    navHome: "Home",
    navLearn: "Learn",
    navReview: "Review",
    navAdd: "Add",
    navLexicons: "Lexicons",
    navStats: "Stats",
    navSettings: "Settings",
    todayLabel: "Today",
    sidebarNewWords: "12 new words",
    sidebarReviewsWaiting: "28 reviews waiting",
    headerDate: "April 22",
    headerTitle: "Build a calmer memory rhythm.",
    addWordButton: "Add Word",
    homeHeroEyebrow: "Warm Focus Space",
    homeHeroTitle: "Learn with calm. Remember with depth.",
    homeHeroBody:
      "A memory-first English word app with quiet visuals, soft feedback, and a daily study rhythm built for long-term retention.",
    startLearn: "Start Learn",
    openReview: "Open Review",
    todayProgress: "Today Progress",
    tasksComplete: "27 of 40 tasks complete",
    currentStreak: "Current Streak",
    streakDays: "12 days",
    streakEncourage: "Keep the rhythm alive",
    learnCtaTitle: "Meet today's new words",
    learnCtaBody: "12 fresh items waiting inside your Graduate Exam lexicon.",
    pillTwelveNew: "12 new",
    pillFourteenMin: "14 min",
    reviewCtaTitle: "Strengthen what you saw",
    reviewCtaBody: "28 cards are due now. Spaced repetition keeps them alive.",
    pillTwentyEightDue: "28 due",
    pillEighteenMin: "18 min",
    taskRhythm: "Task Rhythm",
    onTrack: "On Track",
    newWords: "New words",
    reviews: "Reviews",
    timeLeft: "Time left",
    minutes14: "14 min",
    quickAccess: "Quick Access",
    seeAll: "See all",
    lexiconGraduate: "Graduate Exam",
    lexiconGraduateCount: "820 words",
    due18: "18 due",
    lexiconIelts: "IELTS Phrases",
    lexiconIeltsCount: "243 phrases",
    due6: "6 due",
    lexiconCet6: "CET-6 High Frequency",
    lexiconCet6Count: "506 words",
    due4: "4 due",
    retention: "Retention",
    recentFeedback: "Recent Memory Feedback",
    feedbackResilient: "Mastered | next review in 7 days",
    feedbackMitigate: "Vague | next review tomorrow",
    feedbackInclined: "Needs more work | review again tonight",
    newWordTitle: "New Word",
    playVoice: "Play Voice",
    academicTag: "Academic",
    highFrequency: "High Frequency",
    learnDefinition: "Showing great attention to detail; very careful and precise.",
    learnExample: "She kept meticulous notes during every lecture so revision felt lighter.",
    learnMnemonic:
      "Mnemonic: think of someone checking every tiny detail before handing in a paper.",
    iGotIt: "I Got It",
    reviewLater: "Review Later",
    oneMoreLook: "One More Look",
    memorySetTitle: "You're building today's memory set",
    doneLabel: "done",
    learned: "Learned",
    left: "Left",
    minutes9: "9 min",
    focusNotes: "Focus Notes",
    firstExposureTitle: "Keep first exposure simple",
    focusTip1: "Listen first, then read the IPA.",
    focusTip2: "Connect the word to a scene or feeling.",
    focusTip3: "Leave perfection for review time.",
    reviewSession: "Review Session",
    tapToReveal: "Tap to reveal",
    know: "Know",
    vague: "Vague",
    dontKnow: "Don't Know",
    waitingAnswer: "Waiting for your answer.",
    reviewsLeftToday: "18 reviews left today",
    previewEmpty: "Preview Empty State",
    addNewMemory: "Add New Memory",
    createWordPhrase: "Create a word or phrase",
    aiReady: "AI ready",
    wordOrPhrase: "Word or phrase",
    autoFillHint:
      "Type a single English word and the app will auto-fill phonetic, part of speech, meaning, and example.",
    autoFillButton: "Auto Fill",
    phoneticLabel: "Phonetic",
    partOfSpeech: "Part of speech",
    meaningLabel: "Meaning",
    exampleSentence: "Example sentence",
    mnemonicLabel: "Mnemonic",
    lexiconLabel: "Lexicon",
    generateVoice: "Generate Voice",
    suggestExample: "Suggest Example",
    createMnemonic: "Create Mnemonic",
    saveWord: "Save Word",
    livePreview: "Live Preview",
    lexiconSpace: "Lexicon Space",
    yourStudySets: "Your study sets",
    createLexicon: "Create Lexicon",
    coreGoal: "Core Goal",
    lexiconGraduateDesc: "820 words curated for intensive reading and writing preparation.",
    lexiconGraduateDue: "18 due today",
    retained71: "71% retained",
    speakingLabel: "Speaking",
    lexiconIeltsDesc: "Useful phrase chunks for response fluency and natural expression.",
    lexiconIeltsDue: "6 due today",
    retained63: "63% retained",
    examSprint: "Exam Sprint",
    lexiconCet6Desc: "Compact review list for common test vocabulary and repeated traps.",
    lexiconCet6Due: "4 due today",
    retained76: "76% retained",
    memoryRhythm: "Memory Rhythm",
    learningStats: "Learning stats",
    weekLabel: "Week",
    monthLabel: "Month",
    streakLabel: "Streak",
    consistency: "Consistency",
    studyHeatmap: "Study Heatmap",
    mastery: "Mastery",
    distribution: "Distribution",
    preferences: "Preferences",
    learningLabel: "Learning",
    studyPace: "Study pace",
    dailyNewWords: "Daily new words",
    reviewCap: "Review cap",
    defaultLexicon: "Default lexicon",
    pronunciationLabel: "Pronunciation",
    aiVoice: "AI voice",
    voiceLabel: "Voice",
    warmFemale: "Warm Female",
    accentLabel: "Accent",
    britishEnglish: "British English",
    autoplay: "Auto-play",
    onLabel: "On",
    appearanceLabel: "Appearance",
    atmosphere: "Atmosphere",
    backgroundStyle: "Background style",
    interfaceLanguage: "Interface language",
    sunsetCampus: "Sunset Campus",
    blurIntensity: "Blur intensity",
    mediumLabel: "Medium",
    motionLabel: "Motion",
    allCaughtUp: "All Caught Up",
    noReviewToday: "No words to review today.",
    noReviewBody:
      "You're all caught up for now. Take a breath, or step into a new learning round.",
    learnSomethingNew: "Learn Something New",
    closeLabel: "Close",
    voiceReady: "Voice Ready",
    feedbackKnow: "Saved. Next review: in 4 days.",
    feedbackVague: "Noted. Next review: tomorrow evening.",
    feedbackDontKnow: "Added back soon. See this again in 10 minutes.",
    translationPopupEyebrow: "Word Translation",
    spellingPractice: "Spelling Practice",
    spellThisWord: "Spell this word",
    spellThisPhrase: "Spell this phrase",
    submitSpelling: "Submit",
    spellingReady: "Type the correct spelling to continue.",
    spellingWrong: "Not quite. Try the same item again.",
    spellingCorrect: "Correct. Moving to the next item.",
    spellingFinish: "Great. Spelling practice complete.",
    spellingFlowLearn: "Post-Learn Spelling",
    spellingFlowReview: "Post-Review Spelling",
    spellingPlaceholder: "Type the word",
    spellingPlaceholderPhrase: "Type the phrase",
    oneMoreLookFeedback: "Take another look before you move on.",
    wordType: "Word",
    phraseType: "Phrase",
    spellingWordHint: "Type the word exactly as learned.",
    spellingPhraseHint: "Keep the spaces in the phrase.",
    autofillLoading: "Looking up this word and filling the form...",
    autofillReady: "Auto-fill complete. You can save it now.",
    autofillFailed: "Couldn't find this word right now. You can still fill the fields manually.",
    autofillPhrase:
      "Auto-fill works best for a single English word. Phrases can still be added manually.",
    autofillSavePending: "Auto-filling this word before saving...",
  },
  zh: {
    brandEyebrow: "单词记忆",
    navHome: "首页",
    navLearn: "学习",
    navReview: "复习",
    navAdd: "添加",
    navLexicons: "词库",
    navStats: "统计",
    navSettings: "设置",
    todayLabel: "今日",
    sidebarNewWords: "12 个新词",
    sidebarReviewsWaiting: "28 个待复习",
    headerDate: "4月22日",
    headerTitle: "建立更平静的记忆节奏。",
    addWordButton: "添加单词",
    homeHeroEyebrow: "沉浸专注空间",
    homeHeroTitle: "安静学习，深度记住。",
    homeHeroBody:
      "一款以记忆节奏为核心的英语单词应用，用沉浸画面、温和反馈和日常学习流，帮助你更长期地记住词汇。",
    startLearn: "开始学习",
    openReview: "进入复习",
    todayProgress: "今日进度",
    tasksComplete: "40 项任务已完成 27 项",
    currentStreak: "连续学习",
    streakDays: "12 天",
    streakEncourage: "把节奏继续保持下去",
    learnCtaTitle: "开始今天的新词学习",
    learnCtaBody: "你的“考研词汇”词库里还有 12 个新词等待学习。",
    pillTwelveNew: "12 个新词",
    pillFourteenMin: "14 分钟",
    reviewCtaTitle: "巩固已经见过的词",
    reviewCtaBody: "当前有 28 张卡片到期，间隔复习会帮助记忆更牢固。",
    pillTwentyEightDue: "28 个到期",
    pillEighteenMin: "18 分钟",
    taskRhythm: "任务节奏",
    onTrack: "进度正常",
    newWords: "新词学习",
    reviews: "复习任务",
    timeLeft: "剩余时间",
    minutes14: "14 分钟",
    quickAccess: "词库快捷入口",
    seeAll: "查看全部",
    lexiconGraduate: "考研词汇",
    lexiconGraduateCount: "820 个单词",
    due18: "18 个到期",
    lexiconIelts: "雅思短语",
    lexiconIeltsCount: "243 个短语",
    due6: "6 个到期",
    lexiconCet6: "四六级高频",
    lexiconCet6Count: "506 个单词",
    due4: "4 个到期",
    retention: "记忆保持",
    recentFeedback: "最近记忆反馈",
    feedbackResilient: "已掌握 | 7 天后复习",
    feedbackMitigate: "有点模糊 | 明天复习",
    feedbackInclined: "还需加强 | 今晚再次出现",
    newWordTitle: "新词学习",
    playVoice: "播放发音",
    academicTag: "学术",
    highFrequency: "高频",
    learnDefinition: "对细节极其认真；非常仔细、严谨。",
    learnExample: "她在每次课堂上都做了非常细致的笔记，因此复习时轻松了很多。",
    learnMnemonic: "助记：想象一个人在交论文前，把每个细节都认真检查一遍。",
    iGotIt: "我认识了",
    reviewLater: "稍后复习",
    oneMoreLook: "再看一眼",
    memorySetTitle: "你正在建立今天的记忆集合",
    doneLabel: "已完成",
    learned: "已学",
    left: "剩余",
    minutes9: "9 分钟",
    focusNotes: "专注提示",
    firstExposureTitle: "第一次接触时尽量简单",
    focusTip1: "先听发音，再看音标。",
    focusTip2: "把单词和一个画面或感受关联起来。",
    focusTip3: "不用一次学会，复习阶段再追求准确。",
    reviewSession: "复习环节",
    tapToReveal: "点击显示答案",
    know: "认识",
    vague: "模糊",
    dontKnow: "不认识",
    waitingAnswer: "等待你的判断。",
    reviewsLeftToday: "今天还剩 18 个复习任务",
    previewEmpty: "预览空状态",
    addNewMemory: "添加新记忆",
    createWordPhrase: "创建一个单词或短语",
    aiReady: "AI 已就绪",
    wordOrPhrase: "单词或短语",
    autoFillHint: "输入一个英文单词后，系统会自动补全音标、词性、释义和例句。",
    autoFillButton: "自动填充",
    phoneticLabel: "音标",
    partOfSpeech: "词性",
    meaningLabel: "释义",
    exampleSentence: "例句",
    mnemonicLabel: "助记",
    lexiconLabel: "所属词库",
    generateVoice: "生成发音",
    suggestExample: "补全例句",
    createMnemonic: "生成助记",
    saveWord: "保存单词",
    livePreview: "实时预览",
    lexiconSpace: "词库空间",
    yourStudySets: "你的学习词库",
    createLexicon: "创建词库",
    coreGoal: "核心目标",
    lexiconGraduateDesc: "面向考研阅读与写作训练的高频词汇集合。",
    lexiconGraduateDue: "今日待复习 18 个",
    retained71: "保持率 71%",
    speakingLabel: "口语表达",
    lexiconIeltsDesc: "用于提升表达自然度与流利度的常用短语组合。",
    lexiconIeltsDue: "今日待复习 6 个",
    retained63: "保持率 63%",
    examSprint: "考前冲刺",
    lexiconCet6Desc: "覆盖考试高频词和反复易错点的紧凑型词表。",
    lexiconCet6Due: "今日待复习 4 个",
    retained76: "保持率 76%",
    memoryRhythm: "记忆节奏",
    learningStats: "学习统计",
    weekLabel: "本周",
    monthLabel: "本月",
    streakLabel: "连续天数",
    consistency: "学习连续性",
    studyHeatmap: "学习热力图",
    mastery: "掌握情况",
    distribution: "分布情况",
    preferences: "偏好设置",
    learningLabel: "学习设置",
    studyPace: "学习节奏",
    dailyNewWords: "每日新词量",
    reviewCap: "每日复习上限",
    defaultLexicon: "默认词库",
    pronunciationLabel: "发音设置",
    aiVoice: "AI 发音",
    voiceLabel: "声音",
    warmFemale: "温和女声",
    accentLabel: "口音",
    britishEnglish: "英式英语",
    autoplay: "自动播放",
    onLabel: "开启",
    appearanceLabel: "界面风格",
    atmosphere: "氛围设置",
    backgroundStyle: "背景风格",
    interfaceLanguage: "界面语言",
    sunsetCampus: "夕阳校园",
    blurIntensity: "模糊强度",
    mediumLabel: "中等",
    motionLabel: "动态效果",
    allCaughtUp: "今日已完成",
    noReviewToday: "今天没有需要复习的单词。",
    noReviewBody: "你暂时已经完成今天的复习任务，可以休息一下，或者继续学习新词。",
    learnSomethingNew: "去学点新词",
    closeLabel: "关闭",
    voiceReady: "发音已准备",
    feedbackKnow: "已记录，下次复习：4 天后。",
    feedbackVague: "已记录，下次复习：明晚。",
    feedbackDontKnow: "已加入短间隔复习，10 分钟后再次出现。",
    translationPopupEyebrow: "单词翻译",
    spellingPractice: "拼写练习",
    spellThisWord: "请拼写这个单词",
    spellThisPhrase: "请拼写这个短语",
    submitSpelling: "提交拼写",
    spellingReady: "请输入正确拼写后继续。",
    spellingWrong: "拼写不对，再拼一次这个项目。",
    spellingCorrect: "拼对了，进入下一个项目。",
    spellingFinish: "很好，拼写练习完成。",
    spellingFlowLearn: "学习完成后拼写",
    spellingFlowReview: "复习完成后拼写",
    spellingPlaceholder: "输入单词拼写",
    spellingPlaceholderPhrase: "输入短语拼写",
    oneMoreLookFeedback: "再看一眼这个词，准备好了再继续。",
    wordType: "单词",
    phraseType: "短语",
    spellingWordHint: "按学习时的单词拼写输入。",
    spellingPhraseHint: "如果是短语，请注意空格位置。",
    autofillLoading: "正在查找这个单词并自动填充表单...",
    autofillReady: "自动填充完成，现在可以直接保存。",
    autofillFailed: "暂时没找到这个单词，你也可以手动填写。",
    autofillPhrase: "自动填充更适合单个英文单词，短语仍可手动添加。",
    autofillSavePending: "正在先自动填充这个单词，然后再保存...",
  },
};

Object.assign(translations.en, {
  accessTipEyebrow: "Campus Wi-Fi Access",
  accessTipLoading: "Checking local access...",
  accessTipBody: "Open this same address on your phone while both devices are on the same Wi-Fi.",
  accessTipReady: "Open on phone: {url}",
  accessTipFallback: "Open from your browser using this computer's local address.",
  accessTipOffline: "Backend is offline. Start the local server to open this app on your phone.",
  exampleHelp: "Keep the original sentence in English. Click the preview to reveal the Chinese translation.",
  mnemonicHelp: "Default to a Chinese memory cue. English support can stay as a secondary note.",
  exampleEnglishLabel: "Example in English",
  exampleChineseLabel: "Example translation in Chinese",
  mnemonicChineseLabel: "Mnemonic in Chinese",
  mnemonicEnglishLabel: "Mnemonic support in English",
  showTranslation: "Show Translation",
  hideTranslation: "Hide Translation",
  showEnglishHint: "Show English",
  showChineseHint: "Show Chinese",
  playingVoice: "Playing...",
  exampleFallbackTranslation: "Chinese translation will appear here after auto fill.",
  mnemonicFallbackChinese: "A Chinese memory cue will appear here after auto fill.",
  mnemonicFallbackEnglish: "An English support cue will appear here after auto fill.",
});

Object.assign(translations.zh, {
  accessTipEyebrow: "校园网访问",
  accessTipLoading: "正在检查局域网访问地址...",
  accessTipBody: "请让手机和电脑连接同一 Wi‑Fi，然后在手机浏览器打开相同地址。",
  accessTipReady: "手机打开：{url}",
  accessTipFallback: "请使用这台电脑的局域网地址在手机浏览器中打开。",
  accessTipOffline: "后端尚未启动。先启动本地服务，手机端才能访问这个应用。",
  exampleHelp: "例句保留英文原句，点击预览可展开中文翻译。",
  mnemonicHelp: "助记默认用中文呈现，英文补充作为次级提示。",
  exampleEnglishLabel: "英文例句",
  exampleChineseLabel: "中文翻译",
  mnemonicChineseLabel: "中文助记",
  mnemonicEnglishLabel: "英文辅助助记",
  showTranslation: "显示翻译",
  hideTranslation: "收起翻译",
  showEnglishHint: "查看英文",
  showChineseHint: "返回中文",
  playingVoice: "播放中...",
  exampleFallbackTranslation: "自动填充后会在这里显示中文翻译。",
  mnemonicFallbackChinese: "自动填充后会在这里显示中文助记。",
  mnemonicFallbackEnglish: "自动填充后会在这里显示英文辅助助记。",
});

const learnDeck = [
  {
    id: "meticulous",
    text: "meticulous",
    kind: "word",
    phonetic: "/muh-TIK-yuh-luhs/",
    pos: "adj.",
    category: { en: "Academic", zh: "学术" },
    difficulty: { en: "High Frequency", zh: "高频" },
    meaning: {
      en: "Showing great attention to detail; very careful and precise.",
      zh: "对细节极其认真；非常仔细、严谨。",
    },
    example: {
      en: "She kept meticulous notes during every lecture so revision felt lighter.",
      zh: "她在每次课堂上都做了非常细致的笔记，因此复习时轻松了很多。",
    },
    mnemonic: {
      en: "Mnemonic: think of someone checking every tiny detail before handing in a paper.",
      zh: "助记：想象一个人在交论文前，把每个细节都认真检查一遍。",
    },
  },
  {
    id: "resilient",
    text: "resilient",
    kind: "word",
    phonetic: "/rih-ZIL-yuhnt/",
    pos: "adj.",
    category: { en: "Mindset", zh: "心态" },
    difficulty: { en: "Common Use", zh: "常用" },
    meaning: {
      en: "Able to recover quickly after stress, difficulty, or change.",
      zh: "能够在压力、困难或变化后迅速恢复的。",
    },
    example: {
      en: "Good sleep habits can make students more resilient during exam season.",
      zh: "良好的睡眠习惯会让学生在考试季更有恢复力。",
    },
    mnemonic: {
      en: "Mnemonic: imagine a branch bending in the wind and then springing back.",
      zh: "助记：想象树枝在风中弯下去，又迅速弹回来。",
    },
  },
  {
    id: "in-the-long-run",
    text: "in the long run",
    kind: "phrase",
    phonetic: "/in thuh long run/",
    pos: "phrase",
    category: { en: "Writing", zh: "写作" },
    difficulty: { en: "Exam Core", zh: "考试核心" },
    meaning: {
      en: "Over a long period of time; eventually.",
      zh: "从长远来看；最终。",
    },
    example: {
      en: "Studying a little every day helps more in the long run than last-minute cramming.",
      zh: "长期来看，每天学一点比临时抱佛脚更有效。",
    },
    mnemonic: {
      en: "Mnemonic: picture yourself running a marathon, not a sprint.",
      zh: "助记：想象自己跑的是马拉松，而不是短跑。",
    },
  },
];

const reviewDeck = [
  {
    id: "ubiquitous",
    text: "ubiquitous",
    kind: "word",
    phonetic: "/yoo-BIK-wi-tuhs/",
    meaning: {
      en: "adj. existing or appearing everywhere",
      zh: "形容词：无处不在的，随处可见的",
    },
    example: {
      en: "Example: Smartphones have become ubiquitous in campus life.",
      zh: "例句：智能手机已经在校园生活中变得随处可见。",
    },
    mnemonic: {
      en: "Mnemonic: Think of something so common that you keep seeing it in every corner.",
      zh: "助记：想象一种东西常见到你在每个角落都能看见。",
    },
  },
  {
    id: "alleviate",
    text: "alleviate",
    kind: "word",
    phonetic: "/uh-LEE-vee-ayt/",
    meaning: {
      en: "v. to make pain or difficulty less severe",
      zh: "动词：减轻，缓解痛苦或困难",
    },
    example: {
      en: "Example: A short walk can alleviate exam stress after a long day.",
      zh: "例句：在漫长的一天后，短暂散步可以缓解考试压力。",
    },
    mnemonic: {
      en: "Mnemonic: Imagine lifting a heavy pressure off your shoulders.",
      zh: "助记：想象把肩上的沉重压力轻轻卸下来。",
    },
  },
  {
    id: "be-inclined-to",
    text: "be inclined to",
    kind: "phrase",
    phonetic: "/bee in-KLYND too/",
    meaning: {
      en: "phrase. to be likely to think or behave in a particular way",
      zh: "短语：倾向于以某种方式思考或行动",
    },
    example: {
      en: "Example: Students may be inclined to skip review if the task feels too heavy.",
      zh: "例句：如果任务太重，学生可能会倾向于跳过复习。",
    },
    mnemonic: {
      en: "Mnemonic: imagine your body leaning slightly toward a choice.",
      zh: "助记：想象你的身体微微倾向某个选择。",
    },
  },
];

const customDeck = [];
let allItems = [];
let itemMap = new Map();

const CUSTOM_LEXICON_META = {
  graduate: {
    category: { en: "Academic", zh: "Academic" },
    difficulty: { en: "Added by You", zh: "Custom" },
  },
  ielts: {
    category: { en: "Speaking", zh: "Speaking" },
    difficulty: { en: "Added by You", zh: "Custom" },
  },
  cet6: {
    category: { en: "Exam", zh: "Exam" },
    difficulty: { en: "Added by You", zh: "Custom" },
  },
};

function rebuildCollections() {
  allItems = [...learnDeck, ...reviewDeck, ...customDeck];
  itemMap = new Map(allItems.map((item) => [item.id, item]));
}

rebuildCollections();

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(
  ".nav-item[data-target], [data-target].primary-button, [data-target].ghost-button, .focus-card[data-target], .text-button[data-target]"
);
const langButtons = document.querySelectorAll(".lang-button");

const sidebarNewWordsText = document.getElementById("sidebarNewWordsText");
const sidebarReviewsWaitingText = document.getElementById("sidebarReviewsWaitingText");
const heroProgressValue = document.getElementById("heroProgressValue");
const heroTasksComplete = document.getElementById("heroTasksComplete");
const heroStreakValue = document.getElementById("heroStreakValue");
const learnCtaBody = document.getElementById("learnCtaBody");
const learnCtaCount = document.getElementById("learnCtaCount");
const learnCtaEta = document.getElementById("learnCtaEta");
const reviewCtaBody = document.getElementById("reviewCtaBody");
const reviewCtaCount = document.getElementById("reviewCtaCount");
const reviewCtaEta = document.getElementById("reviewCtaEta");
const taskNewProgress = document.getElementById("taskNewProgress");
const taskNewBar = document.getElementById("taskNewBar");
const taskReviewProgress = document.getElementById("taskReviewProgress");
const taskReviewBar = document.getElementById("taskReviewBar");
const taskTimeLeft = document.getElementById("taskTimeLeft");
const lexiconPrimaryDue = document.getElementById("lexiconPrimaryDue");
const feedbackWord1 = document.getElementById("feedbackWord1");
const feedbackText1 = document.getElementById("feedbackText1");
const feedbackWord2 = document.getElementById("feedbackWord2");
const feedbackText2 = document.getElementById("feedbackText2");
const feedbackWord3 = document.getElementById("feedbackWord3");
const feedbackText3 = document.getElementById("feedbackText3");
const reviewsLeftTodayText = document.getElementById("reviewsLeftTodayText");

const flashcard = document.getElementById("flashcard");
const flashWord = document.getElementById("flashWord");
const flashBack = document.getElementById("flashBack");
const reviewFeedback = document.getElementById("reviewFeedback");
const reviewCounter = document.getElementById("reviewCounter");
const playPronunciation = document.getElementById("playPronunciation");
const reviewPronunciation = document.getElementById("reviewPronunciation");

const learnWord = document.getElementById("learnWord");
const learnPhonetic = document.getElementById("learnPhonetic");
const learnType = document.getElementById("learnType");
const learnPos = document.getElementById("learnPos");
const learnCategory = document.getElementById("learnCategory");
const learnDifficulty = document.getElementById("learnDifficulty");
const learnDefinition = document.getElementById("learnDefinition");
const learnExample = document.getElementById("learnExample");
const learnExampleCard = document.getElementById("learnExampleCard");
const learnExampleToggle = document.getElementById("learnExampleToggle");
const learnExampleTranslation = document.getElementById("learnExampleTranslation");
const learnMnemonic = document.getElementById("learnMnemonic");
const learnMnemonicSecondary = document.getElementById("learnMnemonicSecondary");
const learnMnemonicToggle = document.getElementById("learnMnemonicToggle");
const learnCounter = document.getElementById("learnCounter");
const learnProgressPercent = document.getElementById("learnProgressPercent");
const learnedCount = document.getElementById("learnedCount");
const leftCount = document.getElementById("leftCount");
const learnEta = document.getElementById("learnEta");
const learnComplete = document.getElementById("learnComplete");
const learnReviewLater = document.getElementById("learnReviewLater");
const learnStay = document.getElementById("learnStay");

const translationModal = document.getElementById("translationModal");
const translationWord = document.getElementById("translationWord");
const translationType = document.getElementById("translationType");
const translationPrimary = document.getElementById("translationPrimary");
const translationSecondary = document.getElementById("translationSecondary");

const spellingModal = document.getElementById("spellingModal");
const spellingTitle = document.getElementById("spellingTitle");
const spellingFlowLabel = document.getElementById("spellingFlowLabel");
const spellingType = document.getElementById("spellingType");
const spellingPrompt = document.getElementById("spellingPrompt");
const spellingHint = document.getElementById("spellingHint");
const spellingPhonetic = document.getElementById("spellingPhonetic");
const spellingModeHint = document.getElementById("spellingModeHint");
const spellingForm = document.getElementById("spellingForm");
const spellingInput = document.getElementById("spellingInput");
const spellingFeedback = document.getElementById("spellingFeedback");
const spellingProgress = document.getElementById("spellingProgress");

const emptyModal = document.getElementById("emptyModal");
const showEmptyModal = document.getElementById("showEmptyModal");
const closeModalButton = document.getElementById("closeModal");

const wordForm = document.getElementById("wordForm");
const inputWord = document.getElementById("inputWord");
const autoFillButton = document.getElementById("autoFillButton");
const inputPhonetic = document.getElementById("inputPhonetic");
const inputPos = document.getElementById("inputPos");
const inputMeaning = document.getElementById("inputMeaning");
const inputExampleEn = document.getElementById("inputExampleEn");
const inputExampleZh = document.getElementById("inputExampleZh");
const inputMnemonicZh = document.getElementById("inputMnemonicZh");
const inputMnemonicEn = document.getElementById("inputMnemonicEn");
const inputLexicon = document.getElementById("inputLexicon");
const previewWord = document.getElementById("previewWord");
const previewPhonetic = document.getElementById("previewPhonetic");
const previewPos = document.getElementById("previewPos");
const previewMeaning = document.getElementById("previewMeaning");
const previewExample = document.getElementById("previewExample");
const previewExampleCard = document.getElementById("previewExampleCard");
const previewExampleToggle = document.getElementById("previewExampleToggle");
const previewExampleTranslation = document.getElementById("previewExampleTranslation");
const previewMnemonic = document.getElementById("previewMnemonic");
const previewMnemonicSecondary = document.getElementById("previewMnemonicSecondary");
const previewMnemonicToggle = document.getElementById("previewMnemonicToggle");
const previewLexicon = document.getElementById("previewLexicon");
const saveWordButton = document.getElementById("saveWordButton");
const addFeedback = document.getElementById("addFeedback");
const spellingPronunciation = document.getElementById("spellingPronunciation");

const previewBindings = [
  ["inputWord", "previewWord"],
  ["inputPhonetic", "previewPhonetic"],
  ["inputPos", "previewPos"],
  ["inputMeaning", "previewMeaning"],
  ["inputExampleEn", "previewExample"],
  ["inputExampleZh", "previewExampleTranslation"],
  ["inputMnemonicZh", "previewMnemonic"],
  ["inputMnemonicEn", "previewMnemonicSecondary"],
];

let currentLanguage = localStorage.getItem(STORAGE_KEYS.language) || "en";
let activePageId = "home";
let itemStates = {};
let learnSessionIds = [];
let learnIndex = 0;
let reviewSessionIds = [];
let reviewIndex = 0;
let spellingActive = false;
let spellingMode = "learn";
let spellingQueueIds = [];
let spellingIndex = 0;
let activityDates = [];
let todayStats = {
  date: "",
  newCompleted: 0,
  reviewCompleted: 0,
  spellingCorrect: 0,
  spellingMistakes: 0,
};
let isReviewLocked = false;
let autofillRequestId = 0;
let autofillTimer = null;
let backendStatus = {
  available: false,
  checked: false,
  health: null,
};
let learnExampleExpanded = false;
let learnMnemonicEnglishVisible = false;
let previewExampleExpanded = false;
let previewMnemonicEnglishVisible = false;
let reviewExampleExpanded = false;
let reviewMnemonicEnglishVisible = false;
let addDraftAudioUrl = "";
let activePronunciationAudio = null;

function getDictionary() {
  return translations[currentLanguage] || translations.en;
}

function getOrCreateUserKey() {
  const existing = localStorage.getItem(STORAGE_KEYS.userKey);
  if (existing) {
    return existing;
  }

  const created =
    (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
    `browser-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  localStorage.setItem(STORAGE_KEYS.userKey, created);
  return created;
}

function getTypeLabel(kind) {
  const dictionary = getDictionary();
  return kind === "phrase" ? dictionary.phraseType : dictionary.wordType;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLexiconMeta(lexiconKey) {
  return CUSTOM_LEXICON_META[lexiconKey] || CUSTOM_LEXICON_META.graduate;
}

function getSelectedLexiconLabel() {
  if (!inputLexicon) {
    return "";
  }

  return inputLexicon.options[inputLexicon.selectedIndex]?.textContent || "";
}

function sanitizeLocalizedField(value, fallback = "") {
  if (value && typeof value === "object") {
    const english = typeof value.en === "string" ? value.en.trim() : "";
    const chinese = typeof value.zh === "string" ? value.zh.trim() : "";
    const resolved = english || chinese || fallback;
    return {
      en: english || resolved,
      zh: chinese || resolved,
    };
  }

  const text = typeof value === "string" ? value.trim() : fallback;
  return {
    en: text,
    zh: text,
  };
}

function sanitizeCustomItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const text = typeof rawItem.text === "string" ? rawItem.text.trim() : "";
  const meaning = sanitizeLocalizedField(rawItem.meaning);

  if (!text || !meaning.en) {
    return null;
  }

  const kind = rawItem.kind === "phrase" ? "phrase" : /\s/.test(text) ? "phrase" : "word";
  const lexiconKey =
    typeof rawItem.lexiconKey === "string" && CUSTOM_LEXICON_META[rawItem.lexiconKey]
      ? rawItem.lexiconKey
      : "graduate";
  const lexiconMeta = getLexiconMeta(lexiconKey);
  const id =
    typeof rawItem.id === "string" && rawItem.id.trim()
      ? rawItem.id.trim()
      : `custom-${normalizeText(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;

  return {
    id,
    text,
    kind,
    phonetic: typeof rawItem.phonetic === "string" ? rawItem.phonetic.trim() : "",
    pos:
      typeof rawItem.pos === "string" && rawItem.pos.trim()
        ? rawItem.pos.trim()
        : kind === "phrase"
          ? "phrase"
          : "n.",
    category: sanitizeLocalizedField(rawItem.category, lexiconMeta.category.en),
    difficulty: sanitizeLocalizedField(rawItem.difficulty, lexiconMeta.difficulty.en),
    meaning,
    example: sanitizeLocalizedField(rawItem.example),
    mnemonic: sanitizeLocalizedField(rawItem.mnemonic),
    audioUrl: typeof rawItem.audioUrl === "string" ? rawItem.audioUrl.trim() : "",
    lexiconKey,
    createdAt: Number.isFinite(rawItem.createdAt) ? rawItem.createdAt : Date.now(),
    isCustom: true,
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-User-Key": getOrCreateUserKey(),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

async function checkBackendAvailability() {
  if (backendStatus.checked && backendStatus.available) {
    return backendStatus.available;
  }

  try {
    const health = await apiRequest("/health", { method: "GET" });
    backendStatus = { available: true, checked: true, health };
  } catch {
    backendStatus = { available: false, checked: true, health: null };
  }

  return backendStatus.available;
}

function renderAccessTip() {
  if (!accessTipBar || !accessTipTitle || !accessTipBody) {
    return;
  }

  const dictionary = getDictionary();
  const health = backendStatus.health || {};
  const lanUrl = health.localAccessUrl || "";

  if (!backendStatus.checked) {
    accessTipTitle.textContent = dictionary.accessTipLoading;
    accessTipBody.textContent = dictionary.accessTipBody;
    return;
  }

  if (!backendStatus.available) {
    accessTipTitle.textContent = dictionary.accessTipOffline;
    accessTipBody.textContent = dictionary.accessTipBody;
    return;
  }

  if (lanUrl) {
    accessTipTitle.textContent = dictionary.accessTipReady.replace("{url}", lanUrl);
    accessTipBody.textContent = dictionary.accessTipBody;
    return;
  }

  accessTipTitle.textContent = dictionary.accessTipFallback;
  accessTipBody.textContent = dictionary.accessTipBody;
}

function replaceCustomDeck(items) {
  customDeck.splice(0, customDeck.length, ...items);
  rebuildCollections();

  items.forEach((item) => {
    if (!itemStates[item.id]) {
      itemStates[item.id] = {
        status: "new",
        level: 0,
        dueAt: null,
        lastReviewedAt: null,
        lastResult: null,
      };
    }
  });
}

function upsertCustomItem(item) {
  const index = customDeck.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    customDeck.splice(index, 1, item);
  } else {
    customDeck.unshift(item);
  }
  rebuildCollections();
}

async function fetchRemoteCustomItems() {
  const available = await checkBackendAvailability();
  if (!available) {
    return false;
  }

  const payload = await apiRequest("/items", { method: "GET" });
  const items = Array.isArray(payload.items) ? payload.items.map(sanitizeCustomItem).filter(Boolean) : [];
  replaceCustomDeck(items);
  saveProgress();
  return true;
}

async function fetchBackendEnrichmentDraft(text, kind) {
  const available = await checkBackendAvailability();
  if (!available) {
    throw new Error("Backend unavailable");
  }

  return apiRequest("/enrich", {
    method: "POST",
    body: JSON.stringify({ text, kind }),
  });
}

async function saveItemToBackend(item) {
  const available = await checkBackendAvailability();
  if (!available) {
    throw new Error("Backend unavailable");
  }

  return apiRequest("/items", {
    method: "POST",
    body: JSON.stringify({ item }),
  });
}

function findSeedItemForWord(text) {
  const normalized = normalizeText(text);
  return allItems.find((item) => normalizeText(item.text) === normalized) || null;
}

function formatPosLabel(partOfSpeech) {
  const pos = (partOfSpeech || "").toLowerCase();
  const map = {
    noun: "n.",
    verb: "v.",
    adjective: "adj.",
    adverb: "adv.",
    pronoun: "pron.",
    preposition: "prep.",
    conjunction: "conj.",
    interjection: "interj.",
    article: "art.",
    phrase: "phrase",
  };

  return map[pos] || partOfSpeech || "n.";
}

function buildFallbackExample(word) {
  return `Example: ${word} is easier to remember when you meet it again in context.`;
}

function buildFallbackMnemonic(word, definition) {
  return `Mnemonic: connect "${word}" with this idea - ${definition}`;
}

function buildFallbackExampleTranslation(word) {
  return currentLanguage === "zh"
    ? `和 "${word}" 相关的中文例句翻译会显示在这里。`
    : `A Chinese translation for "${word}" will appear here.`;
}

function buildFallbackChineseMnemonic(word, definition) {
  return `助记：把 "${word}" 和这个意思联系起来记忆：${definition}`;
}

function extractDictionaryAudioUrl(entry) {
  if (!entry || typeof entry !== "object" || !Array.isArray(entry.phonetics)) {
    return "";
  }

  const phoneticWithAudio = entry.phonetics.find((item) => typeof item?.audio === "string" && item.audio.trim());
  return phoneticWithAudio?.audio?.trim() || "";
}

function parseDictionaryEntry(entry, originalWord) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const phonetic =
    entry.phonetic ||
    entry.phonetics?.find((item) => item?.text)?.text ||
    "";
  const primaryMeaning = Array.isArray(entry.meanings) ? entry.meanings[0] : null;
  const primaryDefinition = primaryMeaning?.definitions?.find((item) => item?.definition) || null;
  const partOfSpeech = formatPosLabel(primaryMeaning?.partOfSpeech);
  const definition = primaryDefinition?.definition || "";
  const example = primaryDefinition?.example || buildFallbackExample(originalWord);

  if (!definition) {
    return null;
  }

  return {
    phonetic,
    pos: partOfSpeech,
    meaning: definition,
    exampleEn: example,
    exampleZh: buildFallbackExampleTranslation(originalWord),
    mnemonicEn: buildFallbackMnemonic(originalWord, definition),
    mnemonicZh: buildFallbackChineseMnemonic(originalWord, definition),
    audioUrl: extractDictionaryAudioUrl(entry),
  };
}

async function fetchDictionaryDraft(word) {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(`Lookup failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || !payload.length) {
    throw new Error("Empty lookup response");
  }

  const parsed = parseDictionaryEntry(payload[0], word);
  if (!parsed) {
    throw new Error("No usable entry found");
  }

  return parsed;
}

function buildDefaultItemStates() {
  const defaults = {};
  const seededNow = Date.now() - 60 * 1000;

  [...learnDeck, ...customDeck].forEach((item) => {
    defaults[item.id] = {
      status: "new",
      level: 0,
      dueAt: null,
      lastReviewedAt: null,
      lastResult: null,
    };
  });

  reviewDeck.forEach((item) => {
    defaults[item.id] = {
      status: "review",
      level: 1,
      dueAt: seededNow,
      lastReviewedAt: seededNow,
      lastResult: "seed",
    };
  });

  return defaults;
}

function ensureTodayStats() {
  const today = getLocalDateKey();

  if (todayStats.date !== today) {
    todayStats = {
      date: today,
      newCompleted: 0,
      reviewCompleted: 0,
      spellingCorrect: 0,
      spellingMistakes: 0,
    };
  }
}

function recordActivity() {
  ensureTodayStats();

  if (!activityDates.includes(todayStats.date)) {
    activityDates.push(todayStats.date);
    activityDates.sort();
  }
}

function saveProgress() {
  ensureTodayStats();

  const payload = {
    activePageId,
    customItems: customDeck,
    itemStates,
    learnSessionIds,
    learnIndex,
    reviewSessionIds,
    reviewIndex,
    spelling: {
      active: spellingActive,
      mode: spellingMode,
      queueIds: spellingQueueIds,
      index: spellingIndex,
    },
    activityDates,
    todayStats,
  };

  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(payload));
}

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEYS.progress);
  let payload = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  const storedCustomItems = Array.isArray(payload?.customItems)
    ? payload.customItems.map(sanitizeCustomItem).filter(Boolean)
    : [];

  customDeck.splice(0, customDeck.length, ...storedCustomItems);
  rebuildCollections();
  itemStates = buildDefaultItemStates();
  ensureTodayStats();

  if (!payload) {
    return;
  }

  try {
    if (payload.activePageId && document.getElementById(payload.activePageId)) {
      activePageId = payload.activePageId;
    }

    if (payload.itemStates && typeof payload.itemStates === "object") {
      itemStates = {
        ...itemStates,
        ...payload.itemStates,
      };
    }

    if (Array.isArray(payload.learnSessionIds)) {
      learnSessionIds = payload.learnSessionIds.filter((id) => itemMap.has(id));
    }

    if (Number.isInteger(payload.learnIndex)) {
      learnIndex = payload.learnIndex;
    }

    if (Array.isArray(payload.reviewSessionIds)) {
      reviewSessionIds = payload.reviewSessionIds.filter((id) => itemMap.has(id));
    }

    if (Number.isInteger(payload.reviewIndex)) {
      reviewIndex = payload.reviewIndex;
    }

    if (payload.spelling?.active && Array.isArray(payload.spelling.queueIds)) {
      spellingActive = true;
      spellingMode = payload.spelling.mode === "review" ? "review" : "learn";
      spellingQueueIds = payload.spelling.queueIds.filter((id) => itemMap.has(id));
      spellingIndex = Number.isInteger(payload.spelling.index) ? payload.spelling.index : 0;
    }

    if (Array.isArray(payload.activityDates)) {
      activityDates = payload.activityDates.filter(Boolean);
    }

    if (payload.todayStats && typeof payload.todayStats === "object") {
      todayStats = {
        ...todayStats,
        ...payload.todayStats,
      };
      ensureTodayStats();
    }
  } catch {
    customDeck.splice(0, customDeck.length);
    rebuildCollections();
    itemStates = buildDefaultItemStates();
  }
}

function getItemById(id) {
  return itemMap.get(id) || null;
}

function getNewItemIds() {
  return [...learnDeck, ...customDeck]
    .filter((item) => itemStates[item.id]?.status === "new")
    .map((item) => item.id);
}

function getDueReviewIds() {
  const now = Date.now();
  return allItems
    .filter((item) => {
      const state = itemStates[item.id];
      return state && state.status !== "new" && state.dueAt && state.dueAt <= now;
    })
    .sort((left, right) => (itemStates[left.id].dueAt || 0) - (itemStates[right.id].dueAt || 0))
    .map((item) => item.id);
}

function getLearnQueueIds() {
  if (learnSessionIds.length) {
    return learnSessionIds.filter((id) => itemStates[id]?.status === "new");
  }
  return getNewItemIds();
}

function getReviewQueueIds() {
  if (reviewSessionIds.length) {
    return reviewSessionIds.filter((id) => itemStates[id]?.status !== "new");
  }
  return getDueReviewIds();
}

function humanizeDueAt(dueAt) {
  const diff = dueAt - Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  if (diff <= 0) {
    return currentLanguage === "zh" ? "现在" : "now";
  }

  if (diff < oneHour) {
    const minutes = Math.max(1, Math.round(diff / (60 * 1000)));
    return currentLanguage === "zh" ? `${minutes} 分钟后` : `in ${minutes} min`;
  }

  if (diff < oneDay) {
    const hours = Math.max(1, Math.round(diff / oneHour));
    return currentLanguage === "zh" ? `${hours} 小时后` : `in ${hours} hours`;
  }

  if (diff < 2 * oneDay) {
    return currentLanguage === "zh" ? "明天" : "tomorrow";
  }

  const days = Math.max(1, Math.round(diff / oneDay));
  return currentLanguage === "zh" ? `${days} 天后` : `in ${days} days`;
}

function feedbackCopyForState(item, state) {
  if (!item || !state) {
    return {
      word: currentLanguage === "zh" ? "暂无" : "None",
      text: currentLanguage === "zh" ? "还没有最近记录" : "No recent feedback yet",
    };
  }

  const dueText = state.dueAt ? humanizeDueAt(state.dueAt) : currentLanguage === "zh" ? "稍后" : "soon";

  if (currentLanguage === "zh") {
    if (state.lastResult === "know") {
      return { word: item.text, text: `已掌握 | 下次复习 ${dueText}` };
    }
    if (state.lastResult === "vague") {
      return { word: item.text, text: `有点模糊 | 下次复习 ${dueText}` };
    }
    if (state.lastResult === "dontKnow") {
      return { word: item.text, text: `还需加强 | 再次复习 ${dueText}` };
    }
    if (state.lastResult === "learned") {
      return { word: item.text, text: `刚学完 | 首次复习 ${dueText}` };
    }
    return { word: item.text, text: `待复习 | ${dueText}` };
  }

  if (state.lastResult === "know") {
    return { word: item.text, text: `Mastered | next review ${dueText}` };
  }
  if (state.lastResult === "vague") {
    return { word: item.text, text: `Vague | next review ${dueText}` };
  }
  if (state.lastResult === "dontKnow") {
    return { word: item.text, text: `Needs work | review ${dueText}` };
  }
  if (state.lastResult === "learned") {
    return { word: item.text, text: `Just learned | first review ${dueText}` };
  }
  return { word: item.text, text: `Due | ${dueText}` };
}

function computeStreak() {
  if (!activityDates.length) {
    return 0;
  }

  const uniqueDates = [...new Set(activityDates)].sort();
  let streak = 0;
  let cursor = new Date();

  for (let index = uniqueDates.length - 1; index >= 0; index -= 1) {
    const expected = getLocalDateKey(cursor);
    if (uniqueDates[index] !== expected) {
      if (streak === 0) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (uniqueDates[index] === getLocalDateKey(yesterday)) {
          streak = 1;
        }
      }
      break;
    }

    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  return streak;
}

function setWordPresentation(element, item) {
  if (!element || !item) {
    return;
  }

  element.textContent = item.text;
  element.classList.toggle("phrase", item.kind === "phrase");
}

function setButtonDisabled(button, disabled) {
  if (!button) {
    return;
  }

  button.disabled = disabled;
  button.style.opacity = disabled ? "0.45" : "1";
  button.style.pointerEvents = disabled ? "none" : "auto";
}

function renderDashboard() {
  const remainingLearn = learnSessionIds.length ? Math.max(getLearnQueueIds().length - learnIndex, 0) : getNewItemIds().length;
  const remainingReview = reviewSessionIds.length ? Math.max(getReviewQueueIds().length - reviewIndex, 0) : getDueReviewIds().length;
  const completedTasks = todayStats.newCompleted + todayStats.reviewCompleted;
  const totalTasks = completedTasks + remainingLearn + remainingReview;
  const progressPercent = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);
  const streak = computeStreak();
  const estimatedMinutes = remainingLearn * 3 + remainingReview * 2;

  sidebarNewWordsText.textContent =
    currentLanguage === "zh" ? `${remainingLearn} 个新词待学` : `${remainingLearn} new words`;
  sidebarReviewsWaitingText.textContent =
    currentLanguage === "zh" ? `${remainingReview} 个待复习` : `${remainingReview} reviews waiting`;

  heroProgressValue.textContent = `${progressPercent}%`;
  heroTasksComplete.textContent =
    currentLanguage === "zh"
      ? `${completedTasks} / ${totalTasks || completedTasks} 项任务已完成`
      : `${completedTasks} of ${totalTasks || completedTasks} tasks complete`;
  heroStreakValue.textContent = currentLanguage === "zh" ? `${streak} 天` : `${streak} days`;

  learnCtaBody.textContent =
    currentLanguage === "zh"
      ? `当前还有 ${remainingLearn} 个新项目等待学习。`
      : `${remainingLearn} fresh items are waiting in your learning queue.`;
  learnCtaCount.textContent =
    currentLanguage === "zh" ? `${remainingLearn} 个新词` : `${remainingLearn} new`;
  learnCtaEta.textContent =
    currentLanguage === "zh" ? `${remainingLearn * 3} 分钟` : `${remainingLearn * 3} min`;

  reviewCtaBody.textContent =
    currentLanguage === "zh"
      ? `当前有 ${remainingReview} 个项目已到复习时间。`
      : `${remainingReview} items are due now for review.`;
  reviewCtaCount.textContent =
    currentLanguage === "zh" ? `${remainingReview} 个到期` : `${remainingReview} due`;
  reviewCtaEta.textContent =
    currentLanguage === "zh" ? `${remainingReview * 2} 分钟` : `${remainingReview * 2} min`;

  const totalNewToday = todayStats.newCompleted + remainingLearn;
  const totalReviewToday = todayStats.reviewCompleted + remainingReview;
  const newPercent = totalNewToday === 0 ? 0 : Math.round((todayStats.newCompleted / totalNewToday) * 100);
  const reviewPercent = totalReviewToday === 0 ? 0 : Math.round((todayStats.reviewCompleted / totalReviewToday) * 100);

  taskNewProgress.textContent = `${todayStats.newCompleted} / ${totalNewToday}`;
  taskNewBar.style.width = `${newPercent}%`;
  taskReviewProgress.textContent = `${todayStats.reviewCompleted} / ${totalReviewToday}`;
  taskReviewBar.style.width = `${reviewPercent}%`;
  taskTimeLeft.textContent =
    currentLanguage === "zh" ? `${estimatedMinutes} 分钟` : `${estimatedMinutes} min`;
  lexiconPrimaryDue.textContent =
    currentLanguage === "zh" ? `${remainingReview} 个到期` : `${remainingReview} due`;
  reviewsLeftTodayText.textContent =
    currentLanguage === "zh" ? `今天还剩 ${remainingReview} 个复习任务` : `${remainingReview} reviews left today`;

  const recentEntries = Object.entries(itemStates)
    .filter(([, state]) => state.lastReviewedAt)
    .sort((left, right) => (right[1].lastReviewedAt || 0) - (left[1].lastReviewedAt || 0))
    .slice(0, 3)
    .map(([id, state]) => feedbackCopyForState(getItemById(id), state));

  const slots = [
    [feedbackWord1, feedbackText1],
    [feedbackWord2, feedbackText2],
    [feedbackWord3, feedbackText3],
  ];

  slots.forEach(([wordEl, textEl], index) => {
    const entry = recentEntries[index];
    if (!entry) {
      return;
    }
    wordEl.textContent = entry.word;
    textEl.textContent = entry.text;
  });
}

function activatePage(targetId) {
  activePageId = targetId;

  pages.forEach((page) => {
    page.classList.toggle("active", page.id === targetId);
  });

  document.querySelectorAll(".nav-item[data-target]").forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });

  if (targetId === "review" && !getReviewQueueIds().length) {
    openModal(emptyModal);
  }

  saveProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModal(modal) {
  modal?.classList.add("open");
}

function closeModalById(modal) {
  modal?.classList.remove("open");
}

function getAlternateLanguage(lang) {
  return lang === "zh" ? "en" : "zh";
}

function updateLanguageButtons() {
  langButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === currentLanguage);
  });
}

function renderLearnCard() {
  let queue = getLearnQueueIds();

  if (!learnSessionIds.length) {
    learnSessionIds = [...queue];
    learnIndex = 0;
    queue = getLearnQueueIds();
  }

  if (!queue.length) {
    setWordPresentation(learnWord, {
      text: currentLanguage === "zh" ? "今日新词已完成" : "All new items done",
      kind: "word",
    });
    learnPhonetic.textContent = "";
    learnType.textContent = getDictionary().wordType;
    learnPos.textContent = "-";
    learnCategory.textContent = currentLanguage === "zh" ? "休息一下" : "Take a breath";
    learnDifficulty.textContent = currentLanguage === "zh" ? "已完成" : "Done";
    learnDefinition.textContent =
      currentLanguage === "zh" ? "当前没有新的单词或短语了。" : "There are no new words or phrases left right now.";
    learnExample.textContent =
      currentLanguage === "zh" ? "你可以先去复习，或者稍后再回来。" : "You can switch to review, or come back later.";
    learnMnemonic.textContent = "";
    learnCounter.textContent = "0 / 0";
    learnProgressPercent.textContent = "100%";
    learnedCount.textContent = `${todayStats.newCompleted}`;
    leftCount.textContent = "0";
    learnEta.textContent = currentLanguage === "zh" ? "0 分钟" : "0 min";
    setButtonDisabled(learnComplete, true);
    setButtonDisabled(learnReviewLater, true);
    setButtonDisabled(learnStay, true);
    renderDashboard();
    return;
  }

  learnIndex = Math.min(learnIndex, queue.length - 1);
  const item = getItemById(queue[learnIndex]);
  const completed = learnIndex;
  const remaining = queue.length - learnIndex;
  const progress = Math.round((completed / queue.length) * 100);

  setButtonDisabled(learnComplete, false);
  setButtonDisabled(learnReviewLater, false);
  setButtonDisabled(learnStay, false);

  setWordPresentation(learnWord, item);
  learnPhonetic.textContent = item.phonetic;
  learnType.textContent = getTypeLabel(item.kind);
  learnPos.textContent = item.pos;
  learnCategory.textContent = item.category[currentLanguage];
  learnDifficulty.textContent = item.difficulty[currentLanguage];
  learnDefinition.textContent = item.meaning[currentLanguage];
  learnExample.textContent = item.example[currentLanguage];
  learnMnemonic.textContent = item.mnemonic[currentLanguage];
  learnCounter.textContent = `${learnIndex + 1} / ${queue.length}`;
  learnProgressPercent.textContent = `${progress}%`;
  learnedCount.textContent = `${completed}`;
  leftCount.textContent = `${remaining}`;
  learnEta.textContent = currentLanguage === "zh" ? `${remaining * 3} 分钟` : `${remaining * 3} min`;
  renderDashboard();
}

function renderReviewCard() {
  let queue = getReviewQueueIds();

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...queue];
    reviewIndex = 0;
    queue = getReviewQueueIds();
  }

  if (!queue.length) {
    setWordPresentation(flashWord, {
      text: currentLanguage === "zh" ? "今天没有待复习单词" : "No reviews due now",
      kind: "word",
    });
    flashBack.innerHTML = `<p>${currentLanguage === "zh" ? "你已经完成当前复习，可以稍后回来。" : "You're all caught up for now. Come back later."}</p>`;
    reviewCounter.textContent = "0 / 0";
    reviewFeedback.textContent = currentLanguage === "zh" ? "当前没有待复习内容。" : "No review items are due right now.";
    document.querySelectorAll(".mastery-button").forEach((button) => setButtonDisabled(button, true));
    renderDashboard();
    return;
  }

  reviewIndex = Math.min(reviewIndex, queue.length - 1);
  const item = getItemById(queue[reviewIndex]);

  document.querySelectorAll(".mastery-button").forEach((button) => setButtonDisabled(button, false));
  setWordPresentation(flashWord, item);
  flashBack.innerHTML = `
    <p class="phonetic">${item.phonetic}</p>
    <p>${item.meaning[currentLanguage]}</p>
    <p>${item.example[currentLanguage]}</p>
    <p>${item.mnemonic[currentLanguage]}</p>
  `;
  reviewCounter.textContent = `${reviewIndex + 1} / ${queue.length}`;
  flashcard.classList.remove("revealed");

  if (!reviewFeedback.dataset.userTouched) {
    reviewFeedback.textContent = getDictionary().waitingAnswer;
  }

  renderDashboard();
}

function showTranslationPopup(item, onDone) {
  const alternateLanguage = getAlternateLanguage(currentLanguage);

  translationWord.textContent = item.text;
  translationType.textContent = getTypeLabel(item.kind);
  translationPrimary.textContent = item.meaning[currentLanguage];
  translationSecondary.textContent = item.meaning[alternateLanguage];
  openModal(translationModal);

  window.setTimeout(() => {
    closeModalById(translationModal);
    onDone?.();
  }, 1100);
}

function renderSpellingCard() {
  if (!spellingActive || !spellingQueueIds.length) {
    return;
  }

  spellingIndex = Math.min(spellingIndex, spellingQueueIds.length - 1);
  const item = getItemById(spellingQueueIds[spellingIndex]);
  const alternateLanguage = getAlternateLanguage(currentLanguage);
  const dictionary = getDictionary();

  spellingFlowLabel.textContent =
    spellingMode === "review" ? dictionary.spellingFlowReview : dictionary.spellingFlowLearn;
  spellingTitle.textContent = item.kind === "phrase" ? dictionary.spellThisPhrase : dictionary.spellThisWord;
  spellingType.textContent = getTypeLabel(item.kind);
  spellingPrompt.textContent = item.meaning[currentLanguage];
  spellingHint.textContent = item.meaning[alternateLanguage];
  spellingPhonetic.textContent = item.phonetic;
  spellingModeHint.textContent =
    item.kind === "phrase" ? dictionary.spellingPhraseHint : dictionary.spellingWordHint;
  spellingProgress.textContent = `${spellingIndex + 1} / ${spellingQueueIds.length}`;
  spellingInput.placeholder =
    item.kind === "phrase" ? dictionary.spellingPlaceholderPhrase : dictionary.spellingPlaceholder;
}

function applyTranslations(lang) {
  const dictionary = translations[lang] || translations.en;

  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  updateLanguageButtons();
  syncAddPreview();
  renderLearnCard();
  renderReviewCard();
  renderSpellingCard();
  renderDashboard();
}

function scheduleAfterReview(id, level) {
  const now = Date.now();
  const currentState = itemStates[id] || {
    status: "review",
    level: 0,
    dueAt: now,
    lastReviewedAt: now,
    lastResult: null,
  };

  if (level === "Know") {
    const nextLevel = Math.min((currentState.level || 0) + 1, REVIEW_INTERVALS_MS.length - 1);
    itemStates[id] = {
      ...currentState,
      status: "review",
      level: nextLevel,
      dueAt: now + REVIEW_INTERVALS_MS[nextLevel],
      lastReviewedAt: now,
      lastResult: "know",
    };
    return;
  }

  if (level === "Vague") {
    const nextLevel = Math.min(Math.max(currentState.level || 0, 0), VAGUE_INTERVALS_MS.length - 1);
    itemStates[id] = {
      ...currentState,
      status: "review",
      level: nextLevel,
      dueAt: now + VAGUE_INTERVALS_MS[nextLevel],
      lastReviewedAt: now,
      lastResult: "vague",
    };
    return;
  }

  itemStates[id] = {
    ...currentState,
    status: "review",
    level: 0,
    dueAt: now + REVIEW_INTERVALS_MS[0],
    lastReviewedAt: now,
    lastResult: "dontKnow",
  };
}

function finalizeLearnSession() {
  const now = Date.now();

  learnSessionIds.forEach((id) => {
    itemStates[id] = {
      status: "review",
      level: 0,
      dueAt: now + REVIEW_INTERVALS_MS[0],
      lastReviewedAt: now,
      lastResult: "learned",
    };
  });

  recordActivity();
  todayStats.newCompleted += learnSessionIds.length;
  learnSessionIds = [];
  learnIndex = 0;
  spellingActive = false;
  spellingQueueIds = [];
  spellingIndex = 0;
  closeModalById(spellingModal);
  renderLearnCard();
  renderDashboard();
  saveProgress();
}

function finalizeReviewSession() {
  reviewSessionIds = [];
  reviewIndex = 0;
  spellingActive = false;
  spellingQueueIds = [];
  spellingIndex = 0;
  closeModalById(spellingModal);
  reviewFeedback.dataset.userTouched = "";
  renderReviewCard();
  renderDashboard();
  saveProgress();
}

function startSpellingSession(mode, ids) {
  spellingActive = true;
  spellingMode = mode;
  spellingQueueIds = [...ids];
  spellingIndex = 0;
  spellingFeedback.className = "spelling-feedback";
  spellingFeedback.textContent = getDictionary().spellingReady;
  spellingInput.value = "";
  renderSpellingCard();
  openModal(spellingModal);
  saveProgress();
  window.setTimeout(() => spellingInput.focus(), 120);
}

function moveToNextLearnWord() {
  const queue = getLearnQueueIds();
  if (!queue.length) {
    return;
  }

  if (!learnSessionIds.length) {
    learnSessionIds = [...queue];
    learnIndex = 0;
  }

  if (learnIndex >= learnSessionIds.length - 1) {
    startSpellingSession("learn", learnSessionIds);
    return;
  }

  learnIndex += 1;
  recordActivity();
  renderLearnCard();
  saveProgress();
}

function handleReviewAction(level) {
  const queue = getReviewQueueIds();
  if (!queue.length || isReviewLocked) {
    return;
  }

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...queue];
    reviewIndex = 0;
  }

  isReviewLocked = true;
  const currentId = reviewSessionIds[reviewIndex];
  const currentItem = getItemById(currentId);
  const dictionary = getDictionary();
  const feedbackMap = {
    Know: dictionary.feedbackKnow,
    Vague: dictionary.feedbackVague,
    "Don't Know": dictionary.feedbackDontKnow,
  };

  scheduleAfterReview(currentId, level);
  recordActivity();
  todayStats.reviewCompleted += 1;
  reviewFeedback.textContent = feedbackMap[level] || dictionary.waitingAnswer;
  reviewFeedback.dataset.userTouched = "true";
  renderDashboard();
  saveProgress();

  showTranslationPopup(currentItem, () => {
    if (reviewIndex >= reviewSessionIds.length - 1) {
      startSpellingSession("review", reviewSessionIds);
      isReviewLocked = false;
      return;
    }

    reviewIndex += 1;
    reviewFeedback.dataset.userTouched = "";
    renderReviewCard();
    isReviewLocked = false;
    saveProgress();
  });
}

function bindNavigation() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const { target } = button.dataset;
      if (target) {
        activatePage(target);
        closeModalById(emptyModal);
      }
    });
  });
}

function bindLanguageSwitch() {
  langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentLanguage = button.dataset.lang;
      localStorage.setItem(STORAGE_KEYS.language, currentLanguage);
      reviewFeedback.dataset.userTouched = "";
      applyTranslations(currentLanguage);
      saveProgress();
    });
  });
}

function bindLearnActions() {
  learnComplete?.addEventListener("click", moveToNextLearnWord);
  learnReviewLater?.addEventListener("click", moveToNextLearnWord);
  learnStay?.addEventListener("click", () => {
    reviewFeedback.dataset.userTouched = "true";
    reviewFeedback.textContent = getDictionary().oneMoreLookFeedback;
  });
}

function bindReviewActions() {
  flashcard?.addEventListener("click", () => {
    if (getReviewQueueIds().length) {
      flashcard.classList.toggle("revealed");
    }
  });

  document.querySelectorAll(".mastery-button").forEach((button) => {
    button.addEventListener("click", () => {
      handleReviewAction(button.dataset.level);
    });
  });
}

function bindModals() {
  showEmptyModal?.addEventListener("click", () => openModal(emptyModal));
  closeModalButton?.addEventListener("click", () => closeModalById(emptyModal));

  emptyModal?.addEventListener("click", (event) => {
    if (event.target === emptyModal) {
      closeModalById(emptyModal);
    }
  });
}

function syncAddPreview() {
  if (!previewWord) {
    return;
  }

  previewWord.textContent = inputWord?.value.trim() || " ";
  previewPhonetic.textContent = inputPhonetic?.value.trim() || " ";
  previewPos.textContent = inputPos?.value.trim() || "-";
  previewMeaning.textContent = inputMeaning?.value.trim() || " ";
  previewExample.textContent = inputExample?.value.trim() || " ";
  previewMnemonic.textContent = inputMnemonic?.value.trim() || " ";
  previewLexicon.textContent = getSelectedLexiconLabel();
}

function setAddFeedback(type, message) {
  if (!addFeedback) {
    return;
  }

  addFeedback.className = `editor-feedback${type ? ` ${type}` : ""}`;
  addFeedback.textContent = message || "";
}

function applyDraftToForm(draft) {
  if (!draft) {
    return;
  }

  if (draft.phonetic) {
    inputPhonetic.value = draft.phonetic;
  }
  if (draft.pos) {
    inputPos.value = draft.pos;
  }
  if (draft.meaning) {
    inputMeaning.value = draft.meaning;
  }
  if (draft.example) {
    inputExample.value = draft.example;
  }
  if (draft.mnemonic) {
    inputMnemonic.value = draft.mnemonic;
  }

  syncAddPreview();
}

function detectKindFromText(text) {
  return /\s/.test((text || "").trim()) ? "phrase" : "word";
}

function canUseAutoFill(word) {
  return Boolean(word);
}

async function autofillWordForm(options = {}) {
  const { silent = false } = options;
  const dictionary = getDictionary();
  const word = inputWord?.value.trim() || "";
  const currentRequestId = ++autofillRequestId;

  if (!word) {
    return false;
  }

  if (!canUseAutoFill(word)) {
    if (!silent) {
      setAddFeedback("error", dictionary.autofillPhrase);
    }
    return false;
  }

  if (!silent) {
    setAddFeedback("", dictionary.autofillLoading);
  }
  setButtonDisabled(autoFillButton, true);

  try {
    const kind = detectKindFromText(word);
    let draft = null;

    try {
      draft = await fetchBackendEnrichmentDraft(word, kind);
    } catch {
      const seedItem = findSeedItemForWord(word);
      if (seedItem) {
        draft = {
          phonetic: seedItem.phonetic,
          pos: seedItem.pos,
          meaning: seedItem.meaning?.en || seedItem.meaning?.zh || "",
          example: seedItem.example?.en || seedItem.example?.zh || "",
          mnemonic: seedItem.mnemonic?.en || seedItem.mnemonic?.zh || "",
        };
      } else if (kind === "word") {
        draft = await fetchDictionaryDraft(word);
      }
    }

    if (!draft) {
      throw new Error("No enrichment draft available");
    }

    if (currentRequestId !== autofillRequestId) {
      return false;
    }
    applyDraftToForm(draft);
    if (!silent) {
      setAddFeedback("success", dictionary.autofillReady);
    }
    return true;
  } catch {
    if (!silent) {
      setAddFeedback("error", dictionary.autofillFailed);
    }
    return false;
  } finally {
    if (currentRequestId === autofillRequestId) {
      setButtonDisabled(autoFillButton, false);
    }
  }
}

function buildCustomItemFromForm() {
  const text = inputWord?.value.trim() || "";
  const meaning = inputMeaning?.value.trim() || "";

  if (!text || !meaning) {
    return null;
  }

  const lexiconKey = inputLexicon?.value || "graduate";
  const kind =
    /\bphrase\b/i.test(inputPos?.value.trim() || "") ? "phrase" : detectKindFromText(text);
  const slug = normalizeText(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = `custom-${slug || Date.now()}`;
  const lexiconMeta = getLexiconMeta(lexiconKey);
  const posValue = inputPos?.value.trim() || (kind === "phrase" ? "phrase" : "n.");

  return {
    id,
    text,
    kind,
    phonetic: inputPhonetic?.value.trim() || "",
    pos: posValue,
    category: { ...lexiconMeta.category },
    difficulty: { ...lexiconMeta.difficulty },
    meaning: { en: meaning, zh: meaning },
    example: {
      en: inputExample?.value.trim() || "",
      zh: inputExample?.value.trim() || "",
    },
    mnemonic: {
      en: inputMnemonic?.value.trim() || "",
      zh: inputMnemonic?.value.trim() || "",
    },
    lexiconKey,
    createdAt: Date.now(),
    isCustom: true,
  };
}

function resetLearnQueueForNewItem(itemId) {
  const pendingIds = getLearnQueueIds().filter((id) => id !== itemId);
  learnSessionIds = [itemId, ...pendingIds];
  learnIndex = 0;
}

async function saveCustomWord() {
  if (inputWord?.value.trim() && !inputMeaning?.value.trim()) {
    setAddFeedback("", getDictionary().autofillSavePending);
    await autofillWordForm({ silent: false });
  }

  const item = buildCustomItemFromForm();

  if (!item) {
    setAddFeedback(
      "error",
      currentLanguage === "zh"
        ? "请先填写单词或短语，以及对应释义。"
        : "Please fill in the word or phrase and its meaning first."
    );
    return;
  }

  if (itemMap.has(item.id)) {
    setAddFeedback(
      "error",
      currentLanguage === "zh"
        ? "这个词条已经在本地词库里了。"
        : "This item already exists in your local lexicon."
    );
    return;
  }

  customDeck.unshift(item);
  rebuildCollections();
  itemStates[item.id] = {
    status: "new",
    level: 0,
    dueAt: null,
    lastReviewedAt: null,
    lastResult: null,
  };
  resetLearnQueueForNewItem(item.id);
  setAddFeedback(
    "success",
    currentLanguage === "zh"
      ? "已保存到本地词库，正在进入学习页。"
      : "Saved to your local lexicon. Opening Learn now."
  );
  renderDashboard();
  renderLearnCard();
  saveProgress();

  window.setTimeout(() => {
    activatePage("learn");
    setAddFeedback("", "");
  }, 220);
}

async function saveCustomWord() {
  if (inputWord?.value.trim() && !inputMeaning?.value.trim()) {
    setAddFeedback("", getDictionary().autofillSavePending);
    await autofillWordForm({ silent: false });
  }

  const item = buildCustomItemFromForm();

  if (!item) {
    setAddFeedback(
      "error",
      currentLanguage === "zh"
        ? "请先填写单词或短语，以及对应释义。"
        : "Please fill in the word or phrase and its meaning first."
    );
    return;
  }

  let persistedItem = item;
  let alreadyExists = false;

  try {
    const payload = await saveItemToBackend(item);
    if (payload?.item) {
      persistedItem = sanitizeCustomItem(payload.item) || item;
      alreadyExists = payload.created === false;
    }
  } catch {
    alreadyExists = itemMap.has(item.id);
    if (alreadyExists) {
      setAddFeedback(
        "error",
        currentLanguage === "zh"
          ? "这个词条已经在本地词库里了。"
          : "This item already exists in your local lexicon."
      );
      return;
    }
  }

  if (alreadyExists) {
    upsertCustomItem(persistedItem);
    if (!itemStates[persistedItem.id]) {
      itemStates[persistedItem.id] = {
        status: "new",
        level: 0,
        dueAt: null,
        lastReviewedAt: null,
        lastResult: null,
      };
    }
    setAddFeedback(
      "error",
      currentLanguage === "zh"
        ? "这个词条已经存在，已同步到当前学习列表。"
        : "This item already exists and has been synced into your current list."
    );
    renderDashboard();
    renderLearnCard();
    saveProgress();
    return;
  }

  upsertCustomItem(persistedItem);
  itemStates[persistedItem.id] = {
    status: "new",
    level: 0,
    dueAt: null,
    lastReviewedAt: null,
    lastResult: null,
  };
  resetLearnQueueForNewItem(persistedItem.id);
  setAddFeedback(
    "success",
    currentLanguage === "zh"
      ? backendStatus.available
        ? "已通过后端写入 MySQL，正在进入学习页。"
        : "已保存在本地，正在进入学习页。"
      : backendStatus.available
        ? "Saved to MySQL via the backend. Opening Learn now."
        : "Saved locally. Opening Learn now."
  );
  renderDashboard();
  renderLearnCard();
  saveProgress();

  window.setTimeout(() => {
    activatePage("learn");
    setAddFeedback("", "");
  }, 220);
}

function bindPreview() {
  previewBindings.forEach(([inputId, previewId]) => {
    const input = document.getElementById(inputId);

    if (!input || !document.getElementById(previewId)) {
      return;
    }

    input.addEventListener("input", syncAddPreview);
  });
  inputLexicon?.addEventListener("change", syncAddPreview);

  inputWord?.addEventListener("input", () => {
    if (autofillTimer) {
      window.clearTimeout(autofillTimer);
    }

    const word = inputWord.value.trim();
    if (!canUseAutoFill(word)) {
      return;
    }

    autofillTimer = window.setTimeout(() => {
      autofillWordForm({ silent: true });
    }, 700);
  });

  inputWord?.addEventListener("blur", () => {
    const word = inputWord.value.trim();
    if (canUseAutoFill(word) && !inputMeaning?.value.trim()) {
      autofillWordForm({ silent: false });
    }
  });
}

function bindPronunciation() {
  playPronunciation?.addEventListener("click", () => {
    const dictionary = getDictionary();
    playPronunciation.textContent = dictionary.voiceReady;
    window.setTimeout(() => {
      playPronunciation.textContent = dictionary.playVoice;
    }, 1200);
  });
}

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, " ").replace(/[’]/g, "'");
}

function bindSpellingForm() {
  spellingForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!spellingActive || !spellingQueueIds.length) {
      return;
    }

    const item = getItemById(spellingQueueIds[spellingIndex]);
    const dictionary = getDictionary();
    const inputValue = normalizeText(spellingInput.value);
    const expectedValue = normalizeText(item.text);

    if (inputValue !== expectedValue) {
      spellingFeedback.className = "spelling-feedback error";
      spellingFeedback.textContent = dictionary.spellingWrong;
      spellingInput.value = "";
      todayStats.spellingMistakes += 1;
      recordActivity();
      saveProgress();
      spellingInput.focus();
      return;
    }

    spellingFeedback.className = "spelling-feedback success";
    spellingFeedback.textContent =
      spellingIndex === spellingQueueIds.length - 1
        ? dictionary.spellingFinish
        : dictionary.spellingCorrect;
    todayStats.spellingCorrect += 1;
    recordActivity();
    saveProgress();

    if (spellingIndex === spellingQueueIds.length - 1) {
      window.setTimeout(() => {
        if (spellingMode === "learn") {
          finalizeLearnSession();
        } else {
          finalizeReviewSession();
        }
      }, 520);
      return;
    }

    window.setTimeout(() => {
      spellingIndex += 1;
      spellingInput.value = "";
      spellingFeedback.className = "spelling-feedback";
      spellingFeedback.textContent = dictionary.spellingReady;
      renderSpellingCard();
      saveProgress();
      spellingInput.focus();
    }, 420);
  });
}

function bindAddWordForm() {
  wordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveCustomWord();
  });

  saveWordButton?.addEventListener("click", async () => {
    if (!wordForm) {
      await saveCustomWord();
    }
  });

  autoFillButton?.addEventListener("click", async () => {
    await autofillWordForm({ silent: false });
  });
}

async function restoreState() {
  loadProgress();
  await fetchRemoteCustomItems();
  applyTranslations(currentLanguage);
  activatePage(activePageId);
  syncAddPreview();

  if (spellingActive && spellingQueueIds.length) {
    openModal(spellingModal);
    renderSpellingCard();
    window.setTimeout(() => spellingInput.focus(), 120);
  }

  saveProgress();
}

bindNavigation();
bindLanguageSwitch();
bindLearnActions();
bindReviewActions();
bindModals();
bindPreview();
bindAddWordForm();
bindPronunciation();
bindSpellingForm();
restoreState();

function getLocalizedCopy(value, lang = currentLanguage) {
  if (value && typeof value === "object") {
    return value[lang] || value.en || value.zh || "";
  }
  return typeof value === "string" ? value : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrentLearnItem() {
  const queue = getLearnQueueIds();
  if (!queue.length) {
    return null;
  }
  return getItemById(queue[Math.min(learnIndex, queue.length - 1)]);
}

function getCurrentReviewItem() {
  const queue = getReviewQueueIds();
  if (!queue.length) {
    return null;
  }
  return getItemById(queue[Math.min(reviewIndex, queue.length - 1)]);
}

function getCurrentSpellingItem() {
  if (!spellingActive || !spellingQueueIds.length) {
    return null;
  }
  return getItemById(spellingQueueIds[Math.min(spellingIndex, spellingQueueIds.length - 1)]);
}

function renderExampleBlock({ card, button, primary, secondary, example, expanded }) {
  if (!primary || !secondary) {
    return;
  }

  const dictionary = getDictionary();
  const english = getLocalizedCopy(example, "en");
  const chinese = getLocalizedCopy(example, "zh");

  primary.textContent = english || " ";
  secondary.textContent = chinese || dictionary.exampleFallbackTranslation;
  secondary.style.display = expanded && chinese ? "block" : "none";
  card?.classList.toggle("is-open", Boolean(expanded && chinese));

  if (button) {
    const action = expanded && chinese ? dictionary.hideTranslation : dictionary.showTranslation;
    button.innerHTML = `<span>${dictionary.exampleSentence}</span><span class="detail-action-copy">${action}</span>`;
  }
}

function renderMnemonicBlock({ primary, secondary, toggle, mnemonic, showEnglish }) {
  if (!primary || !secondary) {
    return;
  }

  const dictionary = getDictionary();
  const chinese = getLocalizedCopy(mnemonic, "zh");
  const english = getLocalizedCopy(mnemonic, "en");

  primary.textContent = chinese || dictionary.mnemonicFallbackChinese;
  secondary.textContent = english || dictionary.mnemonicFallbackEnglish;
  secondary.style.display = showEnglish && english ? "block" : "none";

  if (toggle) {
    toggle.textContent = showEnglish ? dictionary.showChineseHint : dictionary.showEnglishHint;
  }
}

function updatePronunciationButtonState(button, isPlaying) {
  if (!button) {
    return;
  }
  button.textContent = isPlaying ? getDictionary().playingVoice : getDictionary().playVoice;
}

function stopPronunciationPlayback() {
  if (activePronunciationAudio) {
    activePronunciationAudio.pause();
    activePronunciationAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function getPreferredSpeechVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return null;
  }

  return (
    voices.find((voice) => /^en-GB/i.test(voice.lang)) ||
    voices.find((voice) => /^en-/i.test(voice.lang)) ||
    voices.find((voice) => /english/i.test(voice.name)) ||
    null
  );
}

function speakWithBrowser(text) {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      reject(new Error("Speech synthesis unavailable"));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getPreferredSpeechVoice();
    utterance.lang = voice?.lang || "en-GB";
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis failed"));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function playPronunciationForItem(item, button) {
  if (!item?.text || !button) {
    return;
  }

  stopPronunciationPlayback();
  setButtonDisabled(button, true);
  updatePronunciationButtonState(button, true);

  try {
    if (item.audioUrl) {
      await new Promise((resolve, reject) => {
        const audio = new Audio(item.audioUrl);
        activePronunciationAudio = audio;
        audio.onended = () => {
          activePronunciationAudio = null;
          resolve();
        };
        audio.onerror = () => {
          activePronunciationAudio = null;
          reject(new Error("Audio playback failed"));
        };
        audio.play().catch(reject);
      });
    } else {
      await speakWithBrowser(item.text);
    }
  } catch {
    try {
      await speakWithBrowser(item.text);
    } catch {
      // Let the UI recover even if no voice source is available.
    }
  } finally {
    setButtonDisabled(button, false);
    updatePronunciationButtonState(button, false);
  }
}

function renderLearnCard() {
  let queue = getLearnQueueIds();

  if (!learnSessionIds.length) {
    learnSessionIds = [...queue];
    learnIndex = 0;
    queue = getLearnQueueIds();
  }

  const dictionary = getDictionary();
  if (!queue.length) {
    setWordPresentation(learnWord, {
      text: currentLanguage === "zh" ? "今日新词已完成" : "All new items done",
      kind: "word",
    });
    learnPhonetic.textContent = "";
    learnType.textContent = dictionary.wordType;
    learnPos.textContent = "-";
    learnCategory.textContent = currentLanguage === "zh" ? "稍作休息" : "Take a breath";
    learnDifficulty.textContent = currentLanguage === "zh" ? "已完成" : "Done";
    learnDefinition.textContent =
      currentLanguage === "zh"
        ? "当前没有新的单词或短语了，可以先去复习，或者稍后再回来。"
        : "There are no new words or phrases left right now. You can switch to review or come back later.";
    renderExampleBlock({
      card: learnExampleCard,
      button: learnExampleToggle,
      primary: learnExample,
      secondary: learnExampleTranslation,
      example: {
        en: "You can switch to review, or come back later.",
        zh: "你可以先去复习，或者稍后再回来。",
      },
      expanded: false,
    });
    renderMnemonicBlock({
      primary: learnMnemonic,
      secondary: learnMnemonicSecondary,
      toggle: learnMnemonicToggle,
      mnemonic: { zh: "", en: "" },
      showEnglish: false,
    });
    learnCounter.textContent = "0 / 0";
    learnProgressPercent.textContent = "100%";
    learnedCount.textContent = `${todayStats.newCompleted}`;
    leftCount.textContent = "0";
    learnEta.textContent = currentLanguage === "zh" ? "0 分钟" : "0 min";
    setButtonDisabled(learnComplete, true);
    setButtonDisabled(learnReviewLater, true);
    setButtonDisabled(learnStay, true);
    setButtonDisabled(playPronunciation, true);
    renderDashboard();
    return;
  }

  learnIndex = Math.min(learnIndex, queue.length - 1);
  const item = getItemById(queue[learnIndex]);
  const completed = learnIndex;
  const remaining = queue.length - learnIndex;
  const progress = Math.round((completed / queue.length) * 100);

  setButtonDisabled(learnComplete, false);
  setButtonDisabled(learnReviewLater, false);
  setButtonDisabled(learnStay, false);
  setButtonDisabled(playPronunciation, false);
  setWordPresentation(learnWord, item);
  learnPhonetic.textContent = item.phonetic;
  learnType.textContent = getTypeLabel(item.kind);
  learnPos.textContent = item.pos;
  learnCategory.textContent = getLocalizedCopy(item.category);
  learnDifficulty.textContent = getLocalizedCopy(item.difficulty);
  learnDefinition.textContent = getLocalizedCopy(item.meaning);
  renderExampleBlock({
    card: learnExampleCard,
    button: learnExampleToggle,
    primary: learnExample,
    secondary: learnExampleTranslation,
    example: item.example,
    expanded: learnExampleExpanded,
  });
  renderMnemonicBlock({
    primary: learnMnemonic,
    secondary: learnMnemonicSecondary,
    toggle: learnMnemonicToggle,
    mnemonic: item.mnemonic,
    showEnglish: learnMnemonicEnglishVisible,
  });
  learnCounter.textContent = `${learnIndex + 1} / ${queue.length}`;
  learnProgressPercent.textContent = `${progress}%`;
  learnedCount.textContent = `${completed}`;
  leftCount.textContent = `${remaining}`;
  learnEta.textContent = currentLanguage === "zh" ? `${remaining * 3} 分钟` : `${remaining * 3} min`;
  renderDashboard();
}

function buildReviewBackMarkup(item) {
  const dictionary = getDictionary();
  const exampleEn = escapeHtml(getLocalizedCopy(item.example, "en"));
  const exampleZh = escapeHtml(getLocalizedCopy(item.example, "zh"));
  const mnemonicZh = escapeHtml(getLocalizedCopy(item.mnemonic, "zh"));
  const mnemonicEn = escapeHtml(getLocalizedCopy(item.mnemonic, "en"));

  return `
    <div class="flashcard-panel">
      <p class="phonetic">${escapeHtml(item.phonetic || "")}</p>
      <p class="definition-text">${escapeHtml(getLocalizedCopy(item.meaning))}</p>
    </div>
    <div class="flashcard-panel detail-block ${reviewExampleExpanded && exampleZh ? "is-open" : ""}">
      <button class="detail-toggle" id="reviewExampleToggle" type="button">
        <span>${escapeHtml(dictionary.exampleSentence)}</span>
        <span class="detail-action-copy">${escapeHtml(
          reviewExampleExpanded && exampleZh ? dictionary.hideTranslation : dictionary.showTranslation
        )}</span>
      </button>
      <p class="detail-primary example-text">${exampleEn || "&nbsp;"}</p>
      <p class="detail-secondary translation-text" style="display:${reviewExampleExpanded && exampleZh ? "block" : "none"}">
        ${exampleZh || escapeHtml(dictionary.exampleFallbackTranslation)}
      </p>
    </div>
    <div class="flashcard-panel detail-block">
      <div class="detail-head">
        <span class="detail-label">${escapeHtml(dictionary.mnemonicLabel)}</span>
        <button class="text-button detail-switch" id="reviewMnemonicToggle" type="button">
          ${escapeHtml(reviewMnemonicEnglishVisible ? dictionary.showChineseHint : dictionary.showEnglishHint)}
        </button>
      </div>
      <p class="detail-primary mnemonic-text">${mnemonicZh || escapeHtml(dictionary.mnemonicFallbackChinese)}</p>
      <p class="detail-secondary" style="display:${reviewMnemonicEnglishVisible && mnemonicEn ? "block" : "none"}">
        ${mnemonicEn || escapeHtml(dictionary.mnemonicFallbackEnglish)}
      </p>
    </div>
  `;
}

function renderReviewCard() {
  let queue = getReviewQueueIds();

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...queue];
    reviewIndex = 0;
    queue = getReviewQueueIds();
  }

  if (!queue.length) {
    setWordPresentation(flashWord, {
      text: currentLanguage === "zh" ? "今天没有待复习单词" : "No reviews due now",
      kind: "word",
    });
    flashBack.innerHTML = `<p class="review-empty-state">${
      currentLanguage === "zh"
        ? "你已经完成当前复习，可以稍后回来，或者继续学习新词。"
        : "You're all caught up for now. Come back later, or start a new learning round."
    }</p>`;
    reviewCounter.textContent = "0 / 0";
    reviewFeedback.textContent =
      currentLanguage === "zh" ? "当前没有待复习内容。" : "No review items are due right now.";
    document.querySelectorAll(".mastery-button").forEach((button) => setButtonDisabled(button, true));
    setButtonDisabled(reviewPronunciation, true);
    renderDashboard();
    return;
  }

  reviewIndex = Math.min(reviewIndex, queue.length - 1);
  const item = getItemById(queue[reviewIndex]);

  document.querySelectorAll(".mastery-button").forEach((button) => setButtonDisabled(button, false));
  setButtonDisabled(reviewPronunciation, false);
  setWordPresentation(flashWord, item);
  flashBack.innerHTML = buildReviewBackMarkup(item);
  reviewCounter.textContent = `${reviewIndex + 1} / ${queue.length}`;
  flashcard.classList.remove("revealed");

  document.getElementById("reviewExampleToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    reviewExampleExpanded = !reviewExampleExpanded;
    renderReviewCard();
    flashcard.classList.add("revealed");
  });

  document.getElementById("reviewMnemonicToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    reviewMnemonicEnglishVisible = !reviewMnemonicEnglishVisible;
    renderReviewCard();
    flashcard.classList.add("revealed");
  });

  if (!reviewFeedback.dataset.userTouched) {
    reviewFeedback.textContent = getDictionary().waitingAnswer;
  }

  renderDashboard();
}

function showTranslationPopup(item, onDone) {
  const alternateLanguage = getAlternateLanguage(currentLanguage);

  translationWord.textContent = item.text;
  translationType.textContent = getTypeLabel(item.kind);
  translationPrimary.textContent = getLocalizedCopy(item.meaning);
  translationSecondary.textContent = getLocalizedCopy(item.meaning, alternateLanguage);
  openModal(translationModal);

  window.setTimeout(() => {
    closeModalById(translationModal);
    onDone?.();
  }, 1100);
}

function renderSpellingCard() {
  if (!spellingActive || !spellingQueueIds.length) {
    setButtonDisabled(spellingPronunciation, true);
    return;
  }

  spellingIndex = Math.min(spellingIndex, spellingQueueIds.length - 1);
  const item = getItemById(spellingQueueIds[spellingIndex]);
  const alternateLanguage = getAlternateLanguage(currentLanguage);
  const dictionary = getDictionary();

  spellingFlowLabel.textContent =
    spellingMode === "review" ? dictionary.spellingFlowReview : dictionary.spellingFlowLearn;
  spellingTitle.textContent = item.kind === "phrase" ? dictionary.spellThisPhrase : dictionary.spellThisWord;
  spellingType.textContent = getTypeLabel(item.kind);
  spellingPrompt.textContent = getLocalizedCopy(item.meaning);
  spellingHint.textContent = getLocalizedCopy(item.meaning, alternateLanguage);
  spellingPhonetic.textContent = item.phonetic;
  spellingModeHint.textContent =
    item.kind === "phrase" ? dictionary.spellingPhraseHint : dictionary.spellingWordHint;
  spellingProgress.textContent = `${spellingIndex + 1} / ${spellingQueueIds.length}`;
  spellingInput.placeholder =
    item.kind === "phrase" ? dictionary.spellingPlaceholderPhrase : dictionary.spellingPlaceholder;
  setButtonDisabled(spellingPronunciation, false);
}

function applyTranslations(lang) {
  const dictionary = translations[lang] || translations.en;

  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });

  updateLanguageButtons();
  updatePronunciationButtonState(playPronunciation, false);
  updatePronunciationButtonState(reviewPronunciation, false);
  updatePronunciationButtonState(spellingPronunciation, false);
  syncAddPreview();
  renderLearnCard();
  renderReviewCard();
  renderSpellingCard();
  renderDashboard();
}

function moveToNextLearnWord() {
  const queue = getLearnQueueIds();
  if (!queue.length) {
    return;
  }

  if (!learnSessionIds.length) {
    learnSessionIds = [...queue];
    learnIndex = 0;
  }

  if (learnIndex >= learnSessionIds.length - 1) {
    startSpellingSession("learn", learnSessionIds);
    return;
  }

  learnIndex += 1;
  recordActivity();
  renderLearnCard();
  saveProgress();
}

function handleReviewAction(level) {
  const queue = getReviewQueueIds();
  if (!queue.length || isReviewLocked) {
    return;
  }

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...queue];
    reviewIndex = 0;
  }

  isReviewLocked = true;
  const currentId = reviewSessionIds[reviewIndex];
  const currentItem = getItemById(currentId);
  const dictionary = getDictionary();
  const feedbackMap = {
    Know: dictionary.feedbackKnow,
    Vague: dictionary.feedbackVague,
    "Don't Know": dictionary.feedbackDontKnow,
  };

  scheduleAfterReview(currentId, level);
  recordActivity();
  todayStats.reviewCompleted += 1;
  reviewFeedback.textContent = feedbackMap[level] || dictionary.waitingAnswer;
  reviewFeedback.dataset.userTouched = "true";
  renderDashboard();
  saveProgress();

  showTranslationPopup(currentItem, () => {
    if (reviewIndex >= reviewSessionIds.length - 1) {
      startSpellingSession("review", reviewSessionIds);
      isReviewLocked = false;
      return;
    }

    reviewIndex += 1;
    reviewFeedback.dataset.userTouched = "";
    reviewExampleExpanded = false;
    reviewMnemonicEnglishVisible = false;
    renderReviewCard();
    isReviewLocked = false;
    saveProgress();
  });
}

function bindLearnActions() {
  learnComplete?.addEventListener("click", moveToNextLearnWord);
  learnReviewLater?.addEventListener("click", moveToNextLearnWord);
  learnStay?.addEventListener("click", () => {
    reviewFeedback.dataset.userTouched = "true";
    reviewFeedback.textContent = getDictionary().oneMoreLookFeedback;
  });
  learnExampleToggle?.addEventListener("click", () => {
    learnExampleExpanded = !learnExampleExpanded;
    renderLearnCard();
  });
  learnMnemonicToggle?.addEventListener("click", () => {
    learnMnemonicEnglishVisible = !learnMnemonicEnglishVisible;
    renderLearnCard();
  });
}

function syncAddPreview() {
  if (!previewWord) {
    return;
  }

  previewWord.textContent = inputWord?.value.trim() || " ";
  previewPhonetic.textContent = inputPhonetic?.value.trim() || " ";
  previewPos.textContent = inputPos?.value.trim() || "-";
  previewMeaning.textContent = inputMeaning?.value.trim() || " ";
  renderExampleBlock({
    card: previewExampleCard,
    button: previewExampleToggle,
    primary: previewExample,
    secondary: previewExampleTranslation,
    example: {
      en: inputExampleEn?.value.trim() || "",
      zh: inputExampleZh?.value.trim() || "",
    },
    expanded: previewExampleExpanded,
  });
  renderMnemonicBlock({
    primary: previewMnemonic,
    secondary: previewMnemonicSecondary,
    toggle: previewMnemonicToggle,
    mnemonic: {
      zh: inputMnemonicZh?.value.trim() || "",
      en: inputMnemonicEn?.value.trim() || "",
    },
    showEnglish: previewMnemonicEnglishVisible,
  });
  previewLexicon.textContent = getSelectedLexiconLabel();
}

function applyDraftToForm(draft) {
  if (!draft) {
    return;
  }

  const meaning =
    typeof draft.meaning === "string" ? draft.meaning : getLocalizedCopy(draft.meaning, "en");
  const exampleEn = draft.exampleEn || draft.example?.en || draft.example || "";
  const exampleZh = draft.exampleZh || draft.example?.zh || "";
  const mnemonicZh = draft.mnemonicZh || draft.mnemonic?.zh || "";
  const mnemonicEn = draft.mnemonicEn || draft.mnemonic?.en || draft.mnemonic || "";

  if (draft.phonetic) {
    inputPhonetic.value = draft.phonetic;
  }
  if (draft.pos) {
    inputPos.value = draft.pos;
  }
  if (meaning) {
    inputMeaning.value = meaning;
  }
  if (exampleEn) {
    inputExampleEn.value = exampleEn;
  }
  if (exampleZh) {
    inputExampleZh.value = exampleZh;
  }
  if (mnemonicZh) {
    inputMnemonicZh.value = mnemonicZh;
  }
  if (mnemonicEn) {
    inputMnemonicEn.value = mnemonicEn;
  }
  addDraftAudioUrl = draft.audioUrl || "";
  syncAddPreview();
}

async function autofillWordForm(options = {}) {
  const { silent = false } = options;
  const dictionary = getDictionary();
  const word = inputWord?.value.trim() || "";
  const currentRequestId = ++autofillRequestId;

  if (!word) {
    return false;
  }

  if (!silent) {
    setAddFeedback("", dictionary.autofillLoading);
  }
  setButtonDisabled(autoFillButton, true);

  try {
    const kind = detectKindFromText(word);
    let draft = null;

    try {
      draft = await fetchBackendEnrichmentDraft(word, kind);
    } catch {
      const seedItem = findSeedItemForWord(word);
      if (seedItem) {
        draft = {
          phonetic: seedItem.phonetic,
          pos: seedItem.pos,
          meaning: getLocalizedCopy(seedItem.meaning, "en"),
          exampleEn: getLocalizedCopy(seedItem.example, "en"),
          exampleZh: getLocalizedCopy(seedItem.example, "zh"),
          mnemonicEn: getLocalizedCopy(seedItem.mnemonic, "en"),
          mnemonicZh: getLocalizedCopy(seedItem.mnemonic, "zh"),
          audioUrl: seedItem.audioUrl || "",
        };
      } else if (kind === "word") {
        draft = await fetchDictionaryDraft(word);
      }
    }

    if (!draft) {
      throw new Error("No enrichment draft available");
    }

    if (currentRequestId !== autofillRequestId) {
      return false;
    }

    applyDraftToForm(draft);
    if (!silent) {
      setAddFeedback("success", dictionary.autofillReady);
    }
    return true;
  } catch {
    if (!silent) {
      setAddFeedback("error", dictionary.autofillFailed);
    }
    return false;
  } finally {
    if (currentRequestId === autofillRequestId) {
      setButtonDisabled(autoFillButton, false);
    }
  }
}

function buildCustomItemFromForm() {
  const text = inputWord?.value.trim() || "";
  const meaning = inputMeaning?.value.trim() || "";

  if (!text || !meaning) {
    return null;
  }

  const lexiconKey = inputLexicon?.value || "graduate";
  const kind =
    /\bphrase\b/i.test(inputPos?.value.trim() || "") ? "phrase" : detectKindFromText(text);
  const slug = normalizeText(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = `custom-${slug || Date.now()}`;
  const lexiconMeta = getLexiconMeta(lexiconKey);
  const posValue = inputPos?.value.trim() || (kind === "phrase" ? "phrase" : "n.");

  return {
    id,
    text,
    kind,
    phonetic: inputPhonetic?.value.trim() || "",
    pos: posValue,
    category: { ...lexiconMeta.category },
    difficulty: { ...lexiconMeta.difficulty },
    meaning: { en: meaning, zh: meaning },
    example: {
      en: inputExampleEn?.value.trim() || "",
      zh: inputExampleZh?.value.trim() || "",
    },
    mnemonic: {
      en: inputMnemonicEn?.value.trim() || "",
      zh: inputMnemonicZh?.value.trim() || "",
    },
    audioUrl: addDraftAudioUrl || "",
    lexiconKey,
    createdAt: Date.now(),
    isCustom: true,
  };
}

async function saveCustomWord() {
  if (inputWord?.value.trim() && !inputMeaning?.value.trim()) {
    setAddFeedback("", getDictionary().autofillSavePending);
    await autofillWordForm({ silent: false });
  }

  const item = buildCustomItemFromForm();

  if (!item) {
    setAddFeedback(
      "error",
      currentLanguage === "zh"
        ? "请先填写单词或短语，以及对应释义。"
        : "Please fill in the word or phrase and its meaning first."
    );
    return;
  }

  let persistedItem = item;
  let alreadyExists = false;

  try {
    const payload = await saveItemToBackend(item);
    if (payload?.item) {
      persistedItem = sanitizeCustomItem(payload.item) || item;
      alreadyExists = payload.created === false;
    }
  } catch {
    alreadyExists = itemMap.has(item.id);
    if (alreadyExists) {
      setAddFeedback(
        "error",
        currentLanguage === "zh"
          ? "这个词条已经在当前词库里了。"
          : "This item already exists in your current lexicon."
      );
      return;
    }
  }

  if (alreadyExists) {
    upsertCustomItem(persistedItem);
    if (!itemStates[persistedItem.id]) {
      itemStates[persistedItem.id] = {
        status: "new",
        level: 0,
        dueAt: null,
        lastReviewedAt: null,
        lastResult: null,
      };
    }
    setAddFeedback(
      "success",
      currentLanguage === "zh"
        ? "这个词条已经存在，已同步到当前学习列表。"
        : "This item already exists and has been synced into your current study list."
    );
    renderDashboard();
    renderLearnCard();
    saveProgress();
    return;
  }

  upsertCustomItem(persistedItem);
  itemStates[persistedItem.id] = {
    status: "new",
    level: 0,
    dueAt: null,
    lastReviewedAt: null,
    lastResult: null,
  };
  resetLearnQueueForNewItem(persistedItem.id);
  setAddFeedback(
    "success",
    currentLanguage === "zh"
      ? backendStatus.available
        ? "已通过后端写入词库，正在进入学习页。"
        : "已保存到本地词库，正在进入学习页。"
      : backendStatus.available
        ? "Saved to the backend lexicon. Opening Learn now."
        : "Saved locally. Opening Learn now."
  );
  renderDashboard();
  renderLearnCard();
  saveProgress();

  window.setTimeout(() => {
    activatePage("learn");
    setAddFeedback("", "");
  }, 220);
}

function bindPreview() {
  previewBindings.forEach(([inputId, previewId]) => {
    const input = document.getElementById(inputId);

    if (!input || !document.getElementById(previewId)) {
      return;
    }

    input.addEventListener("input", syncAddPreview);
  });
  inputLexicon?.addEventListener("change", syncAddPreview);
  previewExampleToggle?.addEventListener("click", () => {
    previewExampleExpanded = !previewExampleExpanded;
    syncAddPreview();
  });
  previewMnemonicToggle?.addEventListener("click", () => {
    previewMnemonicEnglishVisible = !previewMnemonicEnglishVisible;
    syncAddPreview();
  });

  inputWord?.addEventListener("input", () => {
    addDraftAudioUrl = "";
    if (autofillTimer) {
      window.clearTimeout(autofillTimer);
    }

    const word = inputWord.value.trim();
    if (!canUseAutoFill(word)) {
      return;
    }

    autofillTimer = window.setTimeout(() => {
      autofillWordForm({ silent: true });
    }, 700);
  });

  inputWord?.addEventListener("blur", () => {
    const word = inputWord.value.trim();
    if (canUseAutoFill(word) && !inputMeaning?.value.trim()) {
      autofillWordForm({ silent: false });
    }
  });
}

function bindPronunciation() {
  playPronunciation?.addEventListener("click", () => {
    playPronunciationForItem(getCurrentLearnItem(), playPronunciation);
  });
  reviewPronunciation?.addEventListener("click", () => {
    playPronunciationForItem(getCurrentReviewItem(), reviewPronunciation);
  });
  spellingPronunciation?.addEventListener("click", () => {
    playPronunciationForItem(getCurrentSpellingItem(), spellingPronunciation);
  });

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      getPreferredSpeechVoice();
    };
  }
}

function normalizeText(text) {
  return (text || "").toLowerCase().trim().replace(/\s+/g, " ").replace(/[’]/g, "'");
}

Object.assign(translations.en, {
  focusModeLabel: "Focus Mode",
  fullModeLabel: "Full Mode",
  homeAddWord: "Add Word",
  focusHeroEyebrow: "Quiet Focus Mode",
  focusHeroTitle: "Just learn, review, and keep the rhythm.",
  focusHeroBody: "A simplified study shell built for deep concentration and fewer decisions.",
  fullHeroEyebrow: "Warm Focus Space",
  fullHeroTitle: "Learn with calm. Remember with depth.",
  fullHeroBody:
    "A memory-first English word app with quiet visuals, soft feedback, and a daily study rhythm built for long-term retention.",
  focusHeaderTitle: "Enter a simpler study rhythm.",
  fullHeaderTitle: "Build a calmer memory rhythm.",
  customLexiconEyebrow: "Custom Lexicon",
  customLexiconTitle: "Create a new study set",
  lexiconNameLabel: "Lexicon name",
  saveLexiconButton: "Save Lexicon",
  lexiconNameRequired: "Please enter a lexicon name first.",
  lexiconCreateSuccess: "Lexicon created. It is now available in Add Word.",
  lexiconCreateExists: "This lexicon already exists and is ready to use.",
  lexiconCreateFailed: "Couldn't create the lexicon right now. Please try again.",
  lexiconNeedsBackend: "Lexicon creation needs the local backend to be running.",
  lexiconOpenDetail: "Open Lexicon",
  deleteLexiconButton: "Delete Lexicon",
  deleteLexiconConfirm: "Delete this custom lexicon and all words inside it?",
  deleteLexiconSuccess: "Lexicon deleted.",
  deleteLexiconFailed: "Couldn't delete this lexicon right now.",
  lexiconLoading: "Loading lexicon items...",
  lexiconItemsLabel: "Items",
  noLexiconItemsYet: "No words yet. Add a new word into this lexicon to start building it.",
  noSystemLexiconItemsYet: "This system lexicon is ready, but no official word list has been imported yet.",
  lexiconSourceSystem: "System Lexicon",
  lexiconSourceCustom: "Custom Lexicon",
  studySelectionEyebrow: "Study Selection",
  studySelectionTitle: "Choose lexicons for today",
  studySelectionBody: "Your lexicon list updates here after you create a new study set.",
  selectedLexiconSingle: "Focused on {name}",
  selectedLexiconMultiple: "{count} lexicons available",
});

Object.assign(translations.zh, {
  focusModeLabel: "沉浸模式",
  fullModeLabel: "完整模式",
  homeAddWord: "添加单词",
  focusHeroEyebrow: "沉浸专注模式",
  focusHeroTitle: "只保留学习、复习与节奏本身。",
  focusHeroBody: "把页面收拢成更安静的学习壳层，让注意力只留给记忆本身。",
  fullHeroEyebrow: "沉浸专注空间",
  fullHeroTitle: "安静学习，深度记住。",
  fullHeroBody:
    "一款以记忆节奏为核心的英语单词应用，用沉浸画面、温和反馈和日常学习流，帮助你更长期地记住词汇。",
  focusHeaderTitle: "进入更纯粹的学习节奏。",
  fullHeaderTitle: "建立更平静的记忆节奏。",
  customLexiconEyebrow: "自定义词库",
  customLexiconTitle: "创建新的学习词库",
  lexiconNameLabel: "词库名称",
  saveLexiconButton: "保存词库",
  lexiconNameRequired: "请先输入词库名称。",
  lexiconCreateSuccess: "词库已创建，现在可以在添加单词页直接选择它。",
  lexiconCreateExists: "这个词库已经存在，已经可以直接使用。",
  lexiconCreateFailed: "暂时无法创建词库，请稍后再试。",
  lexiconNeedsBackend: "创建词库需要本地后端正在运行。",
  lexiconOpenDetail: "打开词库",
  deleteLexiconButton: "删除词库",
  deleteLexiconConfirm: "确定要删除这个自定义词库以及其中的全部词条吗？",
  deleteLexiconSuccess: "词库已删除。",
  deleteLexiconFailed: "暂时无法删除这个词库。",
  lexiconLoading: "正在加载词库内容...",
  lexiconItemsLabel: "词条数",
  noLexiconItemsYet: "这个词库还没有单词。先把新词添加进来，它就会开始生长。",
  noSystemLexiconItemsYet: "这个系统词库已经准备好，但正式词表还没有导入。",
  lexiconSourceSystem: "系统词库",
  lexiconSourceCustom: "自定义词库",
  studySelectionEyebrow: "学习选择",
  studySelectionTitle: "今天想学哪些词库",
  studySelectionBody: "新建词库后，这里的词库列表也会同步更新。",
  selectedLexiconSingle: "当前聚焦：{name}",
  selectedLexiconMultiple: "当前共有 {count} 个可选词库",
});

let uiMode = "full";
let lexiconRecords = [];
let selectedLearnLexiconId = "system-graduate";
let activeLexiconDetailId = "";
let lexiconDetailItemsCache = new Map();

const SYSTEM_FALLBACK_LEXICONS = [
  {
    id: "system-graduate",
    key: "graduate",
    slug: "graduate",
    name: { en: "Graduate Exam", zh: "考研词汇" },
    description: {
      en: "Preparation lexicon for postgraduate entrance exam reading and writing.",
      zh: "面向考研阅读与写作的系统词库。",
    },
    scope: "system",
  },
  {
    id: "system-cet4",
    key: "cet4",
    slug: "cet4",
    name: { en: "CET-4", zh: "四级词汇" },
    description: {
      en: "Core college English words for CET-4 preparation.",
      zh: "面向大学英语四级的核心词汇。",
    },
    scope: "system",
  },
  {
    id: "system-cet6",
    key: "cet6",
    slug: "cet6",
    name: { en: "CET-6", zh: "六级词汇" },
    description: {
      en: "Higher-frequency exam words for CET-6 review and retention.",
      zh: "面向大学英语六级的高频词汇。",
    },
    scope: "system",
  },
  {
    id: "system-ielts",
    key: "ielts",
    slug: "ielts",
    name: { en: "IELTS", zh: "雅思词汇" },
    description: {
      en: "Useful words and phrases for IELTS speaking and writing.",
      zh: "用于雅思口语与写作训练的词汇与短语。",
    },
    scope: "system",
  },
];

const FOCUS_MODE_ALLOWED_TARGETS = new Set(["home", "learn", "review", "add"]);
const focusModeButton = document.getElementById("focusModeButton");
const fullModeButton = document.getElementById("fullModeButton");
const createLexiconButton = document.getElementById("createLexiconButton");
const lexiconCreatePanel = document.getElementById("lexiconCreatePanel");
const saveLexiconButton = document.getElementById("saveLexiconButton");
const newLexiconName = document.getElementById("newLexiconName");
const lexiconFeedback = document.getElementById("lexiconFeedback");
const lexiconGrid = document.getElementById("lexiconGrid");
const lexiconDetailModal = document.getElementById("lexiconDetailModal");
const lexiconDetailEyebrow = document.getElementById("lexiconDetailEyebrow");
const lexiconDetailTitle = document.getElementById("lexiconDetailTitle");
const lexiconDetailDescription = document.getElementById("lexiconDetailDescription");
const lexiconDetailNewCount = document.getElementById("lexiconDetailNewCount");
const lexiconDetailReviewCount = document.getElementById("lexiconDetailReviewCount");
const lexiconDetailItemCount = document.getElementById("lexiconDetailItemCount");
const lexiconItemsList = document.getElementById("lexiconItemsList");
const closeLexiconDetail = document.getElementById("closeLexiconDetail");
const deleteLexiconButton = document.getElementById("deleteLexiconButton");
const learnLexiconFilters = document.getElementById("learnLexiconFilters");
const learnSourceLabel = document.getElementById("learnSourceLabel");
const studySelectionSummary = document.getElementById("studySelectionSummary");
const homeHeroEyebrowElement = document.querySelector("#home .hero-copy .eyebrow");
const homeHeroTitleElement = document.querySelector("#home .hero-copy h3");
const homeHeroBodyElement = document.querySelector("#home .hero-copy .muted");
const headerTitleElement = document.querySelector(".topbar h2[data-i18n='headerTitle']");
const accessTipBar = document.getElementById("accessTipBar");
const accessTipTitle = document.getElementById("accessTipTitle");
const accessTipBody = document.getElementById("accessTipBody");

function normalizeLexiconRecord(rawLexicon) {
  if (!rawLexicon || typeof rawLexicon !== "object") {
    return null;
  }

  const id = (rawLexicon.id || rawLexicon.key || rawLexicon.slug || "").trim();
  const key = (rawLexicon.key || rawLexicon.slug || rawLexicon.id || "").trim();

  if (!id || !key) {
    return null;
  }

  return {
    id,
    key,
    slug: (rawLexicon.slug || key).trim(),
    name: sanitizeLocalizedField(rawLexicon.name, key),
    description: sanitizeLocalizedField(rawLexicon.description, ""),
    scope: rawLexicon.scope || (id.startsWith("system-") ? "system" : "custom"),
    itemCount: Number.isFinite(rawLexicon.itemCount) ? rawLexicon.itemCount : 0,
  };
}

function getAvailableLexicons() {
  return lexiconRecords.length ? lexiconRecords : SYSTEM_FALLBACK_LEXICONS.map(normalizeLexiconRecord).filter(Boolean);
}

function getLexiconRecord(value) {
  const normalizedValue = (value || "").trim();
  return (
    getAvailableLexicons().find((lexicon) => lexicon.id === normalizedValue || lexicon.key === normalizedValue) || null
  );
}

function getLexiconName(lexicon, lang = currentLanguage) {
  return getLocalizedCopy(lexicon?.name, lang) || lexicon?.key || "";
}

function getLexiconDescription(lexicon, lang = currentLanguage) {
  return getLocalizedCopy(lexicon?.description, lang) || "";
}

function getLexiconItemBelongs(item, lexicon) {
  if (!item || !lexicon) {
    return false;
  }

  if (item.lexiconId && item.lexiconId === lexicon.id) {
    return true;
  }

  if (item.lexiconKey && item.lexiconKey === lexicon.key) {
    return true;
  }

  if (!item.lexiconId && !item.lexiconKey && lexicon.key === "graduate") {
    return true;
  }

  return false;
}

function getLexiconItemsLocal(lexicon) {
  return allItems.filter((item) => getLexiconItemBelongs(item, lexicon));
}

function getLexiconStats(lexicon) {
  const items = getLexiconItemsLocal(lexicon);
  const now = Date.now();
  const newCount = items.filter((item) => {
    const state = itemStates[item.id];
    return !state || state.status === "new";
  }).length;
  const reviewCount = items.filter((item) => {
    const state = itemStates[item.id];
    return state?.status === "review" && (state.dueAt || 0) <= now;
  }).length;

  return {
    items,
    itemCount: Math.max(items.length, Number(lexicon?.itemCount) || 0),
    newCount,
    reviewCount,
  };
}

function normalizeRemoteLexiconItem(rawItem, lexicon) {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const text = (rawItem.text || "").trim();
  if (!text) {
    return null;
  }

  return {
    id: rawItem.id || `${lexicon.id}-${normalizeText(text).replace(/[^a-z0-9]+/g, "-")}`,
    text,
    phonetic: rawItem.phonetic || "",
    pos: rawItem.pos || "",
    meaning: rawItem.meaning || { en: "", zh: "" },
    lexiconId: rawItem.lexiconId || lexicon.id,
    lexiconKey: rawItem.lexiconKey || lexicon.key,
  };
}

async function fetchLexiconItemsForDetail(lexicon) {
  const cacheKey = lexicon.id;
  if (lexiconDetailItemsCache.has(cacheKey)) {
    return lexiconDetailItemsCache.get(cacheKey) || [];
  }

  const available = await checkBackendAvailability();
  if (!available) {
    return getLexiconItemsLocal(lexicon);
  }

  try {
    const path =
      lexicon.scope === "system"
        ? `/lexicons/${encodeURIComponent(lexicon.id)}/items`
        : `/items?lexicon_id=${encodeURIComponent(lexicon.id)}`;
    const payload = await apiRequest(path, { method: "GET" });
    const items = Array.isArray(payload.items)
      ? payload.items.map((item) => normalizeRemoteLexiconItem(item, lexicon)).filter(Boolean)
      : [];
    lexiconDetailItemsCache.set(cacheKey, items);
    return items;
  } catch {
    return getLexiconItemsLocal(lexicon);
  }
}

function setLexiconFeedback(type, message) {
  if (!lexiconFeedback) {
    return;
  }

  lexiconFeedback.className = `editor-feedback${type ? ` ${type}` : ""}`;
  lexiconFeedback.textContent = message || "";
}

function renderLearnLexiconFilters() {
  if (!learnLexiconFilters) {
    return;
  }

  const dictionary = getDictionary();
  const lexicons = getAvailableLexicons();

  if (!selectedLearnLexiconId || !getLexiconRecord(selectedLearnLexiconId)) {
    selectedLearnLexiconId = lexicons[0]?.id || "system-graduate";
  }

  learnLexiconFilters.innerHTML = "";
  lexicons.forEach((lexicon) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `toggle-pill${selectedLearnLexiconId === lexicon.id ? " active" : ""}`;
    button.textContent = getLexiconName(lexicon);
    button.addEventListener("click", () => {
      selectedLearnLexiconId = lexicon.id;
      renderLearnLexiconFilters();
    });
    learnLexiconFilters.appendChild(button);
  });

  const selected = getLexiconRecord(selectedLearnLexiconId);
  if (learnSourceLabel && selected) {
    learnSourceLabel.textContent = getLexiconName(selected);
  }

  if (studySelectionSummary) {
    if (selected) {
      studySelectionSummary.textContent = dictionary.selectedLexiconSingle.replace("{name}", getLexiconName(selected));
    } else {
      studySelectionSummary.textContent = dictionary.selectedLexiconMultiple.replace("{count}", String(lexicons.length));
    }
  }
}

function renderLexiconOptions() {
  if (!inputLexicon) {
    return;
  }

  const lexicons = getAvailableLexicons();
  const currentValue = inputLexicon.value;
  inputLexicon.innerHTML = "";

  lexicons.forEach((lexicon) => {
    const option = document.createElement("option");
    option.value = lexicon.id;
    option.textContent = getLexiconName(lexicon);
    inputLexicon.appendChild(option);
  });

  const selected = getLexiconRecord(currentValue) || getLexiconRecord(selectedLearnLexiconId) || lexicons[0];
  if (selected) {
    inputLexicon.value = selected.id;
  }

  syncAddPreview();
  renderLearnLexiconFilters();
}

function renderLexiconGrid() {
  if (!lexiconGrid) {
    return;
  }

  const dictionary = getDictionary();
  const lexicons = getAvailableLexicons();

  if (!lexicons.length) {
    lexiconGrid.innerHTML = `
      <article class="lexicon-card glass">
        <p class="eyebrow">${dictionary.lexiconSpace}</p>
        <h4>${dictionary.yourStudySets}</h4>
        <p>${dictionary.noLexiconItemsYet}</p>
      </article>
    `;
    return;
  }

  lexiconGrid.innerHTML = lexicons
    .map((lexicon) => {
      const stats = getLexiconStats(lexicon);
      const scopeLabel =
        lexicon.scope === "system" ? dictionary.lexiconSourceSystem : dictionary.lexiconSourceCustom;
      return `
        <article class="lexicon-card glass" data-lexicon-id="${lexicon.id}">
          <div class="lexicon-card-head">
            <p class="eyebrow">${scopeLabel}</p>
            <span class="status-badge ${stats.reviewCount ? "accent" : ""}">${stats.reviewCount} ${dictionary.reviews}</span>
          </div>
          <h4>${getLexiconName(lexicon)}</h4>
          <p>${getLexiconDescription(lexicon) || dictionary.studySelectionBody}</p>
          <div class="lexicon-card-meta">
            <span><strong>${stats.itemCount}</strong> ${dictionary.lexiconItemsLabel}</span>
            <span><strong>${stats.newCount}</strong> ${dictionary.newWords}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function renderLexiconDetail(lexiconId) {
  const dictionary = getDictionary();
  const lexicon = getLexiconRecord(lexiconId);

  if (!lexicon || !lexiconDetailModal) {
    return;
  }

  activeLexiconDetailId = lexiconId;
  const stats = getLexiconStats(lexicon);
  lexiconDetailEyebrow.textContent =
    lexicon.scope === "system" ? dictionary.lexiconSourceSystem : dictionary.lexiconSourceCustom;
  lexiconDetailTitle.textContent = getLexiconName(lexicon);
  lexiconDetailDescription.textContent = getLexiconDescription(lexicon) || dictionary.studySelectionBody;
  lexiconDetailNewCount.textContent = String(stats.newCount);
  lexiconDetailReviewCount.textContent = String(stats.reviewCount);
  lexiconDetailItemCount.textContent = String(stats.itemCount);
  deleteLexiconButton?.classList.toggle("hidden", lexicon.scope === "system");
  lexiconItemsList.innerHTML = `<div class="lexicon-empty">${dictionary.lexiconLoading}</div>`;

  if (typeof openModal === "function") {
    openModal(lexiconDetailModal);
  } else {
    lexiconDetailModal.setAttribute("aria-hidden", "false");
  }

  const detailItems = await fetchLexiconItemsForDetail(lexicon);
  if (activeLexiconDetailId !== lexiconId) {
    return;
  }

  const displayCount = Math.max(detailItems.length, Number(lexicon.itemCount) || 0);
  lexiconDetailItemCount.textContent = String(displayCount);

  if (!detailItems.length) {
    lexiconItemsList.innerHTML = `
      <div class="lexicon-empty">
        ${lexicon.scope === "system" ? dictionary.noSystemLexiconItemsYet : dictionary.noLexiconItemsYet}
      </div>
    `;
    return;
  }

  lexiconItemsList.innerHTML = detailItems
    .map((item) => {
      const meaning = getLocalizedCopy(item.meaning, "zh") || getLocalizedCopy(item.meaning, "en");
      return `
        <div class="lexicon-item-row">
          <div class="lexicon-item-main">
            <strong>${item.text}</strong>
            <span>${item.phonetic || ""}</span>
          </div>
          <div class="lexicon-item-meta">
            <span>${item.pos || ""}</span>
            <span>${meaning}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

async function refreshLexiconRecords() {
  try {
    const available = await checkBackendAvailability();
    if (available) {
      const payload = await apiRequest("/lexicons", { method: "GET" });
      const remoteLexicons = Array.isArray(payload.lexicons)
        ? payload.lexicons.map(normalizeLexiconRecord).filter(Boolean)
        : [];
      lexiconRecords = remoteLexicons.length
        ? remoteLexicons
        : SYSTEM_FALLBACK_LEXICONS.map(normalizeLexiconRecord).filter(Boolean);
    } else {
      lexiconRecords = SYSTEM_FALLBACK_LEXICONS.map(normalizeLexiconRecord).filter(Boolean);
    }
  } catch {
    lexiconRecords = SYSTEM_FALLBACK_LEXICONS.map(normalizeLexiconRecord).filter(Boolean);
  }

  lexiconDetailItemsCache.clear();
  renderLexiconGrid();
  renderLexiconOptions();
}

async function createLexiconFromInput() {
  const dictionary = getDictionary();
  const name = newLexiconName?.value.trim() || "";

  if (!name) {
    setLexiconFeedback("error", dictionary.lexiconNameRequired);
    return;
  }

  setButtonDisabled(saveLexiconButton, true);
  setLexiconFeedback("", "");

  try {
    const available = await checkBackendAvailability();
    if (!available) {
      throw new Error("backend-unavailable");
    }

    const payload = await apiRequest("/lexicons", {
      method: "POST",
      body: JSON.stringify({
        lexicon: {
          name,
          nameZh: name,
          description: "",
          descriptionZh: "",
        },
      }),
    });

    const record = normalizeLexiconRecord(payload.lexicon);
    if (record) {
      const existingIndex = lexiconRecords.findIndex((lexicon) => lexicon.id === record.id);
      if (existingIndex >= 0) {
        lexiconRecords.splice(existingIndex, 1, record);
      } else {
        lexiconRecords.push(record);
      }
      inputLexicon.value = record.id;
      selectedLearnLexiconId = record.id;
    }

    renderLexiconGrid();
    renderLexiconOptions();
    syncAddPreview();
    newLexiconName.value = "";
    lexiconCreatePanel?.classList.add("hidden");
    setLexiconFeedback("success", payload.created === false ? dictionary.lexiconCreateExists : dictionary.lexiconCreateSuccess);
  } catch (error) {
    const message = String(error?.message || "");
    setLexiconFeedback("error", message.includes("backend-unavailable") ? dictionary.lexiconNeedsBackend : dictionary.lexiconCreateFailed);
  } finally {
    setButtonDisabled(saveLexiconButton, false);
  }
}

async function deleteActiveLexicon() {
  const dictionary = getDictionary();
  const lexicon = getLexiconRecord(activeLexiconDetailId);

  if (!lexicon || lexicon.scope === "system") {
    return;
  }

  const confirmed = window.confirm(dictionary.deleteLexiconConfirm);
  if (!confirmed) {
    return;
  }

  setButtonDisabled(deleteLexiconButton, true);
  try {
    await apiRequest(`/lexicons/${encodeURIComponent(lexicon.id)}`, { method: "DELETE" });
    lexiconRecords = lexiconRecords.filter((entry) => entry.id !== lexicon.id);
    lexiconDetailItemsCache.delete(lexicon.id);
    activeLexiconDetailId = "";
    setLexiconFeedback("success", dictionary.deleteLexiconSuccess);
    if (typeof closeModalById === "function") {
      closeModalById(lexiconDetailModal);
    } else {
      lexiconDetailModal?.setAttribute("aria-hidden", "true");
    }
    await refreshLexiconRecords();
    applyTranslations(currentLanguage);
  } catch {
    setLexiconFeedback("error", dictionary.deleteLexiconFailed);
  } finally {
    setButtonDisabled(deleteLexiconButton, false);
  }
}

function getSafeTargetId(targetId) {
  if (uiMode === "focus" && !FOCUS_MODE_ALLOWED_TARGETS.has(targetId)) {
    return "home";
  }
  return targetId;
}

function renderUiMode() {
  const dictionary = getDictionary();
  const isFocusMode = uiMode === "focus";
  document.body.classList.toggle("focus-mode", isFocusMode);

  focusModeButton?.classList.toggle("active", isFocusMode);
  fullModeButton?.classList.toggle("active", !isFocusMode);

  document.querySelectorAll(".nav-item[data-target]").forEach((button) => {
    const shouldHide =
      isFocusMode && !FOCUS_MODE_ALLOWED_TARGETS.has(button.dataset.target || "");
    button.classList.toggle("mode-hidden", shouldHide);
  });

  if (homeHeroEyebrowElement) {
    homeHeroEyebrowElement.textContent = isFocusMode ? dictionary.focusHeroEyebrow : dictionary.fullHeroEyebrow;
  }
  if (homeHeroTitleElement) {
    homeHeroTitleElement.textContent = isFocusMode ? dictionary.focusHeroTitle : dictionary.fullHeroTitle;
  }
  if (homeHeroBodyElement) {
    homeHeroBodyElement.textContent = isFocusMode ? dictionary.focusHeroBody : dictionary.fullHeroBody;
  }
  if (headerTitleElement) {
    headerTitleElement.textContent = isFocusMode ? dictionary.focusHeaderTitle : dictionary.fullHeaderTitle;
  }

  if (isFocusMode && !FOCUS_MODE_ALLOWED_TARGETS.has(activePageId)) {
    originalActivatePage("home");
  }
}

const originalApplyTranslations = applyTranslations;
applyTranslations = function patchedApplyTranslations(lang) {
  originalApplyTranslations(lang);
  renderUiMode();
  renderAccessTip();
  renderLexiconGrid();
  renderLexiconOptions();
  if (activeLexiconDetailId && lexiconDetailModal?.getAttribute("aria-hidden") === "false") {
    renderLexiconDetail(activeLexiconDetailId);
  }
};

const originalActivatePage = activatePage;
activatePage = function patchedActivatePage(targetId) {
  originalActivatePage(getSafeTargetId(targetId));
  renderUiMode();
};

function buildCustomItemFromForm() {
  const text = inputWord?.value.trim() || "";
  const meaning = inputMeaning?.value.trim() || "";

  if (!text || !meaning) {
    return null;
  }

  const selectedLexicon = getLexiconRecord(inputLexicon?.value || "") || getLexiconRecord("system-graduate");
  const kind =
    /\bphrase\b/i.test(inputPos?.value.trim() || "") ? "phrase" : detectKindFromText(text);
  const slug = normalizeText(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const id = `custom-${slug || Date.now()}`;
  const lexiconMeta = getLexiconMeta(selectedLexicon?.key || "graduate");
  const posValue = inputPos?.value.trim() || (kind === "phrase" ? "phrase" : "n.");

  return {
    id,
    text,
    kind,
    phonetic: inputPhonetic?.value.trim() || "",
    pos: posValue,
    category: { ...lexiconMeta.category },
    difficulty: { ...lexiconMeta.difficulty },
    meaning: { en: meaning, zh: meaning },
    example: {
      en: inputExampleEn?.value.trim() || "",
      zh: inputExampleZh?.value.trim() || "",
    },
    mnemonic: {
      en: inputMnemonicEn?.value.trim() || "",
      zh: inputMnemonicZh?.value.trim() || "",
    },
    audioUrl: addDraftAudioUrl || "",
    lexiconKey: selectedLexicon?.key || "graduate",
    lexiconId: selectedLexicon?.id || "system-graduate",
    createdAt: Date.now(),
    isCustom: true,
  };
}

function bindUiModeAndLexicons() {
  if (!focusModeButton?.dataset.boundMode) {
    focusModeButton?.addEventListener("click", () => {
      uiMode = "focus";
      renderUiMode();
    });
    fullModeButton?.addEventListener("click", () => {
      uiMode = "full";
      renderUiMode();
    });
    focusModeButton.dataset.boundMode = "true";
  }

  if (!createLexiconButton?.dataset.boundLexicon) {
    createLexiconButton?.addEventListener("click", () => {
      lexiconCreatePanel?.classList.toggle("hidden");
      setLexiconFeedback("", "");
      if (!lexiconCreatePanel?.classList.contains("hidden")) {
        window.setTimeout(() => newLexiconName?.focus(), 90);
      }
    });

    saveLexiconButton?.addEventListener("click", () => {
      createLexiconFromInput();
    });

    newLexiconName?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        createLexiconFromInput();
      }
    });

    lexiconGrid?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-lexicon-id]");
      if (!card) {
        return;
      }
      renderLexiconDetail(card.dataset.lexiconId);
    });

    closeLexiconDetail?.addEventListener("click", () => {
      activeLexiconDetailId = "";
      if (typeof closeModalById === "function") {
        closeModalById(lexiconDetailModal);
      } else {
        lexiconDetailModal?.setAttribute("aria-hidden", "true");
      }
    });

    deleteLexiconButton?.addEventListener("click", () => {
      deleteActiveLexicon();
    });

    lexiconDetailModal?.addEventListener("click", (event) => {
      if (event.target === lexiconDetailModal) {
        activeLexiconDetailId = "";
        if (typeof closeModalById === "function") {
          closeModalById(lexiconDetailModal);
        } else {
          lexiconDetailModal?.setAttribute("aria-hidden", "true");
        }
      }
    });

    createLexiconButton.dataset.boundLexicon = "true";
  }
}

(async function initializeModeAndLexicons() {
  bindUiModeAndLexicons();
  await checkBackendAvailability();
  await refreshLexiconRecords();
  applyTranslations(currentLanguage);
})();

Object.assign(translations.en, {
  startLearningNow: "Start Learning",
  backToStudySelection: "Change Lexicons",
  resumeSpelling: "Resume Spelling",
  exitSpelling: "Exit",
  spellingAidButton: "Play Pronunciation Help",
  dontKnow: "Forgot",
  feedbackKnow: "Known. The next review will be spaced further away.",
  feedbackVague: "Marked vague. This word will come back sooner.",
  feedbackDontKnow: "Marked forgotten. Review will return very soon.",
  learnSelectionReady: "Choose your lexicons and today's target, then start a focused learning round.",
  learnSelectionEmpty: "No new words match the current lexicon choice yet.",
  learnSelectionCount: "{count} new words ready for today.",
  learnSessionDone: "Today's new-word session is complete.",
});

Object.assign(translations.zh, {
  startLearningNow: "开始学习",
  backToStudySelection: "切换词库",
  resumeSpelling: "继续拼写",
  exitSpelling: "退出",
  spellingAidButton: "播放发音提示",
  dontKnow: "忘记了",
  feedbackKnow: "已标记为认识，下一次复习会更靠后。",
  feedbackVague: "已标记为模糊，这个词会更快回来。",
  feedbackDontKnow: "已标记为忘记了，系统会尽快再安排复习。",
  learnSelectionReady: "先选好今天要学的词库和新词量，再进入专注学习。",
  learnSelectionEmpty: "当前词库选择里还没有可学的新词。",
  learnSelectionCount: "今天有 {count} 个新词等待学习。",
  learnSessionDone: "今天的新词学习已经完成。",
});

let selectedLearnLexiconIds = [];
let learnResultMap = {};
let learnSessionActive = false;
let isLearnLocked = false;

let liveLearnCompleteButton = null;
let liveLearnVagueButton = null;
let liveLearnForgotButton = null;
let liveLearnExampleToggle = null;
let liveLearnMnemonicToggle = null;
let livePlayPronunciationButton = null;
let liveReviewPronunciationButton = null;
let liveReviewFlashcard = null;
let liveReviewKnowButton = null;
let liveReviewVagueButton = null;
let liveReviewForgotButton = null;
let liveStartLearnSessionButton = null;
let liveBackToLearnSetupButton = null;
let liveResumeSpellingLearnButton = null;
let liveResumeSpellingReviewButton = null;
let liveCloseSpellingButton = null;
let liveSpellingPronunciationButton = null;
let liveSpellingForm = null;
let liveSpellingInput = null;
let liveSpellingSubmit = null;

const learnFlowLayout = document.getElementById("learnFlowLayout");
const learnSetupCard = document.getElementById("learnSetupCard");
const learnSessionCard = document.getElementById("learnSessionCard");
const startLearnSession = document.getElementById("startLearnSession");
const backToLearnSetup = document.getElementById("backToLearnSetup");
const resumeSpellingLearn = document.getElementById("resumeSpellingLearn");
const resumeSpellingReview = document.getElementById("resumeSpellingReview");
const closeSpellingButton = document.getElementById("closeSpellingButton");
const learnProgressText = document.getElementById("learnProgressPercent");

function getProgressPayloadSnapshot() {
  const raw = localStorage.getItem(STORAGE_KEYS.progress);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function exportLocalStateForHostedApp(targetPage = "") {
  try {
    const payload = {
      language: localStorage.getItem(STORAGE_KEYS.language) || currentLanguage,
      progress: localStorage.getItem(STORAGE_KEYS.progress) || "",
      userKey: localStorage.getItem(STORAGE_KEYS.userKey) || "",
      targetPage,
      exportedAt: Date.now(),
    };
    window.name = `${WINDOW_NAME_MIGRATION_PREFIX}${JSON.stringify(payload)}`;
  } catch {
    // Ignore migration export failures and still try to open the hosted app.
  }
}

function importMigratedStateFromWindowName() {
  if (!window.name || !window.name.startsWith(WINDOW_NAME_MIGRATION_PREFIX)) {
    return;
  }

  try {
    const payload = JSON.parse(window.name.slice(WINDOW_NAME_MIGRATION_PREFIX.length));
    if (payload.language) {
      localStorage.setItem(STORAGE_KEYS.language, payload.language);
      currentLanguage = payload.language;
    }
    if (payload.progress) {
      localStorage.setItem(STORAGE_KEYS.progress, payload.progress);
    }
    if (payload.userKey) {
      localStorage.setItem(STORAGE_KEYS.userKey, payload.userKey);
    }
    if (payload.targetPage) {
      activePageId = payload.targetPage;
    }
  } catch {
    // Ignore malformed migration payloads.
  } finally {
    window.name = "";
  }
}

function redirectToHostedApp(targetPage = "learn") {
  exportLocalStateForHostedApp(targetPage);
  const suffix = targetPage ? `#${targetPage}` : "";
  window.location.replace(`${HOSTED_APP_URL}/${suffix}`);
}

function normalizeStudySetupState(rawState) {
  const availableLexicons = getAvailableLexicons();
  const defaultLexiconId = availableLexicons[0]?.id || "system-graduate";
  const ids = Array.isArray(rawState?.selectedLexiconIds)
    ? rawState.selectedLexiconIds.filter((id) => getLexiconRecord(id))
    : [];
  const dailyTarget = Math.max(1, Math.min(60, Number(rawState?.dailyTarget) || Number(learnDailyTarget?.value) || 12));

  return {
    selectedLexiconIds: ids.length ? ids : [selectedLearnLexiconId || defaultLexiconId],
    dailyTarget,
  };
}

function hydrateExtendedLearnState() {
  const payload = getProgressPayloadSnapshot();
  const setupState = normalizeStudySetupState(payload.studySetupState);

  selectedLearnLexiconIds = [...setupState.selectedLexiconIds];
  selectedLearnLexiconId = selectedLearnLexiconIds[0];
  learnSessionActive = Boolean(payload.learnSessionActive && Array.isArray(payload.learnSessionIds) && payload.learnSessionIds.length);
  learnResultMap =
    payload.learnResultMap && typeof payload.learnResultMap === "object" ? { ...payload.learnResultMap } : {};

  if (learnDailyTarget) {
    learnDailyTarget.value = String(setupState.dailyTarget);
  }
}

const previousSaveProgress = saveProgress;
saveProgress = function patchedSaveProgress() {
  ensureTodayStats();

  const payload = {
    activePageId,
    customItems: customDeck,
    itemStates,
    learnSessionIds,
    learnIndex,
    reviewSessionIds,
    reviewIndex,
    spelling: {
      active: spellingActive,
      mode: spellingMode,
      queueIds: spellingQueueIds,
      index: spellingIndex,
    },
    activityDates,
    todayStats,
    studySetupState: normalizeStudySetupState({
      selectedLexiconIds: selectedLearnLexiconIds,
      dailyTarget: Number(learnDailyTarget?.value) || 12,
    }),
    learnSessionActive,
    learnResultMap,
  };

  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(payload));
};

function ensureSeedLexiconMembership() {
  learnDeck.forEach((item) => {
    item.lexiconId = item.lexiconId || "system-graduate";
    item.lexiconKey = item.lexiconKey || "graduate";
    item.audioUrl = item.audioUrl || "";
  });

  reviewDeck.forEach((item) => {
    item.lexiconId = item.lexiconId || "system-graduate";
    item.lexiconKey = item.lexiconKey || "graduate";
    item.audioUrl = item.audioUrl || "";
  });

  customDeck.forEach((item) => {
    if (!item.lexiconId && item.lexiconKey) {
      const lexicon = getLexiconRecord(item.lexiconKey);
      if (lexicon) {
        item.lexiconId = lexicon.id;
      }
    }
  });

  rebuildCollections();
}

function getLearnTargetValue() {
  return Math.max(1, Math.min(60, Number(learnDailyTarget?.value) || 12));
}

function getLiveLexiconSelection() {
  if (!selectedLearnLexiconIds.length) {
    const fallback = getAvailableLexicons()[0]?.id || "system-graduate";
    selectedLearnLexiconIds = [fallback];
    selectedLearnLexiconId = fallback;
  }

  return [...selectedLearnLexiconIds];
}

function itemMatchesLearnSelection(item, selectedIds) {
  if (!item) {
    return false;
  }

  const lexicon = getLexiconRecord(item.lexiconId || item.lexiconKey || "system-graduate");
  const itemLexiconId = lexicon?.id || item.lexiconId || "system-graduate";
  return selectedIds.includes(itemLexiconId);
}

function buildPlannedLearnQueue() {
  const selectedIds = getLiveLexiconSelection();
  const dailyTarget = getLearnTargetValue();

  return allItems
    .filter((item) => {
      const state = itemStates[item.id];
      return (state?.status || "new") === "new" && itemMatchesLearnSelection(item, selectedIds);
    })
    .slice(0, dailyTarget)
    .map((item) => item.id);
}

function getLearnQueueIds() {
  if (learnSessionActive && learnSessionIds.length) {
    return learnSessionIds.filter((id) => getItemById(id) && (itemStates[id]?.status || "new") === "new");
  }
  return buildPlannedLearnQueue();
}

function toggleLearnFlowMode(isSessionActive) {
  learnFlowLayout?.classList.toggle("learn-session-active", Boolean(isSessionActive));
  learnSetupCard?.classList.toggle("hidden", Boolean(isSessionActive));
  learnSessionCard?.classList.toggle("hidden", !isSessionActive);
}

function renderResumeSpellingButtons() {
  const shouldShow = Boolean(spellingActive && spellingQueueIds.length);
  (liveResumeSpellingLearnButton || resumeSpellingLearn)?.classList.toggle("hidden", !shouldShow);
  (liveResumeSpellingReviewButton || resumeSpellingReview)?.classList.toggle("hidden", !shouldShow);
}

function renderLearnLexiconFilters() {
  if (!learnLexiconFilters) {
    return;
  }

  const lexicons = getAvailableLexicons();
  const selectedIds = getLiveLexiconSelection();

  learnLexiconFilters.innerHTML = "";
  lexicons.forEach((lexicon) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `toggle-pill${selectedIds.includes(lexicon.id) ? " active" : ""}`;
    button.textContent = getLexiconName(lexicon);
    button.addEventListener("click", () => {
      const alreadySelected = selectedLearnLexiconIds.includes(lexicon.id);
      if (alreadySelected && selectedLearnLexiconIds.length === 1) {
        return;
      }

      if (alreadySelected) {
        selectedLearnLexiconIds = selectedLearnLexiconIds.filter((id) => id !== lexicon.id);
      } else {
        selectedLearnLexiconIds = [...selectedLearnLexiconIds, lexicon.id];
      }

      selectedLearnLexiconId = selectedLearnLexiconIds[0];
      renderLearnLexiconFilters();
      renderLearnSetupState();
      renderDashboard();
      saveProgress();
    });
    learnLexiconFilters.appendChild(button);
  });
}

function renderLearnSetupState() {
  const dictionary = getDictionary();
  const selectedIds = getLiveLexiconSelection();
  const queue = buildPlannedLearnQueue();
  const selectedLexicons = selectedIds.map((id) => getLexiconRecord(id)).filter(Boolean);

  if (studySelectionSummary) {
    if (!queue.length) {
      studySelectionSummary.textContent = dictionary.learnSelectionEmpty;
    } else if (selectedLexicons.length === 1) {
      const name = getLexiconName(selectedLexicons[0]);
      studySelectionSummary.textContent = `${dictionary.selectedLexiconSingle.replace("{name}", name)} · ${dictionary.learnSelectionCount.replace("{count}", String(queue.length))}`;
    } else {
      studySelectionSummary.textContent = `${dictionary.selectedLexiconMultiple.replace("{count}", String(selectedLexicons.length))} · ${dictionary.learnSelectionCount.replace("{count}", String(queue.length))}`;
    }
  }

  if (liveStartLearnSessionButton || startLearnSession) {
    setButtonDisabled(liveStartLearnSessionButton || startLearnSession, !queue.length);
  }

  renderResumeSpellingButtons();
}

function getCurrentLearnItem() {
  const queue = getLearnQueueIds();
  if (!queue.length) {
    return null;
  }
  return getItemById(queue[Math.min(learnIndex, queue.length - 1)]);
}

function getCurrentReviewItem() {
  const queue = getReviewQueueIds();
  if (!queue.length) {
    return null;
  }
  return getItemById(queue[Math.min(reviewIndex, queue.length - 1)]);
}

function getCurrentSpellingItem() {
  if (!spellingActive || !spellingQueueIds.length) {
    return null;
  }
  return getItemById(spellingQueueIds[Math.min(spellingIndex, spellingQueueIds.length - 1)]);
}

function renderLearnCard() {
  renderLearnLexiconFilters();
  renderLearnSetupState();

  const queue = getLearnQueueIds();
  if (!learnSessionActive || !learnSessionIds.length) {
    toggleLearnFlowMode(false);
    renderDashboard();
    return;
  }

  const normalizedQueue = learnSessionIds.filter((id) => getItemById(id));
  if (!normalizedQueue.length) {
    learnSessionActive = false;
    learnSessionIds = [];
    learnIndex = 0;
    toggleLearnFlowMode(false);
    renderDashboard();
    saveProgress();
    return;
  }

  learnSessionIds = normalizedQueue;
  toggleLearnFlowMode(true);
  learnIndex = Math.min(learnIndex, learnSessionIds.length - 1);

  const item = getItemById(learnSessionIds[learnIndex]);
  const dictionary = getDictionary();
  const completed = learnIndex;
  const leftAfterCurrent = Math.max(learnSessionIds.length - learnIndex - 1, 0);
  const progress = Math.round((completed / learnSessionIds.length) * 100);
  const currentLexicon = getLexiconRecord(item.lexiconId || item.lexiconKey || "system-graduate");

  if (learnSourceLabel) {
    learnSourceLabel.textContent = getLexiconName(currentLexicon) || dictionary.newWordTitle;
  }

  setWordPresentation(learnWord, item);
  learnPhonetic.textContent = item.phonetic || "";
  learnType.textContent = getTypeLabel(item.kind);
  learnPos.textContent = item.pos || "-";
  learnCategory.textContent = getLocalizedCopy(item.category) || "-";
  learnDifficulty.textContent = getLocalizedCopy(item.difficulty) || "-";
  learnDefinition.textContent = getLocalizedCopy(item.meaning);
  renderExampleBlock({
    card: learnExampleCard,
    button: liveLearnExampleToggle || learnExampleToggle,
    primary: learnExample,
    secondary: learnExampleTranslation,
    example: item.example,
    expanded: learnExampleExpanded,
  });
  renderMnemonicBlock({
    primary: learnMnemonic,
    secondary: learnMnemonicSecondary,
    toggle: liveLearnMnemonicToggle || learnMnemonicToggle,
    mnemonic: item.mnemonic,
    showEnglish: learnMnemonicEnglishVisible,
  });
  learnCounter.textContent = `${learnIndex + 1} / ${learnSessionIds.length}`;
  if (learnProgressText) {
    learnProgressText.textContent = `${progress}%`;
  }
  learnedCount.textContent = String(completed);
  leftCount.textContent = String(leftAfterCurrent);
  learnEta.textContent = currentLanguage === "zh" ? `${Math.max(leftAfterCurrent, 1) * 3} 分钟` : `${Math.max(leftAfterCurrent, 1) * 3} min`;

  setButtonDisabled(liveLearnCompleteButton || learnComplete, false);
  setButtonDisabled(liveLearnVagueButton || learnReviewLater, false);
  setButtonDisabled(liveLearnForgotButton || learnStay, false);
  setButtonDisabled(livePlayPronunciationButton || playPronunciation, false);
  renderDashboard();
}

function buildReviewBackMarkup(item) {
  const dictionary = getDictionary();
  const exampleEn = escapeHtml(getLocalizedCopy(item.example, "en"));
  const exampleZh = escapeHtml(getLocalizedCopy(item.example, "zh"));
  const mnemonicZh = escapeHtml(getLocalizedCopy(item.mnemonic, "zh"));
  const mnemonicEn = escapeHtml(getLocalizedCopy(item.mnemonic, "en"));

  return `
    <div class="flashcard-panel">
      <p class="phonetic">${escapeHtml(item.phonetic || "")}</p>
      <p class="definition-text">${escapeHtml(getLocalizedCopy(item.meaning))}</p>
    </div>
    <div class="flashcard-panel detail-block ${reviewExampleExpanded && exampleZh ? "is-open" : ""}">
      <button class="detail-toggle" id="reviewExampleToggle" type="button">
        <span>${escapeHtml(dictionary.exampleSentence)}</span>
        <span class="detail-action-copy">${escapeHtml(
          reviewExampleExpanded && exampleZh ? dictionary.hideTranslation : dictionary.showTranslation
        )}</span>
      </button>
      <p class="detail-primary example-text">${exampleEn || "&nbsp;"}</p>
      <p class="detail-secondary translation-text" style="display:${reviewExampleExpanded && exampleZh ? "block" : "none"}">
        ${exampleZh || escapeHtml(dictionary.exampleFallbackTranslation)}
      </p>
    </div>
    <div class="flashcard-panel detail-block">
      <div class="detail-head">
        <span class="detail-label">${escapeHtml(dictionary.mnemonicLabel)}</span>
        <button class="text-button detail-switch" id="reviewMnemonicToggle" type="button">
          ${escapeHtml(reviewMnemonicEnglishVisible ? dictionary.showChineseHint : dictionary.showEnglishHint)}
        </button>
      </div>
      <p class="detail-primary mnemonic-text">${mnemonicZh || escapeHtml(dictionary.mnemonicFallbackChinese)}</p>
      <p class="detail-secondary" style="display:${reviewMnemonicEnglishVisible && mnemonicEn ? "block" : "none"}">
        ${mnemonicEn || escapeHtml(dictionary.mnemonicFallbackEnglish)}
      </p>
    </div>
  `;
}

function renderReviewCard() {
  const queue = getReviewQueueIds();
  const dictionary = getDictionary();

  renderResumeSpellingButtons();

  if (!queue.length) {
    if (liveReviewFlashcard) {
      liveReviewFlashcard.classList.remove("revealed");
    }
    setWordPresentation(document.getElementById("flashWord"), {
      text: currentLanguage === "zh" ? "今天没有待复习内容" : "No reviews due now",
      kind: "word",
    });
    const liveFlashBack = document.getElementById("flashBack");
    if (liveFlashBack) {
      liveFlashBack.innerHTML = `<p class="review-empty-state">${
        currentLanguage === "zh"
          ? "你已经完成当前复习，可以稍后回来，或者继续学习新词。"
          : "You're all caught up for now. Come back later, or start a new learning round."
      }</p>`;
    }
    reviewCounter.textContent = "0 / 0";
    reviewFeedback.textContent = dictionary.waitingAnswer;
    [liveReviewKnowButton, liveReviewVagueButton, liveReviewForgotButton].forEach((button) =>
      setButtonDisabled(button, true)
    );
    setButtonDisabled(liveReviewPronunciationButton || reviewPronunciation, true);
    renderDashboard();
    return;
  }

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...queue];
    reviewIndex = 0;
  }

  reviewIndex = Math.min(reviewIndex, queue.length - 1);
  const item = getItemById(queue[reviewIndex]);
  const liveFlashcardWord = document.getElementById("flashWord");
  const liveFlashBack = document.getElementById("flashBack");

  [liveReviewKnowButton, liveReviewVagueButton, liveReviewForgotButton].forEach((button) => setButtonDisabled(button, false));
  setButtonDisabled(liveReviewPronunciationButton || reviewPronunciation, false);
  setWordPresentation(liveFlashcardWord, item);
  if (liveFlashBack) {
    liveFlashBack.innerHTML = buildReviewBackMarkup(item);
  }
  reviewCounter.textContent = `${reviewIndex + 1} / ${queue.length}`;
  liveReviewFlashcard?.classList.remove("revealed");

  document.getElementById("reviewExampleToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    reviewExampleExpanded = !reviewExampleExpanded;
    renderReviewCard();
    liveReviewFlashcard?.classList.add("revealed");
  });

  document.getElementById("reviewMnemonicToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    reviewMnemonicEnglishVisible = !reviewMnemonicEnglishVisible;
    renderReviewCard();
    liveReviewFlashcard?.classList.add("revealed");
  });

  if (!reviewFeedback.dataset.userTouched) {
    reviewFeedback.textContent = dictionary.waitingAnswer;
  }

  renderDashboard();
}

function renderSpellingCard() {
  const dictionary = getDictionary();

  if (!spellingActive || !spellingQueueIds.length) {
    setButtonDisabled(liveSpellingPronunciationButton || spellingPronunciation, true);
    return;
  }

  spellingIndex = Math.min(spellingIndex, spellingQueueIds.length - 1);
  const item = getItemById(spellingQueueIds[spellingIndex]);

  spellingFlowLabel.textContent =
    spellingMode === "review" ? dictionary.spellingFlowReview : dictionary.spellingFlowLearn;
  spellingTitle.textContent = item.kind === "phrase" ? dictionary.spellThisPhrase : dictionary.spellThisWord;
  spellingType.textContent = `${getTypeLabel(item.kind)} · ${item.pos || "-"}`;
  spellingPrompt.textContent = getLocalizedCopy(item.meaning);
  spellingModeHint.textContent =
    item.kind === "phrase" ? dictionary.spellingPhraseHint : dictionary.spellingWordHint;
  spellingProgress.textContent = `${spellingIndex + 1} / ${spellingQueueIds.length}`;

  const activeInput = liveSpellingInput || spellingInput;
  if (activeInput) {
    activeInput.placeholder =
      item.kind === "phrase" ? dictionary.spellingPlaceholderPhrase : dictionary.spellingPlaceholder;
  }

  setButtonDisabled(liveSpellingPronunciationButton || spellingPronunciation, false);
}

function scheduleAfterLearn(id, result) {
  const now = Date.now();
  let dueAt = now + REVIEW_INTERVALS_MS[0];
  let level = 0;
  let lastResult = "dontKnow";

  if (result === "know") {
    dueAt = now + REVIEW_INTERVALS_MS[1];
    level = 1;
    lastResult = "know";
  } else if (result === "vague") {
    dueAt = now + VAGUE_INTERVALS_MS[0];
    level = 0;
    lastResult = "vague";
  }

  itemStates[id] = {
    status: "review",
    level,
    dueAt,
    lastReviewedAt: now,
    lastResult,
  };
}

function finalizeLearnSession() {
  const queue = [...learnSessionIds];
  queue.forEach((id) => {
    scheduleAfterLearn(id, learnResultMap[id] || "dontKnow");
  });

  todayStats.newCompleted += queue.length;
  recordActivity();
  learnSessionIds = [];
  learnIndex = 0;
  learnSessionActive = false;
  learnResultMap = {};
  spellingActive = false;
  spellingQueueIds = [];
  spellingIndex = 0;
  closeModalById(spellingModal);
  renderLearnCard();
  renderDashboard();
  saveProgress();
}

function finalizeReviewSession() {
  reviewSessionIds = [];
  reviewIndex = 0;
  spellingActive = false;
  spellingQueueIds = [];
  spellingIndex = 0;
  closeModalById(spellingModal);
  reviewFeedback.dataset.userTouched = "";
  renderReviewCard();
  renderDashboard();
  saveProgress();
}

function startSpellingSession(mode, ids) {
  const cleanedIds = (ids || []).filter((id) => getItemById(id));
  if (!cleanedIds.length) {
    if (mode === "learn") {
      finalizeLearnSession();
    } else {
      finalizeReviewSession();
    }
    return;
  }

  spellingActive = true;
  spellingMode = mode;
  spellingQueueIds = [...cleanedIds];
  spellingIndex = 0;
  spellingFeedback.className = "spelling-feedback";
  spellingFeedback.textContent = getDictionary().spellingReady;
  const activeInput = liveSpellingInput || spellingInput;
  if (activeInput) {
    activeInput.value = "";
  }
  renderSpellingCard();
  openModal(spellingModal);
  saveProgress();
  window.setTimeout(() => activeInput?.focus(), 120);
}

function closeSpellingSessionView() {
  closeModalById(spellingModal);
  renderResumeSpellingButtons();
  saveProgress();
}

function resumeSpellingSessionView() {
  if (!spellingActive || !spellingQueueIds.length) {
    return;
  }
  openModal(spellingModal);
  renderSpellingCard();
  window.setTimeout(() => (liveSpellingInput || spellingInput)?.focus(), 120);
}

function completeLearnChoice(result) {
  if (isLearnLocked || !learnSessionActive || !learnSessionIds.length) {
    return;
  }

  const currentId = learnSessionIds[learnIndex];
  const currentItem = getItemById(currentId);
  if (!currentItem) {
    return;
  }

  isLearnLocked = true;
  learnResultMap[currentId] = result;
  recordActivity();
  void playPronunciationForItem(currentItem, livePlayPronunciationButton || playPronunciation);
  saveProgress();

  showTranslationPopup(currentItem, () => {
    if (learnIndex >= learnSessionIds.length - 1) {
      startSpellingSession("learn", learnSessionIds);
      isLearnLocked = false;
      return;
    }

    learnIndex += 1;
    learnExampleExpanded = false;
    learnMnemonicEnglishVisible = false;
    renderLearnCard();
    isLearnLocked = false;
    saveProgress();
  });
}

function moveToNextLearnWord() {
  completeLearnChoice("know");
}

function handleReviewAction(level) {
  const queue = getReviewQueueIds();
  if (!queue.length || isReviewLocked) {
    return;
  }

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...queue];
    reviewIndex = 0;
  }

  isReviewLocked = true;
  const currentId = reviewSessionIds[reviewIndex];
  const currentItem = getItemById(currentId);
  const dictionary = getDictionary();
  const normalizedLevel = level === "Forgot" ? "Don't Know" : level;
  const feedbackMap = {
    Know: dictionary.feedbackKnow,
    Vague: dictionary.feedbackVague,
    "Don't Know": dictionary.feedbackDontKnow,
  };

  scheduleAfterReview(currentId, normalizedLevel);
  recordActivity();
  todayStats.reviewCompleted += 1;
  reviewFeedback.textContent = feedbackMap[normalizedLevel] || dictionary.waitingAnswer;
  reviewFeedback.dataset.userTouched = "true";
  void playPronunciationForItem(currentItem, liveReviewPronunciationButton || reviewPronunciation);
  renderDashboard();
  saveProgress();

  showTranslationPopup(currentItem, () => {
    if (reviewIndex >= reviewSessionIds.length - 1) {
      startSpellingSession("review", reviewSessionIds);
      isReviewLocked = false;
      return;
    }

    reviewIndex += 1;
    reviewFeedback.dataset.userTouched = "";
    reviewExampleExpanded = false;
    reviewMnemonicEnglishVisible = false;
    renderReviewCard();
    isReviewLocked = false;
    saveProgress();
  });
}

function replaceNodeWithClone(node) {
  if (!node || !node.parentNode) {
    return node;
  }
  const clone = node.cloneNode(true);
  node.parentNode.replaceChild(clone, node);
  return clone;
}

function bindRefactoredInteractions() {
  liveLearnCompleteButton = replaceNodeWithClone(document.getElementById("learnComplete"));
  liveLearnVagueButton = replaceNodeWithClone(document.getElementById("learnReviewLater"));
  liveLearnForgotButton = replaceNodeWithClone(document.getElementById("learnStay"));
  liveLearnExampleToggle = replaceNodeWithClone(document.getElementById("learnExampleToggle"));
  liveLearnMnemonicToggle = replaceNodeWithClone(document.getElementById("learnMnemonicToggle"));
  livePlayPronunciationButton = replaceNodeWithClone(document.getElementById("playPronunciation"));
  liveReviewPronunciationButton = replaceNodeWithClone(document.getElementById("reviewPronunciation"));
  liveReviewFlashcard = replaceNodeWithClone(document.getElementById("flashcard"));
  liveReviewKnowButton = replaceNodeWithClone(document.querySelector(".review-actions .mastery-button.know"));
  liveReviewVagueButton = replaceNodeWithClone(document.querySelector(".review-actions .mastery-button.vague"));
  liveReviewForgotButton = replaceNodeWithClone(document.querySelector(".review-actions .mastery-button.unknown"));
  liveStartLearnSessionButton = replaceNodeWithClone(startLearnSession);
  liveBackToLearnSetupButton = replaceNodeWithClone(backToLearnSetup);
  liveResumeSpellingLearnButton = replaceNodeWithClone(resumeSpellingLearn);
  liveResumeSpellingReviewButton = replaceNodeWithClone(resumeSpellingReview);
  liveCloseSpellingButton = replaceNodeWithClone(closeSpellingButton);
  liveSpellingPronunciationButton = replaceNodeWithClone(document.getElementById("spellingPronunciation"));
  liveSpellingForm = replaceNodeWithClone(document.getElementById("spellingForm"));
  liveSpellingInput = liveSpellingForm?.querySelector("#spellingInput") || document.getElementById("spellingInput");
  liveSpellingSubmit = liveSpellingForm?.querySelector("#spellingSubmit") || document.getElementById("spellingSubmit");

  liveLearnCompleteButton?.addEventListener("click", () => completeLearnChoice("know"));
  liveLearnVagueButton?.addEventListener("click", () => completeLearnChoice("vague"));
  liveLearnForgotButton?.addEventListener("click", () => completeLearnChoice("dontKnow"));
  liveLearnExampleToggle?.addEventListener("click", () => {
    learnExampleExpanded = !learnExampleExpanded;
    renderLearnCard();
  });
  liveLearnMnemonicToggle?.addEventListener("click", () => {
    learnMnemonicEnglishVisible = !learnMnemonicEnglishVisible;
    renderLearnCard();
  });

  livePlayPronunciationButton?.addEventListener("click", () => {
    playPronunciationForItem(getCurrentLearnItem(), livePlayPronunciationButton);
  });
  liveReviewPronunciationButton?.addEventListener("click", () => {
    playPronunciationForItem(getCurrentReviewItem(), liveReviewPronunciationButton);
  });
  liveSpellingPronunciationButton?.addEventListener("click", () => {
    playPronunciationForItem(getCurrentSpellingItem(), liveSpellingPronunciationButton);
  });

  liveReviewFlashcard?.addEventListener("click", () => {
    if (getReviewQueueIds().length) {
      liveReviewFlashcard.classList.toggle("revealed");
    }
  });
  liveReviewKnowButton?.addEventListener("click", () => handleReviewAction("Know"));
  liveReviewVagueButton?.addEventListener("click", () => handleReviewAction("Vague"));
  liveReviewForgotButton?.addEventListener("click", () => handleReviewAction("Don't Know"));

  liveStartLearnSessionButton?.addEventListener("click", () => {
    const queue = buildPlannedLearnQueue();
    if (!queue.length) {
      renderLearnSetupState();
      return;
    }
    learnSessionIds = [...queue];
    learnIndex = 0;
    learnSessionActive = true;
    learnResultMap = {};
    learnExampleExpanded = false;
    learnMnemonicEnglishVisible = false;
    activatePage("learn");
    renderLearnCard();
    saveProgress();
  });

  liveBackToLearnSetupButton?.addEventListener("click", () => {
    learnSessionActive = false;
    learnSessionIds = [];
    learnIndex = 0;
    learnResultMap = {};
    renderLearnCard();
    saveProgress();
  });

  liveResumeSpellingLearnButton?.addEventListener("click", resumeSpellingSessionView);
  liveResumeSpellingReviewButton?.addEventListener("click", resumeSpellingSessionView);
  liveCloseSpellingButton?.addEventListener("click", closeSpellingSessionView);

  liveSpellingForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!spellingActive || !spellingQueueIds.length) {
      return;
    }

    const item = getItemById(spellingQueueIds[spellingIndex]);
    const dictionary = getDictionary();
    const inputValue = normalizeText(liveSpellingInput?.value);
    const expectedValue = normalizeText(item.text);

    if (inputValue !== expectedValue) {
      spellingFeedback.className = "spelling-feedback error";
      spellingFeedback.textContent = dictionary.spellingWrong;
      if (liveSpellingInput) {
        liveSpellingInput.value = "";
        liveSpellingInput.focus();
      }
      todayStats.spellingMistakes += 1;
      recordActivity();
      saveProgress();
      return;
    }

    spellingFeedback.className = "spelling-feedback success";
    spellingFeedback.textContent =
      spellingIndex === spellingQueueIds.length - 1 ? dictionary.spellingFinish : dictionary.spellingCorrect;
    todayStats.spellingCorrect += 1;
    recordActivity();
    saveProgress();

    if (spellingIndex === spellingQueueIds.length - 1) {
      window.setTimeout(() => {
        if (spellingMode === "learn") {
          finalizeLearnSession();
        } else {
          finalizeReviewSession();
        }
      }, 520);
      return;
    }

    window.setTimeout(() => {
      spellingIndex += 1;
      if (liveSpellingInput) {
        liveSpellingInput.value = "";
      }
      spellingFeedback.className = "spelling-feedback";
      spellingFeedback.textContent = dictionary.spellingReady;
      renderSpellingCard();
      saveProgress();
      liveSpellingInput?.focus();
    }, 420);
  });

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      getPreferredSpeechVoice();
    };
    window.speechSynthesis.getVoices();
  }
}

const previousActivatePage = activatePage;
activatePage = function learnFlowAwareActivatePage(targetId) {
  previousActivatePage(targetId);
  renderResumeSpellingButtons();
  if (getSafeTargetId(targetId) === "learn") {
    renderLearnCard();
  }
  if (getSafeTargetId(targetId) === "review") {
    renderReviewCard();
  }
};

const previousApplyTranslations = applyTranslations;
applyTranslations = function learnFlowAwareApplyTranslations(lang) {
  previousApplyTranslations(lang);
  updatePronunciationButtonState(livePlayPronunciationButton, false);
  updatePronunciationButtonState(liveReviewPronunciationButton, false);
  updatePronunciationButtonState(liveSpellingPronunciationButton, false);
  renderLearnCard();
  renderReviewCard();
  renderSpellingCard();
  renderResumeSpellingButtons();
};

(function initializeLearnFlowRefactor() {
  hydrateExtendedLearnState();
  ensureSeedLexiconMembership();
  bindRefactoredInteractions();
  renderLearnCard();
  renderReviewCard();
  renderSpellingCard();
  renderResumeSpellingButtons();
  saveProgress();
})();

Object.assign(translations.en, {
  spellingDecisionEyebrow: "Next Step",
  spellingDecisionTitle: "Enter spelling practice now?",
  spellingDecisionBody: "This round is complete. Do you want to enter spelling practice before finishing?",
  enterSpellingNow: "Enter Spelling",
  skipSpellingNow: "Finish Without Spelling",
  pendingSpellingEyebrow: "Pending Spelling",
  pendingSpellingTitle: "Your last round still has words left to spell.",
  pendingSpellingBody: "Do you want to continue the previous spelling round now, or go straight into new learning?",
  resumePendingSpellingNow: "Continue Spelling",
  skipPendingSpellingNow: "Learn New Words",
  learnWillLoadLexicons: "Selected system lexicons will load when you start learning.",
  roundLabel: "Round",
});

Object.assign(translations.zh, {
  spellingDecisionEyebrow: "下一步",
  spellingDecisionTitle: "现在进入拼写练习吗？",
  spellingDecisionBody: "这一轮已经完成，你可以先进入拼写，也可以直接结束本轮。",
  enterSpellingNow: "进入拼写",
  skipSpellingNow: "直接结束",
  pendingSpellingEyebrow: "未完成拼写",
  pendingSpellingTitle: "上一轮还有单词没有完成拼写。",
  pendingSpellingBody: "你想现在继续上一轮拼写，还是先直接进入新的学习？",
  resumePendingSpellingNow: "继续拼写",
  skipPendingSpellingNow: "先学新词",
  learnWillLoadLexicons: "开始学习时会自动加载所选系统词库。",
  roundLabel: "第",
});

const spellingDecisionModal = document.getElementById("spellingDecisionModal");
const spellingDecisionTitle = document.getElementById("spellingDecisionTitle");
const spellingDecisionBody = document.getElementById("spellingDecisionBody");
const enterSpellingButton = document.getElementById("enterSpellingButton");
const skipSpellingButton = document.getElementById("skipSpellingButton");
const pendingSpellingModal = document.getElementById("pendingSpellingModal");
const resumePendingSpellingButton = document.getElementById("resumePendingSpellingButton");
const skipPendingSpellingButton = document.getElementById("skipPendingSpellingButton");

let loadedRemoteLexiconItems = {};
let loadedRemoteLexiconIds = [];
let learnSessionScoreboard = {};
let reviewSessionScoreboard = {};
let reviewSessionResultsMap = {};
let learnSessionRounds = 1;
let reviewSessionRounds = 1;
let activeSessionType = "";
let completionPromptContext = null;
let pendingSpellingPromptContext = null;
let speechSynthesisPrimed = false;

function getAdvancedProgressPayload() {
  const raw = localStorage.getItem(STORAGE_KEYS.progress);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function hydrateAdvancedProgressState() {
  const payload = getAdvancedProgressPayload();

  loadedRemoteLexiconIds = Array.isArray(payload.loadedRemoteLexiconIds)
    ? payload.loadedRemoteLexiconIds.filter(Boolean)
    : [];
  learnSessionScoreboard =
    payload.learnSessionScoreboard && typeof payload.learnSessionScoreboard === "object"
      ? { ...payload.learnSessionScoreboard }
      : {};
  reviewSessionScoreboard =
    payload.reviewSessionScoreboard && typeof payload.reviewSessionScoreboard === "object"
      ? { ...payload.reviewSessionScoreboard }
      : {};
  reviewSessionResultsMap =
    payload.reviewSessionResultsMap && typeof payload.reviewSessionResultsMap === "object"
      ? { ...payload.reviewSessionResultsMap }
      : {};
  learnSessionRounds = Number.isInteger(payload.learnSessionRounds) ? Math.max(1, payload.learnSessionRounds) : 1;
  reviewSessionRounds = Number.isInteger(payload.reviewSessionRounds) ? Math.max(1, payload.reviewSessionRounds) : 1;
  activeSessionType = typeof payload.activeSessionType === "string" ? payload.activeSessionType : "";
}

const saveProgressBeforeScoreLoop = saveProgress;
saveProgress = function saveProgressWithScoreLoop() {
  ensureTodayStats();

  const payload = {
    activePageId,
    customItems: customDeck,
    itemStates,
    learnSessionIds,
    learnIndex,
    reviewSessionIds,
    reviewIndex,
    spelling: {
      active: spellingActive,
      mode: spellingMode,
      queueIds: spellingQueueIds,
      index: spellingIndex,
    },
    activityDates,
    todayStats,
    studySetupState: normalizeStudySetupState({
      selectedLexiconIds: selectedLearnLexiconIds,
      dailyTarget: Number(learnDailyTarget?.value) || 12,
    }),
    learnSessionActive,
    learnResultMap,
    loadedRemoteLexiconIds: Object.keys(loadedRemoteLexiconItems),
    learnSessionScoreboard,
    reviewSessionScoreboard,
    reviewSessionResultsMap,
    learnSessionRounds,
    reviewSessionRounds,
    activeSessionType,
  };

  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(payload));
};

function flattenLoadedRemoteItems() {
  return Object.values(loadedRemoteLexiconItems).flat();
}

rebuildCollections = function rebuildCollectionsWithRemoteItems() {
  allItems = [...learnDeck, ...reviewDeck, ...customDeck, ...flattenLoadedRemoteItems()];
  itemMap = new Map(allItems.map((item) => [item.id, item]));
};

function ensureItemStateRecord(itemId, status = "new") {
  if (!itemStates[itemId]) {
    itemStates[itemId] = {
      status,
      level: 0,
      dueAt: status === "review" ? Date.now() : null,
      lastReviewedAt: null,
      lastResult: null,
    };
  }
}

function normalizeRemoteLearningItem(rawItem, lexiconId) {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const text = (rawItem.text || "").trim();
  if (!text) {
    return null;
  }

  const kind =
    rawItem.kind === "phrase" || /\s/.test(text) ? "phrase" : "word";

  return {
    id: String(rawItem.id || `${lexiconId}-${normalizeText(text).replace(/[^a-z0-9]+/g, "-")}`),
    text,
    kind,
    phonetic: (rawItem.phonetic || "").trim(),
    pos: (rawItem.pos || (kind === "phrase" ? "phrase" : "n.")).trim(),
    category: sanitizeLocalizedField(rawItem.category, "System"),
    difficulty: sanitizeLocalizedField(rawItem.difficulty, "High Frequency"),
    meaning: sanitizeLocalizedField(rawItem.meaning),
    example: sanitizeLocalizedField(rawItem.example),
    mnemonic: sanitizeLocalizedField(rawItem.mnemonic),
    audioUrl: typeof rawItem.audioUrl === "string" ? rawItem.audioUrl.trim() : "",
    lexiconId: rawItem.lexiconId || lexiconId,
    lexiconKey: rawItem.lexiconKey || getLexiconRecord(lexiconId)?.key || "",
    createdAt: Number.isFinite(rawItem.createdAt) ? rawItem.createdAt : Date.now(),
    isCustom: false,
  };
}

async function ensureSelectedSystemLexiconsLoaded(lexiconIds) {
  const targetIds = (lexiconIds || []).filter(
    (id) => id && (id === "system-cet4" || id === "system-cet6")
  );

  if (!targetIds.length) {
    return;
  }

  const available = await checkBackendAvailability();
  if (!available) {
    return;
  }

  for (const lexiconId of targetIds) {
    if (loadedRemoteLexiconItems[lexiconId]?.length) {
      continue;
    }

    try {
      const payload = await apiRequest(`/lexicons/${encodeURIComponent(lexiconId)}/items`, { method: "GET" });
      const normalizedItems = Array.isArray(payload.items)
        ? payload.items.map((item) => normalizeRemoteLearningItem(item, lexiconId)).filter(Boolean)
        : [];
      loadedRemoteLexiconItems[lexiconId] = normalizedItems;
      loadedRemoteLexiconIds = Object.keys(loadedRemoteLexiconItems);

      normalizedItems.forEach((item) => {
        ensureItemStateRecord(item.id, "new");
      });
    } catch {
      loadedRemoteLexiconItems[lexiconId] = [];
    }
  }

  rebuildCollections();
}

function isRemoteSystemLexiconPendingLoad(lexiconIds) {
  return (lexiconIds || []).some(
    (id) => (id === "system-cet4" || id === "system-cet6") && !loadedRemoteLexiconItems[id]?.length
  );
}

function getScoreIncrementForChoice(result) {
  if (result === "know") {
    return 3;
  }
  if (result === "vague") {
    return 1;
  }
  return 0;
}

function getPendingIdsFromScoreboard(sessionIds, scoreboard) {
  return (sessionIds || []).filter((id) => getItemById(id) && ((scoreboard[id] || 0) < 3));
}

function getLearnQueueIds() {
  if (learnSessionActive && learnSessionIds.length) {
    return getPendingIdsFromScoreboard(learnSessionIds, learnSessionScoreboard);
  }
  return buildPlannedLearnQueue();
}

function getReviewQueueIds() {
  if (reviewSessionIds.length) {
    return getPendingIdsFromScoreboard(reviewSessionIds, reviewSessionScoreboard);
  }
  return getDueReviewIds();
}

function getCurrentLearnItem() {
  const queue = getLearnQueueIds();
  if (!queue.length) {
    return null;
  }
  return getItemById(queue[Math.min(learnIndex, queue.length - 1)]);
}

function getCurrentReviewItem() {
  const queue = getReviewQueueIds();
  if (!queue.length) {
    return null;
  }
  return getItemById(queue[Math.min(reviewIndex, queue.length - 1)]);
}

function getCurrentSpellingItem() {
  if (!spellingActive || !spellingQueueIds.length) {
    return null;
  }
  return getItemById(spellingQueueIds[Math.min(spellingIndex, spellingQueueIds.length - 1)]);
}

function primeSpeechSynthesis() {
  if (speechSynthesisPrimed || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }

  try {
    const primer = new SpeechSynthesisUtterance("");
    primer.volume = 0;
    window.speechSynthesis.speak(primer);
    window.speechSynthesis.cancel();
    speechSynthesisPrimed = true;
  } catch {
    speechSynthesisPrimed = true;
  }
}

function speakWithBrowser(text) {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      reject(new Error("Speech synthesis unavailable"));
      return;
    }

    primeSpeechSynthesis();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getPreferredSpeechVoice();
    utterance.lang = voice?.lang || "en-US";
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis failed"));

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      window.speechSynthesis.resume?.();
    } catch (error) {
      reject(error);
    }
  });
}

async function playPronunciationForItem(item, button) {
  if (!item?.text) {
    return false;
  }

  if (button) {
    setButtonDisabled(button, true);
    updatePronunciationButtonState(button, true);
  }

  stopPronunciationPlayback();
  let played = false;

  try {
    if (item.audioUrl) {
      await new Promise((resolve, reject) => {
        const audio = new Audio(item.audioUrl);
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audio.setAttribute("playsinline", "true");
        activePronunciationAudio = audio;
        audio.onended = () => {
          activePronunciationAudio = null;
          resolve();
        };
        audio.onerror = () => {
          activePronunciationAudio = null;
          reject(new Error("audio-error"));
        };
        audio.play().then(() => {
          played = true;
        }).catch(reject);
      });
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    await speakWithBrowser(item.text);
    played = true;
  } catch {
    played = false;
  } finally {
    if (button) {
      setButtonDisabled(button, false);
      updatePronunciationButtonState(button, false);
    }
  }

  return played;
}

function renderLearnSetupState() {
  const dictionary = getDictionary();
  const selectedIds = getLiveLexiconSelection();
  const queue = buildPlannedLearnQueue();
  const selectedLexicons = selectedIds.map((id) => getLexiconRecord(id)).filter(Boolean);
  const pendingRemoteLoad = isRemoteSystemLexiconPendingLoad(selectedIds);
  const hasPendingSpelling = Boolean(spellingActive && spellingQueueIds.length);

  if (studySelectionSummary) {
    if (hasPendingSpelling && !queue.length && !pendingRemoteLoad) {
      studySelectionSummary.textContent = dictionary.pendingSpellingBody;
    } else if (!queue.length && pendingRemoteLoad) {
      studySelectionSummary.textContent = dictionary.learnWillLoadLexicons;
    } else if (!queue.length) {
      studySelectionSummary.textContent = dictionary.learnSelectionEmpty;
    } else if (selectedLexicons.length === 1) {
      const name = getLexiconName(selectedLexicons[0]);
      studySelectionSummary.textContent = `${dictionary.selectedLexiconSingle.replace("{name}", name)} · ${dictionary.learnSelectionCount.replace("{count}", String(queue.length))}`;
    } else {
      studySelectionSummary.textContent = `${dictionary.selectedLexiconMultiple.replace("{count}", String(selectedLexicons.length))} · ${dictionary.learnSelectionCount.replace("{count}", String(queue.length))}`;
    }
  }

  setButtonDisabled(liveStartLearnSessionButton || startLearnSession, !queue.length && !pendingRemoteLoad && !hasPendingSpelling);
  renderResumeSpellingButtons();
}

function renderLearnCard() {
  renderLearnLexiconFilters();
  renderLearnSetupState();

  if (!learnSessionActive || !learnSessionIds.length) {
    toggleLearnFlowMode(false);
    renderDashboard();
    return;
  }

  const pendingQueue = getLearnQueueIds();
  if (!pendingQueue.length) {
    toggleLearnFlowMode(true);
    promptForSpellingDecision("learn");
    renderDashboard();
    return;
  }

  learnIndex = Math.min(learnIndex, pendingQueue.length - 1);
  const item = getItemById(pendingQueue[learnIndex]);
  if (!item) {
    renderDashboard();
    return;
  }

  toggleLearnFlowMode(true);
  const totalScore = learnSessionIds.reduce((sum, id) => sum + Math.min(learnSessionScoreboard[id] || 0, 3), 0);
  const progress = learnSessionIds.length ? Math.round((totalScore / (learnSessionIds.length * 3)) * 100) : 0;
  const masteredCount = learnSessionIds.filter((id) => (learnSessionScoreboard[id] || 0) >= 3).length;
  const leftCountValue = Math.max(learnSessionIds.length - masteredCount, 0);
  const currentLexicon = getLexiconRecord(item.lexiconId || item.lexiconKey || "system-graduate");

  if (learnSourceLabel) {
    const lexiconName = getLexiconName(currentLexicon);
    learnSourceLabel.textContent = currentLanguage === "zh" ? `${lexiconName} · 第 ${learnSessionRounds} 轮` : `${lexiconName} · Round ${learnSessionRounds}`;
  }

  setWordPresentation(learnWord, item);
  learnPhonetic.textContent = item.phonetic || "";
  learnType.textContent = getTypeLabel(item.kind);
  learnPos.textContent = item.pos || "-";
  learnCategory.textContent = getLocalizedCopy(item.category) || "-";
  learnDifficulty.textContent = `${Math.min(learnSessionScoreboard[item.id] || 0, 3)} / 3`;
  learnDefinition.textContent = getLocalizedCopy(item.meaning);
  renderExampleBlock({
    card: learnExampleCard,
    button: liveLearnExampleToggle || learnExampleToggle,
    primary: learnExample,
    secondary: learnExampleTranslation,
    example: item.example,
    expanded: learnExampleExpanded,
  });
  renderMnemonicBlock({
    primary: learnMnemonic,
    secondary: learnMnemonicSecondary,
    toggle: liveLearnMnemonicToggle || learnMnemonicToggle,
    mnemonic: item.mnemonic,
    showEnglish: learnMnemonicEnglishVisible,
  });

  learnCounter.textContent = `${learnIndex + 1} / ${pendingQueue.length}`;
  if (learnProgressText) {
    learnProgressText.textContent = `${progress}%`;
  }
  learnedCount.textContent = String(masteredCount);
  leftCount.textContent = String(leftCountValue);
  learnEta.textContent = currentLanguage === "zh" ? `${Math.max(leftCountValue, 1) * 2} 分钟` : `${Math.max(leftCountValue, 1) * 2} min`;

  setButtonDisabled(liveLearnCompleteButton || learnComplete, false);
  setButtonDisabled(liveLearnVagueButton || learnReviewLater, false);
  setButtonDisabled(liveLearnForgotButton || learnStay, false);
  setButtonDisabled(livePlayPronunciationButton || playPronunciation, false);
  renderDashboard();
}

function buildReviewBackMarkup(item) {
  const dictionary = getDictionary();
  const exampleEn = escapeHtml(getLocalizedCopy(item.example, "en"));
  const exampleZh = escapeHtml(getLocalizedCopy(item.example, "zh"));
  const mnemonicZh = escapeHtml(getLocalizedCopy(item.mnemonic, "zh"));
  const mnemonicEn = escapeHtml(getLocalizedCopy(item.mnemonic, "en"));

  return `
    <div class="flashcard-panel">
      <p class="phonetic">${escapeHtml(item.phonetic || "")}</p>
      <p class="definition-text">${escapeHtml(getLocalizedCopy(item.meaning))}</p>
    </div>
    <div class="flashcard-panel detail-block ${reviewExampleExpanded && exampleZh ? "is-open" : ""}">
      <button class="detail-toggle" id="reviewExampleToggle" type="button">
        <span>${escapeHtml(dictionary.exampleSentence)}</span>
        <span class="detail-action-copy">${escapeHtml(
          reviewExampleExpanded && exampleZh ? dictionary.hideTranslation : dictionary.showTranslation
        )}</span>
      </button>
      <p class="detail-primary example-text">${exampleEn || "&nbsp;"}</p>
      <p class="detail-secondary translation-text" style="display:${reviewExampleExpanded && exampleZh ? "block" : "none"}">
        ${exampleZh || escapeHtml(dictionary.exampleFallbackTranslation)}
      </p>
    </div>
    <div class="flashcard-panel detail-block">
      <div class="detail-head">
        <span class="detail-label">${escapeHtml(dictionary.mnemonicLabel)}</span>
        <button class="text-button detail-switch" id="reviewMnemonicToggle" type="button">
          ${escapeHtml(reviewMnemonicEnglishVisible ? dictionary.showChineseHint : dictionary.showEnglishHint)}
        </button>
      </div>
      <p class="detail-primary mnemonic-text">${mnemonicZh || escapeHtml(dictionary.mnemonicFallbackChinese)}</p>
      <p class="detail-secondary" style="display:${reviewMnemonicEnglishVisible && mnemonicEn ? "block" : "none"}">
        ${mnemonicEn || escapeHtml(dictionary.mnemonicFallbackEnglish)}
      </p>
    </div>
  `;
}

function renderReviewCard() {
  renderResumeSpellingButtons();
  let queue = getReviewQueueIds();
  const dictionary = getDictionary();

  if (!queue.length) {
    if (liveReviewFlashcard) {
      liveReviewFlashcard.classList.remove("revealed");
    }
    setWordPresentation(document.getElementById("flashWord"), {
      text: currentLanguage === "zh" ? "今天没有待复习内容" : "No reviews due now",
      kind: "word",
    });
    const liveFlashBack = document.getElementById("flashBack");
    if (liveFlashBack) {
      liveFlashBack.innerHTML = `<p class="review-empty-state">${
        currentLanguage === "zh"
          ? "你已经完成当前复习，可以稍后回来，或者继续学习新词。"
          : "You're all caught up for now. Come back later, or start a new learning round."
      }</p>`;
    }
    reviewCounter.textContent = "0 / 0";
    reviewFeedback.textContent = dictionary.waitingAnswer;
    [liveReviewKnowButton, liveReviewVagueButton, liveReviewForgotButton].forEach((button) =>
      setButtonDisabled(button, true)
    );
    setButtonDisabled(liveReviewPronunciationButton || reviewPronunciation, true);
    renderDashboard();
    return;
  }

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...queue];
    reviewSessionScoreboard = Object.fromEntries(reviewSessionIds.map((id) => [id, 0]));
    reviewSessionResultsMap = {};
    reviewSessionRounds = 1;
    reviewIndex = 0;
    activeSessionType = "review";
    queue = getReviewQueueIds();
  }

  reviewIndex = Math.min(reviewIndex, queue.length - 1);
  const item = getItemById(queue[reviewIndex]);
  const liveFlashcardWord = document.getElementById("flashWord");
  const liveFlashBack = document.getElementById("flashBack");

  [liveReviewKnowButton, liveReviewVagueButton, liveReviewForgotButton].forEach((button) => setButtonDisabled(button, false));
  setButtonDisabled(liveReviewPronunciationButton || reviewPronunciation, false);
  setWordPresentation(liveFlashcardWord, item);
  if (liveFlashBack) {
    liveFlashBack.innerHTML = buildReviewBackMarkup(item);
  }
  reviewCounter.textContent = `${reviewIndex + 1} / ${queue.length}`;
  liveReviewFlashcard?.classList.remove("revealed");

  document.getElementById("reviewExampleToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    reviewExampleExpanded = !reviewExampleExpanded;
    renderReviewCard();
    liveReviewFlashcard?.classList.add("revealed");
  });

  document.getElementById("reviewMnemonicToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    reviewMnemonicEnglishVisible = !reviewMnemonicEnglishVisible;
    renderReviewCard();
    liveReviewFlashcard?.classList.add("revealed");
  });

  if (!reviewFeedback.dataset.userTouched) {
    reviewFeedback.textContent =
      currentLanguage === "zh"
        ? `第 ${reviewSessionRounds} 轮，当前积分 ${Math.min(reviewSessionScoreboard[item.id] || 0, 3)} / 3`
        : `Round ${reviewSessionRounds}, score ${Math.min(reviewSessionScoreboard[item.id] || 0, 3)} / 3`;
  }

  renderDashboard();
}

function renderSpellingCard() {
  const dictionary = getDictionary();

  if (!spellingActive || !spellingQueueIds.length) {
    setButtonDisabled(liveSpellingPronunciationButton || spellingPronunciation, true);
    return;
  }

  spellingIndex = Math.min(spellingIndex, spellingQueueIds.length - 1);
  const item = getItemById(spellingQueueIds[spellingIndex]);

  spellingFlowLabel.textContent =
    spellingMode === "review" ? dictionary.spellingFlowReview : dictionary.spellingFlowLearn;
  spellingTitle.textContent = item.kind === "phrase" ? dictionary.spellThisPhrase : dictionary.spellThisWord;
  spellingType.textContent = `${getTypeLabel(item.kind)} · ${item.pos || "-"}`;
  spellingPrompt.textContent = getLocalizedCopy(item.meaning);
  spellingModeHint.textContent =
    item.kind === "phrase" ? dictionary.spellingPhraseHint : dictionary.spellingWordHint;
  spellingProgress.textContent = `${spellingIndex + 1} / ${spellingQueueIds.length}`;
  const activeInput = liveSpellingInput || spellingInput;
  if (activeInput) {
    activeInput.placeholder =
      item.kind === "phrase" ? dictionary.spellingPlaceholderPhrase : dictionary.spellingPlaceholder;
  }
  setButtonDisabled(liveSpellingPronunciationButton || spellingPronunciation, false);
}

function promptForSpellingDecision(mode) {
  if (completionPromptContext?.mode === mode && spellingDecisionModal?.getAttribute("aria-hidden") === "false") {
    return;
  }

  const ids = mode === "learn" ? [...learnSessionIds] : [...reviewSessionIds];
  if (!ids.length) {
    if (mode === "learn") {
      finalizeLearnSession();
    } else {
      finalizeReviewSession();
    }
    return;
  }

  completionPromptContext = { mode, ids };
  openModal(spellingDecisionModal);
}

function clearSpellingDecisionPrompt() {
  completionPromptContext = null;
  closeModalById(spellingDecisionModal);
}

function hasPendingSpellingSession() {
  return Boolean(spellingActive && spellingQueueIds.length);
}

function promptForPendingSpellingChoice() {
  pendingSpellingPromptContext = {
    selectedLexiconIds: getLiveLexiconSelection(),
  };
  openModal(pendingSpellingModal);
}

function clearPendingSpellingPrompt() {
  pendingSpellingPromptContext = null;
  closeModalById(pendingSpellingModal);
}

function finalizeLearnSession() {
  const queue = [...learnSessionIds];
  queue.forEach((id) => {
    scheduleAfterLearn(id, learnResultMap[id] || "dontKnow");
  });

  todayStats.newCompleted += queue.length;
  recordActivity();
  learnSessionIds = [];
  learnIndex = 0;
  learnSessionActive = false;
  learnResultMap = {};
  learnSessionScoreboard = {};
  learnSessionRounds = 1;
  activeSessionType = "";
  clearSpellingDecisionPrompt();
  closeModalById(spellingModal);
  renderLearnCard();
  renderDashboard();
  saveProgress();
}

function finalizeReviewSession() {
  const queue = [...reviewSessionIds];
  queue.forEach((id) => {
    scheduleAfterReview(id, reviewSessionResultsMap[id] || "Don't Know");
  });

  todayStats.reviewCompleted += queue.length;
  reviewSessionIds = [];
  reviewIndex = 0;
  reviewSessionScoreboard = {};
  reviewSessionResultsMap = {};
  reviewSessionRounds = 1;
  activeSessionType = "";
  clearSpellingDecisionPrompt();
  closeModalById(spellingModal);
  reviewFeedback.dataset.userTouched = "";
  renderReviewCard();
  renderDashboard();
  saveProgress();
}

function resolveSessionAdvance(type, pendingBefore, currentPendingIndex, currentId) {
  const scoreboard = type === "learn" ? learnSessionScoreboard : reviewSessionScoreboard;
  const pendingAfter = getPendingIdsFromScoreboard(type === "learn" ? learnSessionIds : reviewSessionIds, scoreboard);

  if (!pendingAfter.length) {
    promptForSpellingDecision(type);
    saveProgress();
    return;
  }

  if (currentPendingIndex >= pendingBefore.length - 1) {
    if (type === "learn") {
      learnSessionRounds += 1;
      learnIndex = 0;
    } else {
      reviewSessionRounds += 1;
      reviewIndex = 0;
    }
  } else {
    const currentStillPending = pendingAfter.includes(currentId);
    const nextIndex = currentStillPending ? currentPendingIndex + 1 : currentPendingIndex;
    if (type === "learn") {
      learnIndex = Math.min(nextIndex, pendingAfter.length - 1);
    } else {
      reviewIndex = Math.min(nextIndex, pendingAfter.length - 1);
    }
  }
}

function completeLearnChoice(result) {
  if (isLearnLocked || !learnSessionActive || !learnSessionIds.length) {
    return;
  }

  const pendingBefore = getLearnQueueIds();
  if (!pendingBefore.length) {
    promptForSpellingDecision("learn");
    return;
  }

  isLearnLocked = true;
  const currentId = pendingBefore[Math.min(learnIndex, pendingBefore.length - 1)];
  const currentItem = getItemById(currentId);
  if (!currentItem) {
    isLearnLocked = false;
    return;
  }

  learnResultMap[currentId] = result;
  learnSessionScoreboard[currentId] = Math.min(
    3,
    (learnSessionScoreboard[currentId] || 0) + getScoreIncrementForChoice(result)
  );
  recordActivity();
  void playPronunciationForItem(currentItem, livePlayPronunciationButton || playPronunciation);
  const currentPendingIndex = Math.min(learnIndex, pendingBefore.length - 1);
  saveProgress();

  showTranslationPopup(currentItem, () => {
    resolveSessionAdvance("learn", pendingBefore, currentPendingIndex, currentId);
    learnExampleExpanded = false;
    learnMnemonicEnglishVisible = false;
    renderLearnCard();
    isLearnLocked = false;
    saveProgress();
  });
}

function handleReviewAction(level) {
  const pendingBefore = getReviewQueueIds();
  if (!pendingBefore.length || isReviewLocked) {
    return;
  }

  if (!reviewSessionIds.length) {
    reviewSessionIds = [...pendingBefore];
    reviewSessionScoreboard = Object.fromEntries(reviewSessionIds.map((id) => [id, 0]));
    reviewSessionResultsMap = {};
    reviewSessionRounds = 1;
    reviewIndex = 0;
    activeSessionType = "review";
  }

  isReviewLocked = true;
  const currentId = pendingBefore[Math.min(reviewIndex, pendingBefore.length - 1)];
  const currentItem = getItemById(currentId);
  const normalizedLevel = level === "Forgot" ? "Don't Know" : level;
  const resultKey =
    normalizedLevel === "Know" ? "know" : normalizedLevel === "Vague" ? "vague" : "dontKnow";
  const feedbackMap = {
    Know: getDictionary().feedbackKnow,
    Vague: getDictionary().feedbackVague,
    "Don't Know": getDictionary().feedbackDontKnow,
  };

  reviewSessionResultsMap[currentId] = normalizedLevel;
  reviewSessionScoreboard[currentId] = Math.min(
    3,
    (reviewSessionScoreboard[currentId] || 0) + getScoreIncrementForChoice(resultKey)
  );
  reviewFeedback.textContent = feedbackMap[normalizedLevel] || getDictionary().waitingAnswer;
  reviewFeedback.dataset.userTouched = "true";
  recordActivity();
  void playPronunciationForItem(currentItem, liveReviewPronunciationButton || reviewPronunciation);
  const currentPendingIndex = Math.min(reviewIndex, pendingBefore.length - 1);
  renderDashboard();
  saveProgress();

  showTranslationPopup(currentItem, () => {
    resolveSessionAdvance("review", pendingBefore, currentPendingIndex, currentId);
    reviewFeedback.dataset.userTouched = "";
    reviewExampleExpanded = false;
    reviewMnemonicEnglishVisible = false;
    renderReviewCard();
    isReviewLocked = false;
    saveProgress();
  });
}

async function startLearnSessionFromSelection() {
  const selectedIds = getLiveLexiconSelection();
  await ensureSelectedSystemLexiconsLoaded(selectedIds);
  rebuildCollections();

  const queue = buildPlannedLearnQueue();
  if (!queue.length) {
    renderLearnSetupState();
    saveProgress();
    return;
  }

  learnSessionIds = [...queue];
  learnIndex = 0;
  learnSessionActive = true;
  learnResultMap = {};
  learnSessionScoreboard = Object.fromEntries(learnSessionIds.map((id) => [id, 0]));
  learnSessionRounds = 1;
  activeSessionType = "learn";
  learnExampleExpanded = false;
  learnMnemonicEnglishVisible = false;
  activatePage("learn");
  renderLearnCard();
  saveProgress();
}

async function handleStartLearning() {
  if (window.location.protocol === "file:") {
    redirectToHostedApp("learn");
    return;
  }

  if (learnSessionActive && learnSessionIds.length) {
    activatePage("learn");
    renderLearnCard();
    saveProgress();
    return;
  }

  if (hasPendingSpellingSession()) {
    promptForPendingSpellingChoice();
    return;
  }

  await startLearnSessionFromSelection();
}

function skipSpellingDecision() {
  if (!completionPromptContext) {
    clearSpellingDecisionPrompt();
    return;
  }

  const mode = completionPromptContext.mode;
  clearSpellingDecisionPrompt();
  if (mode === "learn") {
    finalizeLearnSession();
  } else {
    finalizeReviewSession();
  }
}

function confirmSpellingDecision() {
  if (!completionPromptContext) {
    return;
  }

  const { mode, ids } = completionPromptContext;
  clearSpellingDecisionPrompt();
  startSpellingSession(mode, ids);
}

function closeSpellingSessionView() {
  closeModalById(spellingModal);
  renderResumeSpellingButtons();
  saveProgress();
}

function resumeSpellingSessionView() {
  if (!spellingActive || !spellingQueueIds.length) {
    return;
  }
  openModal(spellingModal);
  renderSpellingCard();
  window.setTimeout(() => (liveSpellingInput || spellingInput)?.focus(), 120);
}

async function startLearningAfterSkippingPendingSpelling() {
  clearPendingSpellingPrompt();
  await startLearnSessionFromSelection();
}

function bindScoreLoopInteractions() {
  liveLearnCompleteButton = replaceNodeWithClone(document.getElementById("learnComplete"));
  liveLearnVagueButton = replaceNodeWithClone(document.getElementById("learnReviewLater"));
  liveLearnForgotButton = replaceNodeWithClone(document.getElementById("learnStay"));
  livePlayPronunciationButton = replaceNodeWithClone(document.getElementById("playPronunciation"));
  liveReviewPronunciationButton = replaceNodeWithClone(document.getElementById("reviewPronunciation"));
  liveReviewFlashcard = replaceNodeWithClone(document.getElementById("flashcard"));
  liveReviewKnowButton = replaceNodeWithClone(document.querySelector(".review-actions .mastery-button.know"));
  liveReviewVagueButton = replaceNodeWithClone(document.querySelector(".review-actions .mastery-button.vague"));
  liveReviewForgotButton = replaceNodeWithClone(document.querySelector(".review-actions .mastery-button.unknown"));
  liveStartLearnSessionButton = replaceNodeWithClone(startLearnSession);
  liveBackToLearnSetupButton = replaceNodeWithClone(backToLearnSetup);
  liveResumeSpellingLearnButton = replaceNodeWithClone(resumeSpellingLearn);
  liveResumeSpellingReviewButton = replaceNodeWithClone(resumeSpellingReview);
  liveCloseSpellingButton = replaceNodeWithClone(closeSpellingButton);
  liveSpellingPronunciationButton = replaceNodeWithClone(document.getElementById("spellingPronunciation"));
  const liveEnterSpellingButton = replaceNodeWithClone(enterSpellingButton);
  const liveSkipSpellingButton = replaceNodeWithClone(skipSpellingButton);
  const liveResumePendingSpellingButton = replaceNodeWithClone(resumePendingSpellingButton);
  const liveSkipPendingSpellingButton = replaceNodeWithClone(skipPendingSpellingButton);

  liveLearnCompleteButton?.addEventListener("click", () => completeLearnChoice("know"));
  liveLearnVagueButton?.addEventListener("click", () => completeLearnChoice("vague"));
  liveLearnForgotButton?.addEventListener("click", () => completeLearnChoice("dontKnow"));
  livePlayPronunciationButton?.addEventListener("click", () => {
    void playPronunciationForItem(getCurrentLearnItem(), livePlayPronunciationButton);
  });

  liveReviewFlashcard?.addEventListener("click", () => {
    if (getReviewQueueIds().length) {
      liveReviewFlashcard.classList.toggle("revealed");
    }
  });
  liveReviewPronunciationButton?.addEventListener("click", () => {
    void playPronunciationForItem(getCurrentReviewItem(), liveReviewPronunciationButton);
  });
  liveReviewKnowButton?.addEventListener("click", () => handleReviewAction("Know"));
  liveReviewVagueButton?.addEventListener("click", () => handleReviewAction("Vague"));
  liveReviewForgotButton?.addEventListener("click", () => handleReviewAction("Don't Know"));

  liveStartLearnSessionButton?.addEventListener("click", () => {
    void handleStartLearning();
  });
  liveBackToLearnSetupButton?.addEventListener("click", () => {
    learnSessionIds = [];
    learnIndex = 0;
    learnSessionActive = false;
    learnResultMap = {};
    learnSessionScoreboard = {};
    learnSessionRounds = 1;
    activeSessionType = "";
    renderLearnCard();
    saveProgress();
  });
  liveResumeSpellingLearnButton?.addEventListener("click", resumeSpellingSessionView);
  liveResumeSpellingReviewButton?.addEventListener("click", resumeSpellingSessionView);
  liveCloseSpellingButton?.addEventListener("click", closeSpellingSessionView);
  liveSpellingPronunciationButton?.addEventListener("click", () => {
    void playPronunciationForItem(getCurrentSpellingItem(), liveSpellingPronunciationButton);
  });
  liveEnterSpellingButton?.addEventListener("click", confirmSpellingDecision);
  liveSkipSpellingButton?.addEventListener("click", skipSpellingDecision);
  liveResumePendingSpellingButton?.addEventListener("click", () => {
    clearPendingSpellingPrompt();
    resumeSpellingSessionView();
  });
  liveSkipPendingSpellingButton?.addEventListener("click", () => {
    void startLearningAfterSkippingPendingSpelling();
  });

  spellingDecisionModal?.addEventListener("click", (event) => {
    if (event.target === spellingDecisionModal) {
      skipSpellingDecision();
    }
  });
  pendingSpellingModal?.addEventListener("click", (event) => {
    if (event.target === pendingSpellingModal) {
      clearPendingSpellingPrompt();
    }
  });

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      getPreferredSpeechVoice();
    };
    window.speechSynthesis.getVoices();
  }
}

const activatePageBeforeScoreLoop = activatePage;
activatePage = function activatePageWithScoreLoop(targetId) {
  activatePageBeforeScoreLoop(targetId);
  renderResumeSpellingButtons();
  if (getSafeTargetId(targetId) === "learn") {
    renderLearnCard();
  }
  if (getSafeTargetId(targetId) === "review") {
    renderReviewCard();
  }
};

const applyTranslationsBeforeScoreLoop = applyTranslations;
applyTranslations = function applyTranslationsWithScoreLoop(lang) {
  applyTranslationsBeforeScoreLoop(lang);
  updatePronunciationButtonState(livePlayPronunciationButton, false);
  updatePronunciationButtonState(liveReviewPronunciationButton, false);
  updatePronunciationButtonState(liveSpellingPronunciationButton, false);
  renderLearnCard();
  renderReviewCard();
  renderSpellingCard();
  renderResumeSpellingButtons();
  if (completionPromptContext) {
    spellingDecisionTitle.textContent = getDictionary().spellingDecisionTitle;
    spellingDecisionBody.textContent = getDictionary().spellingDecisionBody;
  }
};

(async function initializeScoreLoopMode() {
  importMigratedStateFromWindowName();
  hydrateAdvancedProgressState();
  if (loadedRemoteLexiconIds.length) {
    await ensureSelectedSystemLexiconsLoaded(loadedRemoteLexiconIds);
  } else {
    rebuildCollections();
  }

  bindScoreLoopInteractions();
  renderLearnCard();
  renderReviewCard();
  renderSpellingCard();
  renderResumeSpellingButtons();
  saveProgress();
})();
