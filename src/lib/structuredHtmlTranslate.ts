import { autoTranslateSegments, autoTranslateText } from "@/lib/autoTranslate";

/**
 * Translates ONLY text nodes while preserving the exact HTML tag structure.
 * This guarantees layout integrity (lists, paragraphs, bold/italic, etc.).
 */
export async function translateHtmlPreservingStructure(params: {
  html: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<string> {
  const { html, sourceLanguage, targetLanguage } = params;

  if (!html?.trim()) return "";
  if (sourceLanguage === targetLanguage) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Collect translatable text nodes in document order.
  const nodes: Text[] = [];
  const segments: string[] = [];
  const preserve: Array<{ leading: string; trailing: string }> = [];

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;

    // Skip text inside tags we never want to translate.
    const tag = parent?.tagName?.toLowerCase();
    if (tag && ["script", "style", "noscript"].includes(tag)) {
      current = walker.nextNode();
      continue;
    }

    const raw = textNode.nodeValue ?? "";
    if (raw.trim().length === 0) {
      current = walker.nextNode();
      continue;
    }

    // Preserve leading/trailing whitespace EXACTLY to avoid layout drift.
    const leadingMatch = raw.match(/^\s+/)?.[0] ?? "";
    const trailingMatch = raw.match(/\s+$/)?.[0] ?? "";
    const core = raw.slice(leadingMatch.length, raw.length - trailingMatch.length);

    nodes.push(textNode);
    segments.push(core);
    preserve.push({ leading: leadingMatch, trailing: trailingMatch });

    current = walker.nextNode();
  }

  if (segments.length === 0) return html;

  // Batch translate. If the backend can't return 1:1 segments, we hard-fail.
  const translatedSegments = await autoTranslateSegments({
    segments,
    sourceLanguage,
    targetLanguage,
  });

  if (translatedSegments.length !== nodes.length) {
    throw new Error("SEGMENT_TRANSLATION_MISMATCH");
  }

  // Replace text nodes only.
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].nodeValue = `${preserve[i].leading}${translatedSegments[i]}${preserve[i].trailing}`;
  }

  return doc.body.innerHTML;
}

/**
 * Convenience helper for translating plain text (title, etc.).
 */
export async function translatePlainText(params: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<string> {
  const { text, sourceLanguage, targetLanguage } = params;
  return autoTranslateText({ text, sourceLanguage, targetLanguage, format: "text" });
}
