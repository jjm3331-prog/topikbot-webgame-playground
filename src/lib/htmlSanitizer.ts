/**
 * HTML Sanitizer for translated content
 * - Preserves safe HTML structure from translation
 * - Removes dangerous attributes/scripts
 * - Ensures consistent rendering across languages
 */

// Allowed HTML tags that should be preserved
const ALLOWED_TAGS = new Set([
  // Block elements
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'code',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'br',
  // Inline elements
  'a', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
  'span', 'sub', 'sup', 'mark',
  // Media (kept but not duplicated in translation)
  'img', 'figure', 'figcaption', 'picture', 'source',
  'video', 'audio', 'iframe',
]);

// Allowed attributes per tag
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  '*': new Set(['class', 'id', 'style', 'dir', 'lang', 'title']),
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  iframe: new Set(['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow']),
  video: new Set(['src', 'controls', 'autoplay', 'muted', 'loop', 'poster', 'width', 'height']),
  audio: new Set(['src', 'controls', 'autoplay', 'muted', 'loop']),
  source: new Set(['src', 'type', 'media']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  ol: new Set(['start', 'type']),
};

// Dangerous patterns to remove
const DANGEROUS_PATTERNS = [
  /javascript:/gi,
  /data:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
];

/**
 * Sanitize HTML content for safe rendering
 * Preserves structure and allowed tags, removes dangerous content
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script and style tags completely
    doc.querySelectorAll('script, style, noscript, object, embed, form, input, button, select, textarea').forEach(el => el.remove());

    // Process all elements
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
    const elementsToProcess: Element[] = [];
    
    let node: Node | null = walker.currentNode;
    while (node = walker.nextNode()) {
      if (node instanceof Element) {
        elementsToProcess.push(node);
      }
    }

    for (const el of elementsToProcess) {
      const tagName = el.tagName.toLowerCase();

      // Remove disallowed tags but keep their text content
      if (!ALLOWED_TAGS.has(tagName)) {
        const textContent = el.textContent || '';
        if (textContent.trim()) {
          const textNode = doc.createTextNode(textContent);
          el.parentNode?.replaceChild(textNode, el);
        } else {
          el.remove();
        }
        continue;
      }

      // Filter attributes
      const allowedForTag = ALLOWED_ATTRS[tagName] || new Set();
      const globalAllowed = ALLOWED_ATTRS['*'];
      const attrsToRemove: string[] = [];

      for (const attr of Array.from(el.attributes)) {
        const attrName = attr.name.toLowerCase();
        
        // Check if attribute is allowed
        if (!allowedForTag.has(attrName) && !globalAllowed.has(attrName)) {
          attrsToRemove.push(attr.name);
          continue;
        }

        // Check for dangerous patterns in attribute values
        const value = attr.value;
        if (DANGEROUS_PATTERNS.some(pattern => pattern.test(value))) {
          attrsToRemove.push(attr.name);
          continue;
        }

        // Validate href for links
        if (attrName === 'href' && tagName === 'a') {
          try {
            const url = new URL(value, window.location.origin);
            if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
              attrsToRemove.push(attr.name);
            }
          } catch {
            // Invalid URL, but might be a relative path - keep it
            if (value.startsWith('javascript:') || value.startsWith('data:')) {
              attrsToRemove.push(attr.name);
            }
          }
        }
      }

      attrsToRemove.forEach(attr => el.removeAttribute(attr));
    }

    return doc.body.innerHTML;
  } catch (error) {
    console.error('HTML sanitization error:', error);
    // Fallback: escape HTML entirely
    return escapeHtml(html);
  }
}

/**
 * Escape HTML entities for safe text display
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Strip all HTML tags and return plain text
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Remove media elements (img, video, iframe, figure) from HTML
 * Used to avoid duplicating media in translation blocks
 */
export function stripMediaFromHtml(html: string): string {
  if (!html) return '';
  
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('img, picture, figure, video, audio, iframe, embed, object').forEach(el => el.remove());
    return doc.body.innerHTML.trim();
  } catch {
    return html;
  }
}

/**
 * Ensure HTML has proper structure (wrap plain text in paragraphs)
 */
export function ensureHtmlStructure(content: string): string {
  if (!content) return '';
  
  const trimmed = content.trim();
  
  // If already has HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return trimmed;
  }
  
  // Convert plain text with newlines to paragraphs
  return trimmed
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * Clean up translation artifacts (markdown leftovers, etc.)
 */
export function cleanTranslationArtifacts(text: string): string {
  if (!text) return '';
  
  return text
    // Remove markdown bold artifacts
    .replace(/\*\*\\$/gm, '')
    .replace(/\*\*$/gm, '')
    .replace(/^\*\*/gm, '')
    .replace(/\\\*/g, '*')
    .replace(/\s*\*\*\s*$/gm, '')
    // Normalize newlines
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    // Remove excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
