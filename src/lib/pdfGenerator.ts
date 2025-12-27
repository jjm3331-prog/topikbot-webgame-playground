import jsPDF from "jspdf";
import notoSansUrl from "@/assets/fonts/NotoSansKR-VF.ttf?url";

export interface WritingCorrectionResult {
  overall_score: number;
  grammar_score: number;
  vocabulary_score: number;
  structure_score: number;
  content_score: number;
  strengths?: string[];
  improvements?: string[];
  corrections?: {
    original: string;
    corrected: string;
    explanation?: string;
    type?: string;
  }[];
  model_answer?: string;
  detailed_feedback?: string;
  next_priority?: string[];
}

export interface WritingPDFOptions {
  result: WritingCorrectionResult;
  language: string;
  filename?: string;
}

const COLORS = {
  bg: { r: 11, g: 18, b: 32 },
  card: { r: 17, g: 26, b: 46 },
  primary: { r: 45, g: 76, b: 255 },
  accent: { r: 124, g: 58, b: 237 },
  text: { r: 230, g: 237, b: 247 },
  muted: { r: 160, g: 170, b: 190 },
  success: { r: 34, g: 197, b: 94 },
  error: { r: 239, g: 68, b: 68 },
  white: { r: 255, g: 255, b: 255 },
};

const labels: Record<string, Record<string, string>> = {
  ko: {
    title: "TOPIK 쓰기 첨삭 리포트",
    subtitle: "LUKATO AI 전문 평가",
    overall: "종합 점수",
    breakdown: "항목별 점수",
    strengths: "강점",
    improvements: "개선점",
    corrections: "주요 교정",
    modelAnswer: "모범 답안",
    detailedFeedback: "상세 피드백",
    nextPriority: "다음 학습 과제",
    original: "원문",
    corrected: "수정",
    grammar: "문법",
    vocabulary: "어휘",
    structure: "구조",
    content: "내용",
    generatedAt: "생성일시",
    page: "페이지",
  },
  vi: {
    title: "Báo cáo chấm bài TOPIK",
    subtitle: "Đánh giá chuyên nghiệp bởi LUKATO AI",
    overall: "Điểm tổng",
    breakdown: "Chi tiết điểm",
    strengths: "Điểm mạnh",
    improvements: "Cần cải thiện",
    corrections: "Sửa lỗi chính",
    modelAnswer: "Bài mẫu",
    detailedFeedback: "Nhận xét chi tiết",
    nextPriority: "Bước tiếp theo",
    original: "Gốc",
    corrected: "Sửa",
    grammar: "Ngữ pháp",
    vocabulary: "Từ vựng",
    structure: "Cấu trúc",
    content: "Nội dung",
    generatedAt: "Ngày tạo",
    page: "Trang",
  },
  en: {
    title: "TOPIK Writing Correction Report",
    subtitle: "Professional Assessment by LUKATO AI",
    overall: "Overall Score",
    breakdown: "Score Breakdown",
    strengths: "Strengths",
    improvements: "Areas for Improvement",
    corrections: "Key Corrections",
    modelAnswer: "Model Answer",
    detailedFeedback: "Detailed Feedback",
    nextPriority: "Next Steps",
    original: "Original",
    corrected: "Corrected",
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    structure: "Structure",
    content: "Content",
    generatedAt: "Generated",
    page: "Page",
  },
  ja: {
    title: "TOPIK作文添削レポート",
    subtitle: "LUKATO AIによる専門評価",
    overall: "総合得点",
    breakdown: "内訳",
    strengths: "強み",
    improvements: "改善点",
    corrections: "主要修正",
    modelAnswer: "模範解答",
    detailedFeedback: "詳細フィードバック",
    nextPriority: "次のステップ",
    original: "原文",
    corrected: "修正",
    grammar: "文法",
    vocabulary: "語彙",
    structure: "構成",
    content: "内容",
    generatedAt: "作成日",
    page: "ページ",
  },
  zh: {
    title: "TOPIK写作批改报告",
    subtitle: "LUKATO AI专业评估",
    overall: "综合得分",
    breakdown: "得分明细",
    strengths: "优点",
    improvements: "改进点",
    corrections: "重点修改",
    modelAnswer: "范文",
    detailedFeedback: "详细反馈",
    nextPriority: "下一步",
    original: "原文",
    corrected: "修改",
    grammar: "语法",
    vocabulary: "词汇",
    structure: "结构",
    content: "内容",
    generatedAt: "生成日期",
    page: "页",
  },
  ru: {
    title: "Отчёт по исправлению TOPIK",
    subtitle: "Профессиональная оценка LUKATO AI",
    overall: "Общий балл",
    breakdown: "Разбивка баллов",
    strengths: "Сильные стороны",
    improvements: "Области улучшения",
    corrections: "Ключевые исправления",
    modelAnswer: "Образец ответа",
    detailedFeedback: "Подробный отзыв",
    nextPriority: "Следующие шаги",
    original: "Оригинал",
    corrected: "Исправлено",
    grammar: "Грамматика",
    vocabulary: "Лексика",
    structure: "Структура",
    content: "Содержание",
    generatedAt: "Дата создания",
    page: "Страница",
  },
  uz: {
    title: "TOPIK Yozuv Tuzatish Hisoboti",
    subtitle: "LUKATO AI professional baholashi",
    overall: "Umumiy ball",
    breakdown: "Ball tafsiloti",
    strengths: "Kuchli tomonlar",
    improvements: "Yaxshilash kerak",
    corrections: "Asosiy tuzatishlar",
    modelAnswer: "Namuna javob",
    detailedFeedback: "Batafsil fikr",
    nextPriority: "Keyingi qadamlar",
    original: "Asl",
    corrected: "Tuzatilgan",
    grammar: "Grammatika",
    vocabulary: "Lug'at",
    structure: "Tuzilma",
    content: "Mazmun",
    generatedAt: "Yaratilgan",
    page: "Sahifa",
  },
};

