import jsPDF from 'jspdf';

interface SwotItem {
  title: string;
  evidence?: string;
  analysis?: string;
  issue?: string;
  impact?: string;
  action?: string;
  benefit?: string;
  risk_level?: string;
  prevention?: string;
}

interface SwotAnalysis {
  strengths?: SwotItem[];
  weaknesses?: SwotItem[];
  opportunities?: SwotItem[];
  threats?: SwotItem[];
}

interface CorrectionResult {
  overall_score: number;
  grammar_score: number;
  vocabulary_score: number;
  structure_score: number;
  content_score: number;
  corrections: {
    original: string;
    corrected: string;
    explanation: string;
    type: string;
  }[];
  strengths: string[];
  improvements: string[];
  model_answer: string;
  detailed_feedback: string;
  swot_analysis?: SwotAnalysis;
  vocabulary_upgrades?: { basic: string; advanced: string; difference: string }[];
  structure_improvements?: { current: string; improved: string; reason: string }[];
  next_priority?: string[];
}

interface PDFGeneratorOptions {
  result: CorrectionResult;
  language: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

// Text labels by language
const labels: Record<string, Record<string, string>> = {
  ko: {
    title: 'TOPIK 쓰기 첨삭 리포트',
    subtitle: 'LUKATO AI 전문 평가',
    overallScore: '종합 점수',
    grammar: '문법',
    vocabulary: '어휘',
    structure: '구조',
    content: '내용',
    strengths: '✓ 강점 분석',
    improvements: '△ 개선점 분석',
    corrections: '✎ 상세 교정',
    original: '원문',
    corrected: '수정',
    explanation: '설명',
    modelAnswer: '★ 모범 답안',
    detailedFeedback: '◆ 전체 피드백',
    vocabularyUpgrades: '어휘 업그레이드',
    basic: '기본',
    advanced: '고급',
    structureImprovements: '구조 개선',
    current: '현재',
    improved: '개선안',
    nextPriority: '⚡ 다음 학습 과제',
    footer: 'LUKATO AI | topikbot.kr',
    page: '페이지',
    generatedAt: '생성일시',
    swotTitle: 'SWOT 분석',
    swotStrengths: 'S - 강점',
    swotWeaknesses: 'W - 약점',
    swotOpportunities: 'O - 기회',
    swotThreats: 'T - 위협',
  },
  vi: {
    title: 'Báo Cáo Chấm Bài TOPIK',
    subtitle: 'Đánh giá chuyên nghiệp bởi LUKATO AI',
    overallScore: 'Điểm tổng',
    grammar: 'Ngữ pháp',
    vocabulary: 'Từ vựng',
    structure: 'Cấu trúc',
    content: 'Nội dung',
    strengths: '✓ Điểm mạnh',
    improvements: '△ Cần cải thiện',
    corrections: '✎ Chi tiết sửa lỗi',
    original: 'Gốc',
    corrected: 'Sửa',
    explanation: 'Giải thích',
    modelAnswer: '★ Bài mẫu',
    detailedFeedback: '◆ Nhận xét chi tiết',
    vocabularyUpgrades: 'Nâng cấp từ vựng',
    basic: 'Cơ bản',
    advanced: 'Nâng cao',
    structureImprovements: 'Cải thiện cấu trúc',
    current: 'Hiện tại',
    improved: 'Cải thiện',
    nextPriority: '⚡ Bước tiếp theo',
    footer: 'LUKATO AI | topikbot.kr',
    page: 'Trang',
    generatedAt: 'Ngày tạo',
    swotTitle: 'Phân tích SWOT',
    swotStrengths: 'S - Điểm mạnh',
    swotWeaknesses: 'W - Điểm yếu',
    swotOpportunities: 'O - Cơ hội',
    swotThreats: 'T - Rủi ro',
  },
  en: {
    title: 'TOPIK Writing Correction Report',
    subtitle: 'Professional Assessment by LUKATO AI',
    overallScore: 'Overall Score',
    grammar: 'Grammar',
    vocabulary: 'Vocabulary',
    structure: 'Structure',
    content: 'Content',
    strengths: '✓ Strengths',
    improvements: '△ Areas for Improvement',
    corrections: '✎ Detailed Corrections',
    original: 'Original',
    corrected: 'Corrected',
    explanation: 'Explanation',
    modelAnswer: '★ Model Answer',
    detailedFeedback: '◆ Detailed Feedback',
    vocabularyUpgrades: 'Vocabulary Upgrades',
    basic: 'Basic',
    advanced: 'Advanced',
    structureImprovements: 'Structure Improvements',
    current: 'Current',
    improved: 'Improved',
    nextPriority: '⚡ Next Steps',
    footer: 'LUKATO AI | topikbot.kr',
    page: 'Page',
    generatedAt: 'Generated',
    swotTitle: 'SWOT Analysis',
    swotStrengths: 'S - Strengths',
    swotWeaknesses: 'W - Weaknesses',
    swotOpportunities: 'O - Opportunities',
    swotThreats: 'T - Threats',
  },
  ja: {
    title: 'TOPIK作文添削レポート',
    subtitle: 'LUKATO AIによる専門評価',
    overallScore: '総合得点',
    grammar: '文法',
    vocabulary: '語彙',
    structure: '構成',
    content: '内容',
    strengths: '✓ 強み',
    improvements: '△ 改善点',
    corrections: '✎ 詳細添削',
    original: '原文',
    corrected: '修正',
    explanation: '説明',
    modelAnswer: '★ 模範解答',
    detailedFeedback: '◆ 詳細フィードバック',
    vocabularyUpgrades: '語彙アップグレード',
    basic: '基本',
    advanced: '上級',
    structureImprovements: '構成改善',
    current: '現在',
    improved: '改善案',
    nextPriority: '⚡ 次のステップ',
    footer: 'LUKATO AI | topikbot.kr',
    page: 'ページ',
    generatedAt: '作成日',
    swotTitle: 'SWOT分析',
    swotStrengths: 'S - 強み',
    swotWeaknesses: 'W - 弱み',
    swotOpportunities: 'O - 機会',
    swotThreats: 'T - 脅威',
  },
  zh: {
    title: 'TOPIK写作批改报告',
    subtitle: 'LUKATO AI专业评估',
    overallScore: '综合得分',
    grammar: '语法',
    vocabulary: '词汇',
    structure: '结构',
    content: '内容',
    strengths: '✓ 优点',
    improvements: '△ 改进点',
    corrections: '✎ 详细批改',
    original: '原文',
    corrected: '修改',
    explanation: '说明',
    modelAnswer: '★ 范文',
    detailedFeedback: '◆ 详细反馈',
    vocabularyUpgrades: '词汇升级',
    basic: '基础',
    advanced: '高级',
    structureImprovements: '结构改进',
    current: '当前',
    improved: '改进',
    nextPriority: '⚡ 下一步',
    footer: 'LUKATO AI | topikbot.kr',
    page: '页',
    generatedAt: '生成日期',
    swotTitle: 'SWOT分析',
    swotStrengths: 'S - 优势',
    swotWeaknesses: 'W - 劣势',
    swotOpportunities: 'O - 机会',
    swotThreats: 'T - 威胁',
  },
  ru: {
    title: 'Отчёт по исправлению TOPIK',
    subtitle: 'Профессиональная оценка LUKATO AI',
    overallScore: 'Общий балл',
    grammar: 'Грамматика',
    vocabulary: 'Лексика',
    structure: 'Структура',
    content: 'Содержание',
    strengths: '✓ Сильные стороны',
    improvements: '△ Области улучшения',
    corrections: '✎ Детальные исправления',
    original: 'Оригинал',
    corrected: 'Исправлено',
    explanation: 'Объяснение',
    modelAnswer: '★ Образец ответа',
    detailedFeedback: '◆ Подробный отзыв',
    vocabularyUpgrades: 'Улучшение лексики',
    basic: 'Базовый',
    advanced: 'Продвинутый',
    structureImprovements: 'Улучшение структуры',
    current: 'Текущий',
    improved: 'Улучшенный',
    nextPriority: '⚡ Следующие шаги',
    footer: 'LUKATO AI | topikbot.kr',
    page: 'Страница',
    generatedAt: 'Дата создания',
    swotTitle: 'SWOT анализ',
    swotStrengths: 'S - Сильные стороны',
    swotWeaknesses: 'W - Слабые стороны',
    swotOpportunities: 'O - Возможности',
    swotThreats: 'T - Угрозы',
  },
  uz: {
    title: "TOPIK Yozuv Tuzatish Hisoboti",
    subtitle: "LUKATO AI professional baholashi",
    overallScore: "Umumiy ball",
    grammar: "Grammatika",
    vocabulary: "Lug'at",
    structure: "Tuzilma",
    content: "Mazmun",
    strengths: "✓ Kuchli tomonlar",
    improvements: "△ Yaxshilash kerak",
    corrections: "✎ Batafsil tuzatishlar",
    original: "Asl",
    corrected: "Tuzatilgan",
    explanation: "Tushuntirish",
    modelAnswer: "★ Namuna javob",
    detailedFeedback: "◆ Batafsil fikr-mulohaza",
    vocabularyUpgrades: "Lug'at yaxshilash",
    basic: "Oddiy",
    advanced: "Murakkab",
    structureImprovements: "Tuzilma yaxshilash",
    current: "Joriy",
    improved: "Yaxshilangan",
    nextPriority: "⚡ Keyingi qadamlar",
    footer: "LUKATO AI | topikbot.kr",
    page: "Sahifa",
    generatedAt: "Yaratilgan sana",
    swotTitle: "SWOT tahlili",
    swotStrengths: "S - Kuchli tomonlar",
    swotWeaknesses: "W - Zaif tomonlar",
    swotOpportunities: "O - Imkoniyatlar",
    swotThreats: "T - Xavflar",
  },
};

// Get label by language
function getLabel(lang: string, key: string): string {
  const normalizedLang = lang.split('-')[0];
  const langLabels = labels[normalizedLang] || labels.en;
  return langLabels[key] || labels.en[key] || key;
}

// Clean markdown from text
function cleanMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/##/g, '')
    .replace(/#/g, '')
    .replace(/`/g, '')
    .trim();
}

// Get score color based on value
function getScoreColor(score: number, max: number): [number, number, number] {
  const percentage = (score / max) * 100;
  if (percentage >= 80) return [34, 139, 34]; // Green
  if (percentage >= 60) return [255, 165, 0]; // Orange
  return [220, 53, 69]; // Red
}

// Get grade based on score
function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  if (score >= 45) return 'D+';
  if (score >= 40) return 'D';
  return 'F';
}

// PDF dimensions constants
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

class ProfessionalPDFGenerator {
  private doc: jsPDF;
  private y: number = MARGIN_TOP;
  private pageNum: number = 1;
  private language: string;
  private result: CorrectionResult;

  constructor(options: PDFGeneratorOptions) {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.language = options.language;
    this.result = options.result;
    this.y = MARGIN_TOP;
  }

  private getLabel(key: string): string {
    return getLabel(this.language, key);
  }

  private checkPageBreak(requiredHeight: number): void {
    if (this.y + requiredHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.addNewPage();
    }
  }

  private addNewPage(): void {
    this.doc.addPage();
    this.pageNum++;
    this.y = MARGIN_TOP;
    this.drawPageHeader();
  }

  private drawPageHeader(): void {
    // Light header bar on continuation pages
    if (this.pageNum > 1) {
      this.doc.setFillColor(248, 249, 250);
      this.doc.rect(0, 0, PAGE_WIDTH, 12, 'F');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text('TOPIK Writing Report - LUKATO AI', MARGIN_LEFT, 8);
      this.doc.text(`${this.getLabel('page')} ${this.pageNum}`, PAGE_WIDTH - MARGIN_RIGHT, 8, { align: 'right' });
      this.y = 18;
    }
  }

  private drawFooter(): void {
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      
      // Footer line
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.3);
      this.doc.line(MARGIN_LEFT, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 15);
      
      // Footer text
      this.doc.setFontSize(8);
      this.doc.setTextColor(120, 120, 120);
      this.doc.text(this.getLabel('footer'), MARGIN_LEFT, PAGE_HEIGHT - 10);
      this.doc.text(`${this.getLabel('page')} ${i} / ${totalPages}`, PAGE_WIDTH - MARGIN_RIGHT, PAGE_HEIGHT - 10, { align: 'right' });
    }
  }

  private drawCoverHeader(): void {
    // Gradient-like header background
    this.doc.setFillColor(79, 70, 229); // Primary indigo
    this.doc.rect(0, 0, PAGE_WIDTH, 55, 'F');
    
    // Secondary accent bar
    this.doc.setFillColor(99, 102, 241);
    this.doc.rect(0, 50, PAGE_WIDTH, 8, 'F');
    
    // Title
    this.doc.setFontSize(26);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(this.getLabel('title'), PAGE_WIDTH / 2, 28, { align: 'center' });
    
    // Subtitle
    this.doc.setFontSize(11);
    this.doc.setTextColor(220, 220, 255);
    this.doc.text(this.getLabel('subtitle'), PAGE_WIDTH / 2, 40, { align: 'center' });
    
    // Date
    const now = new Date();
    const dateStr = now.toLocaleDateString(this.language === 'ko' ? 'ko-KR' : this.language === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    this.doc.setFontSize(9);
    this.doc.setTextColor(200, 200, 255);
    this.doc.text(`${this.getLabel('generatedAt')}: ${dateStr}`, PAGE_WIDTH / 2, 48, { align: 'center' });
    
    this.y = 70;
  }

  private drawScoreSection(): void {
    this.checkPageBreak(70);
    
    // Score container
    const containerY = this.y;
    this.doc.setFillColor(250, 250, 255);
    this.doc.roundedRect(MARGIN_LEFT, containerY, CONTENT_WIDTH, 60, 3, 3, 'F');
    this.doc.setDrawColor(200, 200, 220);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(MARGIN_LEFT, containerY, CONTENT_WIDTH, 60, 3, 3, 'S');
    
    // Overall score - large centered
    const overallY = containerY + 8;
    this.doc.setFontSize(11);
    this.doc.setTextColor(80, 80, 100);
    this.doc.text(this.getLabel('overallScore'), PAGE_WIDTH / 2, overallY, { align: 'center' });
    
    // Score value with color
    const [r, g, b] = getScoreColor(this.result.overall_score, 100);
    this.doc.setFontSize(36);
    this.doc.setTextColor(r, g, b);
    this.doc.text(`${this.result.overall_score}`, PAGE_WIDTH / 2 - 8, overallY + 18, { align: 'center' });
    
    this.doc.setFontSize(18);
    this.doc.setTextColor(120, 120, 140);
    this.doc.text('/100', PAGE_WIDTH / 2 + 15, overallY + 18, { align: 'center' });
    
    // Grade badge
    const grade = getGrade(this.result.overall_score);
    const gradeX = PAGE_WIDTH / 2 + 35;
    this.doc.setFillColor(r, g, b);
    this.doc.roundedRect(gradeX - 10, overallY + 4, 20, 16, 2, 2, 'F');
    this.doc.setFontSize(14);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(grade, gradeX, overallY + 14, { align: 'center' });
    
    // Category scores - horizontal layout
    const scoresY = containerY + 42;
    const categoryWidth = CONTENT_WIDTH / 4;
    const categories = [
      { label: this.getLabel('grammar'), score: this.result.grammar_score, max: 25 },
      { label: this.getLabel('vocabulary'), score: this.result.vocabulary_score, max: 25 },
      { label: this.getLabel('structure'), score: this.result.structure_score, max: 25 },
      { label: this.getLabel('content'), score: this.result.content_score, max: 25 },
    ];
    
    categories.forEach((cat, i) => {
      const x = MARGIN_LEFT + (categoryWidth * i) + (categoryWidth / 2);
      
      // Category label
      this.doc.setFontSize(9);
      this.doc.setTextColor(100, 100, 120);
      this.doc.text(cat.label, x, scoresY, { align: 'center' });
      
      // Score with color
      const [cr, cg, cb] = getScoreColor(cat.score, cat.max);
      this.doc.setFontSize(14);
      this.doc.setTextColor(cr, cg, cb);
      this.doc.text(`${cat.score}/${cat.max}`, x, scoresY + 8, { align: 'center' });
      
      // Progress bar
      const barWidth = 30;
      const barX = x - barWidth / 2;
      const barY = scoresY + 11;
      const progress = (cat.score / cat.max) * barWidth;
      
      this.doc.setFillColor(230, 230, 240);
      this.doc.roundedRect(barX, barY, barWidth, 3, 1.5, 1.5, 'F');
      this.doc.setFillColor(cr, cg, cb);
      this.doc.roundedRect(barX, barY, progress, 3, 1.5, 1.5, 'F');
    });
    
    this.y = containerY + 68;
  }

  private drawSectionTitle(title: string, color: [number, number, number] = [79, 70, 229]): void {
    this.checkPageBreak(12);
    
    // Accent bar
    this.doc.setFillColor(color[0], color[1], color[2]);
    this.doc.rect(MARGIN_LEFT, this.y, 3, 8, 'F');
    
    // Title text
    this.doc.setFontSize(13);
    this.doc.setTextColor(40, 40, 60);
    this.doc.text(title, MARGIN_LEFT + 6, this.y + 6);
    
    this.y += 14;
  }

  private drawBulletList(items: string[], color: [number, number, number] = [60, 60, 80]): void {
    items.forEach((item) => {
      const cleanItem = cleanMarkdown(item);
      if (!cleanItem) return;
      
      this.checkPageBreak(10);
      
      // Bullet point
      this.doc.setFillColor(color[0], color[1], color[2]);
      this.doc.circle(MARGIN_LEFT + 3, this.y + 2, 1.2, 'F');
      
      // Text with wrapping
      this.doc.setFontSize(10);
      this.doc.setTextColor(60, 60, 80);
      const lines = this.doc.splitTextToSize(cleanItem, CONTENT_WIDTH - 12);
      lines.forEach((line: string, idx: number) => {
        if (idx > 0) this.checkPageBreak(5);
        this.doc.text(line, MARGIN_LEFT + 8, this.y + 3 + (idx * 5));
      });
      this.y += 5 + (lines.length * 5);
    });
  }

  private drawCorrections(): void {
    if (!this.result.corrections.length) return;
    
    this.drawSectionTitle(this.getLabel('corrections'), [220, 53, 69]);
    
    const corrections = this.result.corrections.slice(0, 12); // Limit for readability
    
    corrections.forEach((c, idx) => {
      this.checkPageBreak(30);
      
      // Card container
      const cardY = this.y;
      this.doc.setFillColor(255, 250, 250);
      this.doc.roundedRect(MARGIN_LEFT, cardY, CONTENT_WIDTH, 24, 2, 2, 'F');
      this.doc.setDrawColor(255, 200, 200);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(MARGIN_LEFT, cardY, CONTENT_WIDTH, 24, 2, 2, 'S');
      
      // Index badge
      this.doc.setFillColor(220, 53, 69);
      this.doc.circle(MARGIN_LEFT + 8, cardY + 6, 4, 'F');
      this.doc.setFontSize(8);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(`${idx + 1}`, MARGIN_LEFT + 8, cardY + 7.5, { align: 'center' });
      
      // Original text
      this.doc.setFontSize(9);
      this.doc.setTextColor(180, 60, 60);
      const origLabel = `${this.getLabel('original')}: `;
      this.doc.text(origLabel, MARGIN_LEFT + 15, cardY + 7);
      const origText = cleanMarkdown(c.original).substring(0, 50);
      this.doc.setTextColor(80, 80, 100);
      this.doc.text(origText, MARGIN_LEFT + 15 + this.doc.getTextWidth(origLabel), cardY + 7);
      
      // Corrected text
      this.doc.setTextColor(34, 139, 34);
      const corrLabel = `${this.getLabel('corrected')}: `;
      this.doc.text(corrLabel, MARGIN_LEFT + 15, cardY + 13);
      const corrText = cleanMarkdown(c.corrected).substring(0, 50);
      this.doc.setTextColor(34, 139, 34);
      this.doc.text(corrText, MARGIN_LEFT + 15 + this.doc.getTextWidth(corrLabel), cardY + 13);
      
      // Explanation
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 120);
      const expText = cleanMarkdown(c.explanation).substring(0, 80);
      this.doc.text(expText, MARGIN_LEFT + 15, cardY + 20);
      
      this.y = cardY + 28;
    });
  }

  private drawVocabularyUpgrades(): void {
    if (!this.result.vocabulary_upgrades?.length) return;
    
    this.drawSectionTitle(this.getLabel('vocabularyUpgrades'), [255, 165, 0]);
    
    this.result.vocabulary_upgrades.slice(0, 8).forEach((v) => {
      this.checkPageBreak(14);
      
      const cardY = this.y;
      this.doc.setFillColor(255, 252, 245);
      this.doc.roundedRect(MARGIN_LEFT, cardY, CONTENT_WIDTH, 12, 2, 2, 'F');
      
      // Basic → Advanced
      this.doc.setFontSize(10);
      this.doc.setTextColor(120, 100, 60);
      const basicText = cleanMarkdown(v.basic);
      this.doc.text(basicText, MARGIN_LEFT + 5, cardY + 5);
      
      this.doc.setTextColor(200, 150, 50);
      this.doc.text(' → ', MARGIN_LEFT + 5 + this.doc.getTextWidth(basicText), cardY + 5);
      
      this.doc.setTextColor(180, 120, 0);
      this.doc.text(cleanMarkdown(v.advanced), MARGIN_LEFT + 5 + this.doc.getTextWidth(basicText) + this.doc.getTextWidth(' → '), cardY + 5);
      
      // Difference
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 120);
      this.doc.text(cleanMarkdown(v.difference).substring(0, 70), MARGIN_LEFT + 5, cardY + 10);
      
      this.y = cardY + 15;
    });
  }

  private drawModelAnswer(): void {
    if (!this.result.model_answer) return;
    
    this.drawSectionTitle(this.getLabel('modelAnswer'), [34, 139, 34]);
    
    const text = cleanMarkdown(this.result.model_answer);
    this.doc.setFontSize(10);
    this.doc.setTextColor(50, 80, 50);
    
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - 10);
    
    // Background for model answer
    const boxHeight = Math.min(lines.length * 5 + 10, 80);
    this.checkPageBreak(boxHeight);
    
    this.doc.setFillColor(245, 255, 245);
    this.doc.roundedRect(MARGIN_LEFT, this.y, CONTENT_WIDTH, boxHeight, 2, 2, 'F');
    this.doc.setDrawColor(180, 220, 180);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(MARGIN_LEFT, this.y, CONTENT_WIDTH, boxHeight, 2, 2, 'S');
    
    let textY = this.y + 6;
    lines.slice(0, 14).forEach((line: string) => {
      if (textY < this.y + boxHeight - 4) {
        this.doc.text(line, MARGIN_LEFT + 5, textY);
        textY += 5;
      }
    });
    
    this.y += boxHeight + 5;
  }

  private drawDetailedFeedback(): void {
    if (!this.result.detailed_feedback) return;
    
    this.drawSectionTitle(this.getLabel('detailedFeedback'), [100, 100, 180]);
    
    const text = cleanMarkdown(this.result.detailed_feedback);
    this.doc.setFontSize(9);
    this.doc.setTextColor(60, 60, 80);
    
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH - 5);
    
    lines.slice(0, 20).forEach((line: string) => {
      this.checkPageBreak(6);
      this.doc.text(line, MARGIN_LEFT + 3, this.y);
      this.y += 5;
    });
    
    this.y += 5;
  }

  private drawNextPriority(): void {
    if (!this.result.next_priority?.length) return;
    
    this.drawSectionTitle(this.getLabel('nextPriority'), [138, 43, 226]);
    
    this.result.next_priority.forEach((priority, idx) => {
      this.checkPageBreak(12);
      
      // Priority badge
      this.doc.setFillColor(idx === 0 ? 138 : 180, idx === 0 ? 43 : 150, idx === 0 ? 226 : 220);
      this.doc.roundedRect(MARGIN_LEFT, this.y, 18, 8, 2, 2, 'F');
      this.doc.setFontSize(9);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(`#${idx + 1}`, MARGIN_LEFT + 9, this.y + 5.5, { align: 'center' });
      
      // Priority text
      this.doc.setFontSize(10);
      this.doc.setTextColor(60, 60, 80);
      const priorityText = cleanMarkdown(priority);
      const lines = this.doc.splitTextToSize(priorityText, CONTENT_WIDTH - 25);
      lines.forEach((line: string, lineIdx: number) => {
        this.doc.text(line, MARGIN_LEFT + 22, this.y + 5 + (lineIdx * 5));
      });
      
      this.y += Math.max(12, lines.length * 5 + 5);
    });
  }

  public generate(): void {
    // Page 1: Cover + Scores
    this.drawCoverHeader();
    this.drawScoreSection();
    
    // Strengths
    if (this.result.strengths?.length) {
      this.drawSectionTitle(this.getLabel('strengths'), [34, 139, 34]);
      this.drawBulletList(this.result.strengths, [34, 139, 34]);
    }
    
    // Improvements
    if (this.result.improvements?.length) {
      this.y += 5;
      this.drawSectionTitle(this.getLabel('improvements'), [255, 165, 0]);
      this.drawBulletList(this.result.improvements, [200, 130, 0]);
    }
    
    // Corrections
    this.y += 5;
    this.drawCorrections();
    
    // Vocabulary Upgrades
    this.y += 5;
    this.drawVocabularyUpgrades();
    
    // Model Answer
    this.y += 5;
    this.drawModelAnswer();
    
    // Detailed Feedback
    this.y += 5;
    this.drawDetailedFeedback();
    
    // Next Priority
    this.y += 5;
    this.drawNextPriority();
    
    // Add footers to all pages
    this.drawFooter();
  }

  public save(filename: string): void {
    this.doc.save(filename);
  }
}

export function generateWritingCorrectionPDF(options: PDFGeneratorOptions): void {
  const generator = new ProfessionalPDFGenerator(options);
  generator.generate();
  generator.save(`TOPIK_Writing_Report_${Date.now()}.pdf`);
}

export default generateWritingCorrectionPDF;
