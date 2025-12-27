import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type WritingCorrectionResult = {
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
};

export type WritingPDFOptions = {
  result: WritingCorrectionResult;
  language: string;
  filename?: string;
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
  },
  en: {
    title: "TOPIK Writing Correction Report",
    subtitle: "Professional Assessment by LUKATO AI",
    overall: "Overall score",
    breakdown: "Score breakdown",
    strengths: "Strengths",
    improvements: "Areas for improvement",
    corrections: "Key corrections",
    modelAnswer: "Model answer",
    detailedFeedback: "Detailed feedback",
    nextPriority: "Next steps",
    original: "Original",
    corrected: "Corrected",
    grammar: "Grammar",
    vocabulary: "Vocabulary",
    structure: "Structure",
    content: "Content",
    generatedAt: "Generated",
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
  },
};

function L(lang: string, key: string) {
  const base = (lang || "en").split("-")[0];
  return labels[base]?.[key] ?? labels.en[key] ?? key;
}

function esc(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function clean(text?: string) {
  const t = (text || "").trim();
  return t
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/##/g, "")
    .replace(/#/g, "")
    .replace(/`/g, "")
    .trim();
}

function css() {
  return `
    *{box-sizing:border-box;}
    body{margin:0;padding:0;}
    .page{width:794px; padding:32px; background:#0b1220; color:#e6edf7;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial,
      "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;}
    .header{display:flex; align-items:flex-end; justify-content:space-between; padding:20px 22px; border-radius:16px;
      background: linear-gradient(135deg,#2d4cff,#7c3aed);}
    .brandTitle{font-size:22px; font-weight:800; letter-spacing:-0.02em;}
    .brandSub{font-size:12px; opacity:.9; margin-top:4px;}
    .meta{font-size:11px; opacity:.9;}

    .hero{display:flex; gap:16px; margin-top:16px;}
    .card{border-radius:16px; background:#111a2e; padding:18px; border:1px solid rgba(255,255,255,.08);} 
    .overallLabel{font-size:12px; opacity:.9;}
    .overallValue{margin-top:10px; display:flex; align-items:baseline; gap:8px;}
    .overallValue .big{font-size:44px; font-weight:900; letter-spacing:-0.04em;}
    .overallValue .muted{opacity:.8;}

    .sectionTitle{font-size:12px; opacity:.9; margin-bottom:12px;}
    .scores{display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;}
    .scoreItem{padding:12px; border-radius:14px; background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06);} 
    .scoreLabel{font-size:11px; opacity:.9;}
    .scoreValue{margin-top:6px; font-size:16px; font-weight:800;}
    .bar{height:6px; border-radius:999px; background: rgba(255,255,255,.10); overflow:hidden; margin-top:8px;}
    .barFill{height:100%; border-radius:999px; background: linear-gradient(90deg,#22c55e,#60a5fa);} 

    .grid{display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:16px;}
    .panel{border-radius:16px; background:#0f172a; padding:18px; border:1px solid rgba(255,255,255,.08);} 
    .panelTitle{font-size:13px; font-weight:800; margin-bottom:10px;}
    .list{margin:0; padding-left:18px; font-size:12px; line-height:1.55; color: rgba(230,237,247,.92);} 
    .list li{margin:6px 0;}
    .mt{margin-top:16px;}

    .corrList{display:flex; flex-direction:column; gap:10px;}
    .corrCard{display:flex; gap:10px; padding:12px; border-radius:14px; background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06);} 
    .corrIndex{width:22px; height:22px; border-radius:999px; display:flex; align-items:center; justify-content:center; background:#ef4444; color:#fff; font-size:11px; font-weight:800; flex:0 0 auto;}
    .corrRow{display:flex; gap:8px; align-items:flex-start;}
    .tag{display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; line-height:1.2; white-space:nowrap;}
    .tagBad{background: rgba(239,68,68,.14); color:#fecaca; border:1px solid rgba(239,68,68,.30);} 
    .tagGood{background: rgba(34,197,94,.14); color:#bbf7d0; border:1px solid rgba(34,197,94,.30);} 
    .corrText{font-size:12px; line-height:1.5; color: rgba(230,237,247,.92);} 
    .corrText.good{color:#bbf7d0;}
    .corrExplain{margin-top:6px; font-size:11px; color: rgba(230,237,247,.78);} 

    .mono{white-space:pre-wrap; font-size:12px; line-height:1.65; padding:12px; border-radius:12px; background: rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06);} 
    .body{white-space:pre-wrap; font-size:12px; line-height:1.65; color: rgba(230,237,247,.92);} 

    .footer{margin-top:18px; text-align:center; font-size:10px; color: rgba(230,237,247,.55);} 
  `;
}

function scoreItem(label: string, score: number) {
  const width = Math.min(100, Math.max(0, (score / 25) * 100));
  return `
    <div class="scoreItem">
      <div class="scoreLabel">${esc(label)}</div>
      <div class="scoreValue">${score}/25</div>
      <div class="bar"><div class="barFill" style="width:${width}%"></div></div>
    </div>
  `;
}

function html(result: WritingCorrectionResult, lang: string) {
  const now = new Date();
  const dateStr = now.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const strengths = (result.strengths || []).slice(0, 8);
  const improvements = (result.improvements || []).slice(0, 8);
  const next = (result.next_priority || []).slice(0, 6);
  const corrections = (result.corrections || []).slice(0, 12);

  const bullet = (s: string) => `<li>${esc(clean(s))}</li>`;

  const corrCard = (c: (typeof corrections)[number], idx: number) => `
    <div class="corrCard">
      <div class="corrIndex">${idx + 1}</div>
      <div class="corrBody">
        <div class="corrRow"><span class="tag tagBad">${esc(L(lang, "original"))}</span><span class="corrText">${esc(clean(c.original))}</span></div>
        <div class="corrRow"><span class="tag tagGood">${esc(L(lang, "corrected"))}</span><span class="corrText good">${esc(clean(c.corrected))}</span></div>
        ${c.explanation ? `<div class="corrExplain">${esc(clean(c.explanation))}</div>` : ""}
      </div>
    </div>
  `;

  return `
    <div class="page">
      <div class="header">
        <div class="brand">
          <div class="brandTitle">${esc(L(lang, "title"))}</div>
          <div class="brandSub">${esc(L(lang, "subtitle"))}</div>
        </div>
        <div class="meta">${esc(L(lang, "generatedAt"))}: ${esc(dateStr)}</div>
      </div>

      <div class="hero">
        <div class="card" style="flex:0 0 220px;">
          <div class="overallLabel">${esc(L(lang, "overall"))}</div>
          <div class="overallValue"><span class="big">${result.overall_score}</span><span class="muted">/100</span></div>
        </div>
        <div class="card" style="flex:1;">
          <div class="sectionTitle">${esc(L(lang, "breakdown"))}</div>
          <div class="scores">
            ${scoreItem(L(lang, "grammar"), result.grammar_score)}
            ${scoreItem(L(lang, "vocabulary"), result.vocabulary_score)}
            ${scoreItem(L(lang, "structure"), result.structure_score)}
            ${scoreItem(L(lang, "content"), result.content_score)}
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <div class="panelTitle">${esc(L(lang, "strengths"))}</div>
          <ul class="list">${strengths.map(bullet).join("")}</ul>
        </div>
        <div class="panel">
          <div class="panelTitle">${esc(L(lang, "improvements"))}</div>
          <ul class="list">${improvements.map(bullet).join("")}</ul>
        </div>
      </div>

      ${next.length ? `
        <div class="panel mt">
          <div class="panelTitle">${esc(L(lang, "nextPriority"))}</div>
          <ol class="list">${next.map((s) => `<li>${esc(clean(s))}</li>`).join("")}</ol>
        </div>
      ` : ""}

      ${corrections.length ? `
        <div class="panel mt">
          <div class="panelTitle">${esc(L(lang, "corrections"))}</div>
          <div class="corrList">${corrections.map(corrCard).join("")}</div>
        </div>
      ` : ""}

      ${result.model_answer ? `
        <div class="panel mt">
          <div class="panelTitle">${esc(L(lang, "modelAnswer"))}</div>
          <div class="mono">${esc(clean(result.model_answer))}</div>
        </div>
      ` : ""}

      ${result.detailed_feedback ? `
        <div class="panel mt">
          <div class="panelTitle">${esc(L(lang, "detailedFeedback"))}</div>
          <div class="body">${esc(clean(result.detailed_feedback))}</div>
        </div>
      ` : ""}

      <div class="footer">LUKATO AI • topikbot.kr</div>
    </div>
  `;
}

async function toCanvas(el: HTMLElement) {
  // wait for fonts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (document as any).fonts;
  if (f?.ready) {
    try {
      await f.ready;
    } catch {
      // ignore
    }
  }

  return html2canvas(el, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: "#0b1220",
  });
}

export async function generateWritingCorrectionPDF(options: WritingPDFOptions): Promise<void> {
  const lang = (options.language || "en").split("-")[0];
  const filename = options.filename || `TOPIK_Writing_Report_${Date.now()}.pdf`;

  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-10000px";
  root.style.top = "0";
  root.style.width = "794px";
  root.style.zIndex = "-1";

  const style = document.createElement("style");
  style.textContent = css();

  const container = document.createElement("div");
  container.innerHTML = html(options.result, lang);

  root.appendChild(style);
  root.appendChild(container);
  document.body.appendChild(root);

  try {
    const canvas = await toCanvas(root);
    const imgData = canvas.toDataURL("image/png");

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    doc.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      doc.addPage();
      doc.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight - margin * 2;
    }

    doc.save(filename);
  } finally {
    document.body.removeChild(root);
  }
}