function getLabel(lang: string, key: string): string {
  const baseLang = (lang || "en").split("-")[0];
  return labels[baseLang]?.[key] ?? labels.en[key] ?? key;
}

function cleanText(text?: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/##/g, "")
    .replace(/#/g, "")
    .replace(/`/g, "")
    .trim();
}

function getScoreColor(score: number, max: number): { r: number; g: number; b: number } {
  const pct = score / max;
  if (pct >= 0.8) return COLORS.success;
  if (pct >= 0.6) return { r: 96, g: 165, b: 250 };
  if (pct >= 0.4) return { r: 251, g: 191, b: 36 };
  return COLORS.error;
}

function getGrade(score: number): { grade: string; color: { r: number; g: number; b: number } } {
  if (score >= 90) return { grade: "A+", color: COLORS.success };
  if (score >= 80) return { grade: "A", color: COLORS.success };
  if (score >= 70) return { grade: "B+", color: { r: 96, g: 165, b: 250 } };
  if (score >= 60) return { grade: "B", color: { r: 96, g: 165, b: 250 } };
  if (score >= 50) return { grade: "C", color: { r: 251, g: 191, b: 36 } };
  return { grade: "D", color: COLORS.error };
}

const PDF_FONT_FAMILY = "NotoSans";
const PDF_FONT_FILE = "NotoSansKR-VF.ttf";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function embedUnicodeFont(doc: jsPDF) {
  const res = await fetch(notoSansUrl);
  if (!res.ok) throw new Error(`Failed to load PDF font (${res.status})`);
  const buf = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  doc.addFileToVFS(PDF_FONT_FILE, base64);
  doc.addFont(PDF_FONT_FILE, PDF_FONT_FAMILY, "normal");
  doc.setFont(PDF_FONT_FAMILY, "normal");
}

class PDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private y: number;
  private pageNum: number;
  private lang: string;

  constructor(doc: jsPDF, lang: string) {
    this.doc = doc;
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 15;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.y = this.margin;
    this.pageNum = 1;
    this.lang = lang;
  }

  private setColor(color: { r: number; g: number; b: number }) {
    this.doc.setTextColor(color.r, color.g, color.b);
  }

  private setFillColor(color: { r: number; g: number; b: number }) {
    this.doc.setFillColor(color.r, color.g, color.b);
  }

  private setDrawColor(color: { r: number; g: number; b: number }) {
    this.doc.setDrawColor(color.r, color.g, color.b);
  }

  private checkPage(needed: number) {
    if (this.y + needed > this.pageHeight - this.margin - 10) {
      this.addPage();
    }
  }

  private addPage() {
    this.doc.addPage();
    this.pageNum++;
    this.y = this.margin;
    this.drawBackground();
    this.drawPageNumber();
  }

  private drawBackground() {
    this.setFillColor(COLORS.bg);
    this.doc.rect(0, 0, this.pageWidth, this.pageHeight, "F");
  }

  private drawPageNumber() {
    this.doc.setFontSize(8);
    this.setColor(COLORS.muted);
    const text = `${getLabel(this.lang, "page")} ${this.pageNum}`;
    this.doc.text(text, this.pageWidth - this.margin, this.pageHeight - 8, { align: "right" });
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number, style: "F" | "S" | "FD" = "F") {
    this.doc.roundedRect(x, y, w, h, r, r, style);
  }

  private drawHeader(title: string, subtitle: string, dateStr: string) {
    const headerHeight = 28;
    
    // Gradient header simulation
    this.setFillColor(COLORS.primary);
    this.roundedRect(this.margin, this.y, this.contentWidth, headerHeight, 4, "F");
    
    // Accent overlay (skip GState for compatibility)
    this.setFillColor({ r: 100, g: 60, b: 220 });
    this.roundedRect(this.margin + this.contentWidth * 0.6, this.y, this.contentWidth * 0.4, headerHeight, 4, "F");

    // Title
    this.doc.setFontSize(16);
    this.setColor(COLORS.white);
    this.doc.text(title, this.margin + 8, this.y + 11);

    // Subtitle
    this.doc.setFontSize(9);
    this.doc.text(subtitle, this.margin + 8, this.y + 19);

    // Date
    this.doc.setFontSize(8);
    this.doc.text(dateStr, this.pageWidth - this.margin - 8, this.y + 11, { align: "right" });

    this.y += headerHeight + 8;
  }

  private drawOverallScore(score: number) {
    const cardHeight = 38;
    const cardWidth = 55;
    
    // Card background
    this.setFillColor(COLORS.card);
    this.roundedRect(this.margin, this.y, cardWidth, cardHeight, 4, "F");

    // Label
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text(getLabel(this.lang, "overall"), this.margin + 8, this.y + 12);

    // Score
    this.doc.setFontSize(28);
    const scoreColor = getScoreColor(score, 100);
    this.setColor(scoreColor);
    this.doc.text(String(score), this.margin + 8, this.y + 30);

    // /100
    this.doc.setFontSize(12);
    this.setColor(COLORS.muted);
    this.doc.text("/100", this.margin + 32, this.y + 30);

    return { endX: this.margin + cardWidth + 6 };
  }

  private drawGradeBadge(score: number, startX: number) {
    const { grade, color } = getGrade(score);
    const badgeSize = 20;
    const badgeX = startX;
    const badgeY = this.y + 9;

    this.setFillColor(color);
    this.doc.circle(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, "F");

    this.doc.setFontSize(12);
    this.setColor(COLORS.white);
    this.doc.text(grade, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 4, { align: "center" });

    return { endX: badgeX + badgeSize + 8 };
  }

  private drawScoreBreakdown(result: WritingCorrectionResult, startX: number) {
    const scores = [
      { key: "grammar", value: result.grammar_score },
      { key: "vocabulary", value: result.vocabulary_score },
      { key: "structure", value: result.structure_score },
      { key: "content", value: result.content_score },
    ];

    const cardWidth = this.pageWidth - this.margin - startX;
    const cardHeight = 38;

    // Card
    this.setFillColor(COLORS.card);
    this.roundedRect(startX, this.y, cardWidth, cardHeight, 4, "F");

    // Title
    this.doc.setFontSize(9);
    this.setColor(COLORS.muted);
    this.doc.text(getLabel(this.lang, "breakdown"), startX + 6, this.y + 10);

    // Score bars
    const barStartY = this.y + 16;
    const barHeight = 4;
    const barGap = 7;
    const labelWidth = 28;
    const barWidth = (cardWidth - 20 - labelWidth) / 2;

    scores.forEach((s, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = startX + 6 + col * (labelWidth + barWidth + 10);
      const rowY = barStartY + row * barGap;

      // Label
      this.doc.setFontSize(7);
      this.setColor(COLORS.text);
      this.doc.text(getLabel(this.lang, s.key), x, rowY + 3);

      // Bar background
      const barX = x + labelWidth;
      this.setFillColor({ r: 50, g: 60, b: 80 });
      this.roundedRect(barX, rowY, barWidth - 18, barHeight, 1.5, "F");

      // Bar fill
      const fillWidth = ((s.value / 25) * (barWidth - 18));
      const barColor = getScoreColor(s.value, 25);
      this.setFillColor(barColor);
      this.roundedRect(barX, rowY, fillWidth, barHeight, 1.5, "F");

      // Score text
      this.doc.setFontSize(7);
      this.setColor(barColor);
      this.doc.text(`${s.value}/25`, barX + barWidth - 14, rowY + 3);
    });

    this.y += cardHeight + 8;
  }

  private drawSection(title: string, items: string[], bulletColor: { r: number; g: number; b: number }) {
    if (!items || items.length === 0) return;

    this.checkPage(20 + items.length * 8);

    // Section card
    const itemHeight = 7;
    const padding = 8;
    const titleHeight = 12;
    const cardHeight = titleHeight + padding + items.length * itemHeight + padding;

    this.setFillColor(COLORS.card);
    this.roundedRect(this.margin, this.y, this.contentWidth, cardHeight, 4, "F");

    // Title
    this.doc.setFontSize(10);
    this.setColor(COLORS.text);
    this.doc.text(title, this.margin + padding, this.y + 10);

    // Items
    let itemY = this.y + titleHeight + padding;
    this.doc.setFontSize(8);

    items.forEach((item, idx) => {
      const cleanItem = cleanText(item);
      if (!cleanItem) return;

      // Bullet
      this.setFillColor(bulletColor);
      this.doc.circle(this.margin + padding + 2, itemY - 1.5, 1.2, "F");

      // Text
      this.setColor(COLORS.text);
      const lines = this.doc.splitTextToSize(cleanItem, this.contentWidth - padding * 2 - 8);
      lines.forEach((line: string, lineIdx: number) => {
        if (lineIdx === 0) {
          this.doc.text(line, this.margin + padding + 6, itemY);
        } else {
          itemY += itemHeight;
          this.doc.text(line, this.margin + padding + 6, itemY);
        }
      });
      itemY += itemHeight;
    });

    this.y += cardHeight + 6;
  }

  private drawCorrections(corrections: WritingCorrectionResult["corrections"]) {
    if (!corrections || corrections.length === 0) return;

    this.checkPage(25);

    // Section title
    this.doc.setFontSize(10);
    this.setColor(COLORS.text);
    this.doc.text(getLabel(this.lang, "corrections"), this.margin, this.y + 4);
    this.y += 10;

    corrections.forEach((c, idx) => {
      const original = cleanText(c.original);
      const corrected = cleanText(c.corrected);
      const explanation = cleanText(c.explanation);

      if (!original && !corrected) return;

      this.checkPage(28);

      const cardHeight = explanation ? 32 : 24;

      // Card
      this.setFillColor(COLORS.card);
      this.roundedRect(this.margin, this.y, this.contentWidth, cardHeight, 3, "F");

      // Index badge
      this.setFillColor(COLORS.error);
      this.doc.circle(this.margin + 8, this.y + 10, 5, "F");
      this.doc.setFontSize(8);
      this.setColor(COLORS.white);
      this.doc.text(String(idx + 1), this.margin + 8, this.y + 12, { align: "center" });

      // Original
      const textX = this.margin + 18;
      this.doc.setFontSize(7);
      this.setColor(COLORS.error);
      this.doc.text(getLabel(this.lang, "original") + ":", textX, this.y + 8);
      this.setColor(COLORS.text);
      const origLines = this.doc.splitTextToSize(original, this.contentWidth - 50);
      this.doc.text(origLines[0] || "", textX + 16, this.y + 8);

      // Corrected
      this.setColor(COLORS.success);
      this.doc.text(getLabel(this.lang, "corrected") + ":", textX, this.y + 16);
      this.setColor(COLORS.success);
      const corrLines = this.doc.splitTextToSize(corrected, this.contentWidth - 50);
      this.doc.text(corrLines[0] || "", textX + 16, this.y + 16);

      // Explanation
      if (explanation) {
        this.doc.setFontSize(6.5);
        this.setColor(COLORS.muted);
        const explLines = this.doc.splitTextToSize(explanation, this.contentWidth - 26);
        this.doc.text(explLines[0] || "", textX, this.y + 24);
      }

      this.y += cardHeight + 4;
    });

    this.y += 4;
  }

  private drawTextBlock(title: string, text?: string) {
    if (!text) return;

    const cleanedText = cleanText(text);
    if (!cleanedText) return;

    this.checkPage(30);

    // Title
    this.doc.setFontSize(10);
    this.setColor(COLORS.text);
    this.doc.text(title, this.margin, this.y + 4);
    this.y += 10;

    // Content card
    const lines = this.doc.splitTextToSize(cleanedText, this.contentWidth - 16);
    const lineHeight = 5;
    const cardHeight = Math.min(lines.length * lineHeight + 16, 80);

    this.setFillColor(COLORS.card);
    this.roundedRect(this.margin, this.y, this.contentWidth, cardHeight, 3, "F");

    this.doc.setFontSize(8);
    this.setColor(COLORS.text);

    let textY = this.y + 8;
    const maxLines = Math.floor((cardHeight - 16) / lineHeight);
    const displayLines = lines.slice(0, maxLines);

    displayLines.forEach((line: string) => {
      this.doc.text(line, this.margin + 8, textY);
      textY += lineHeight;
    });

    if (lines.length > maxLines) {
      this.doc.setFontSize(7);
      this.setColor(COLORS.muted);
      this.doc.text("...", this.margin + 8, textY);
    }

    this.y += cardHeight + 6;
  }

  private drawFooter() {
    this.doc.setFontSize(8);
    this.setColor(COLORS.muted);
    this.doc.text("LUKATO AI • topikbot.kr", this.pageWidth / 2, this.pageHeight - 8, { align: "center" });
  }

  public generate(result: WritingCorrectionResult): jsPDF {
    // Page 1: Header + Scores
    this.drawBackground();
    this.drawPageNumber();

    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    this.drawHeader(
      getLabel(this.lang, "title"),
      getLabel(this.lang, "subtitle"),
      `${getLabel(this.lang, "generatedAt")}: ${dateStr}`
    );

    const { endX: scoreEndX } = this.drawOverallScore(result.overall_score);
    const { endX: badgeEndX } = this.drawGradeBadge(result.overall_score, scoreEndX);
    this.drawScoreBreakdown(result, badgeEndX);

    // Strengths & Improvements
    this.drawSection(
      getLabel(this.lang, "strengths"),
      (result.strengths || []).slice(0, 6),
      COLORS.success
    );

    this.drawSection(
      getLabel(this.lang, "improvements"),
      (result.improvements || []).slice(0, 6),
      COLORS.error
    );

    // Next Priority
    this.drawSection(
      getLabel(this.lang, "nextPriority"),
      (result.next_priority || []).slice(0, 5),
      COLORS.accent
    );

    // Corrections
    this.drawCorrections((result.corrections || []).slice(0, 8));

    // Model Answer
    this.drawTextBlock(getLabel(this.lang, "modelAnswer"), result.model_answer);

    // Detailed Feedback
    this.drawTextBlock(getLabel(this.lang, "detailedFeedback"), result.detailed_feedback);

    // Footer on last page
    this.drawFooter();

    return this.doc;
  }
}

export async function generateWritingCorrectionPDF(options: WritingPDFOptions): Promise<void> {
  const lang = (options.language || "en").split("-")[0];
  const filename = options.filename || `TOPIK_Writing_Report_${Date.now()}.pdf`;

  // IMPORTANT: jsPDF default fonts are NOT unicode-safe; embed a unicode font first.
  const doc = new jsPDF("p", "mm", "a4");
  await embedUnicodeFont(doc);

  const generator = new PDFGenerator(doc, lang);
  generator.generate(options.result);
  doc.save(filename);
}
