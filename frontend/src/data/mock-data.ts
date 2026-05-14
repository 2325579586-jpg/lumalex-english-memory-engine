export type Lexicon = {
  id: string;
  name: string;
  category: "考试" | "短语" | "自建";
  total: number;
  pendingLearn: number;
  pendingReview: number;
  updatedAt: string;
};

export type MemoryFeedbackItem = {
  text: string;
  type: "word" | "phrase";
  status: "已掌握" | "易混淆" | "今晚回顾" | "明日复习";
  updatedAt: string;
  difficulty: "简单" | "中等" | "困难";
};

export const dashboardLexicons: Lexicon[] = [
  { id: "system-graduate", name: "考研词汇", category: "考试", total: 2400, pendingLearn: 72, pendingReview: 31, updatedAt: "今天 09:20" },
  { id: "system-cet4", name: "四级高频词", category: "考试", total: 1488, pendingLearn: 56, pendingReview: 22, updatedAt: "昨天 18:10" },
  { id: "system-cet6", name: "六级高频词", category: "考试", total: 1500, pendingLearn: 40, pendingReview: 17, updatedAt: "昨天 18:20" },
  { id: "custom-book-notes", name: "读书摘词", category: "自建", total: 183, pendingLearn: 14, pendingReview: 12, updatedAt: "今天 12:40" },
];

export const recentFeedback: MemoryFeedbackItem[] = [
  { text: "in the long run", type: "phrase", status: "今晚回顾", updatedAt: "20 分钟前", difficulty: "中等" },
  { text: "resilient", type: "word", status: "已掌握", updatedAt: "今天 09:10", difficulty: "简单" },
  { text: "be inclined to", type: "phrase", status: "易混淆", updatedAt: "昨天 21:30", difficulty: "困难" },
  { text: "vivid", type: "word", status: "明日复习", updatedAt: "昨天 19:20", difficulty: "简单" },
];

export const learnPreviewItems = [
  {
    id: "word-1",
    text: "resilient",
    phoneticUk: "/rɪˈzɪliənt/",
    phoneticUs: "/rɪˈzɪliənt/",
    pos: "adj.",
    meaning: "有韧性的；恢复能力强的",
    example: "Students who build small daily habits become more resilient during exam season.",
    translation: "有稳定日常习惯的学生，在考试季会更有恢复力。",
    hint: "可以联想成重新回到稳定状态，强调恢复与承受能力。",
    collocations: ["emotionally resilient", "resilient system", "resilient mindset"],
    related: ["adaptable", "durable", "fragile"],
  },
  {
    id: "word-2",
    text: "in the long run",
    phoneticUk: "/ɪn ðə lɒŋ rʌn/",
    phoneticUs: "/ɪn ðə lɔːŋ rʌn/",
    pos: "phrase",
    meaning: "从长远来看；最终",
    example: "Reviewing a little every day helps more in the long run than last-minute cramming.",
    translation: "每天复习一点点，从长期看比临时抱佛脚更有效。",
    hint: "想象一条很长的跑道，强调长期结果，而不是眼前波动。",
    collocations: ["beneficial in the long run", "matter in the long run", "pay off in the long run"],
    related: ["eventually", "over time", "in the short term"],
  },
];

export const reviewModes = [
  { id: "en-zh", label: "英文 → 中文" },
  { id: "zh-en", label: "中文 → 英文" },
  { id: "audio", label: "听音辨义" },
  { id: "spelling", label: "拼写复习" },
  { id: "cloze", label: "例句填空" },
];
