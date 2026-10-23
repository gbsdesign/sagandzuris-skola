// A habit's formatted note: bold, italic, underline, lists, line breaks and links (https or mailto) only. What a member
// writes is kept as this safe HTML — every other tag and attribute taken away — and made safe again before it is shown.

export const MAX_RICH_NOTE = 3000;

const KEEP = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'OL', 'UL', 'LI', 'A', 'BR', 'P', 'DIV']);
const DROP = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'IFRAME', 'OBJECT', 'SVG', 'MATH']);

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const safeHref = (href: string | null) => (href && /^(https?:\/\/|mailto:)/i.test(href.trim()) ? href.trim() : null);

const copy = (from: Node, to: Node, doc: Document) => {
  from.childNodes.forEach(n => {
    if (n.nodeType === Node.TEXT_NODE) {
      to.appendChild(doc.createTextNode(n.textContent || ''));
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (n as Element).tagName;
    if (DROP.has(tag)) return;
    // an unknown tag goes, its text stays
    if (!KEEP.has(tag)) return copy(n, to, doc);
    const href = tag === 'A' ? safeHref((n as Element).getAttribute('href')) : null;
    if (tag === 'A' && !href) return copy(n, to, doc);
    const el = doc.createElement(tag === 'STRONG' ? 'b' : tag === 'EM' ? 'i' : tag.toLowerCase());
    if (href) {
      el.setAttribute('href', href);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
    copy(n, el, doc);
    to.appendChild(el);
  });
};

/** The note with only the allowed formatting left; '' when it holds no text. */
export const safeNoteHtml = (html: string): string => {
  if (typeof DOMParser === 'undefined') return escape(html.replace(/<[^>]*>/g, ' ').trim());
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out = doc.createElement('div');
  copy(doc.body, out, doc);
  return out.textContent?.trim() ? out.innerHTML.trim().slice(0, MAX_RICH_NOTE) : '';
};

/** The note as plain text (line by line, list items with „•“). */
export const noteText = (html: string): string => {
  const lined = html.replace(/<br\s*\/?>/gi, '\n').replace(/<li>/gi, '• ').replace(/<\/(p|div|li)>/gi, '\n');
  if (typeof DOMParser === 'undefined') return lined.replace(/<[^>]*>/g, '').trim();
  const doc = new DOMParser().parseFromString(lined, 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

/** An old plain note as the editor's starting HTML. */
export const plainToHtml = (text: string): string => escape(text).replace(/\n/g, '<br>');
