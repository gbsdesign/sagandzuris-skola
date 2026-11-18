import React, { useEffect, useRef, useState } from 'react';
import { doc, increment, setDoc } from 'firebase/firestore';
import { Hand, Info, Send, X } from 'lucide-react';
import { db } from '../../../firebase';
import { useAuth } from '../../../context';
import { openSignIn } from '../../../components/access/SignInPrompt';
import { Button, Dot, Helper, RoundButton, Sheet } from '../../../components/ui2';
import type { ChurchWord } from '../../../data/churchWords';
import { buildWordIndex, lookupWord, normWord, sentenceAround, WORD_RE, type WordIndex } from '../../../utils/churchWords';
import { triggerHaptic } from '../../../utils/haptics';

// Old church words in a reading's text (boards x-idea-sitqva-0, -1, -2): each dictionary word gets a dotted line the first
// time it stands in a part of the text (a heading starts a new part; the well-known ones, `q`, get none); a tap opens its meaning in one sentence and the words
// it was met among. A long press (or a right click) on any word asks the same; a word the dictionary lacks can be sent to
// the school — only the word, no name (`wordRequests/{word}` {n, last}). The first visit shows a one-time hint.
//
// Use: put <WordMeanings el={textElement} html={text} /> just before the text; `el` is the element holding the text and
// `html` changes whenever the text does. The dictionary (data/churchWords.ts) loads only then.

type Dict = { words: ChurchWord[]; ix: WordIndex };
let dictLoad: Promise<Dict> | null = null;
const loadDict = () => (dictLoad ??= import('../../../data/churchWords').then(m => ({ words: m.CHURCH_WORDS, ix: buildWordIndex(m.CHURCH_WORDS) })));

const HINT_KEY = 'sg-words-hint';
const SENT_KEY = 'sg-words-sent';
const hintSeen = () => { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return true; } };
const markHint = () => { try { localStorage.setItem(HINT_KEY, '1'); } catch { /* shown again next time */ } };
const sentBefore = (w: string) => { try { return (JSON.parse(sessionStorage.getItem(SENT_KEY) || '[]') as string[]).includes(w); } catch { return false; } };
const markSent = (w: string) => {
  try { sessionStorage.setItem(SENT_KEY, JSON.stringify([...(JSON.parse(sessionStorage.getItem(SENT_KEY) || '[]') as string[]), w].slice(-50))); } catch { /* fine */ }
};

const KIND: Record<NonNullable<ChurchWord['k']> | 'o', string> = {
  o: 'ძველი ქართული სიტყვა', h: 'ებრაული სიტყვა', g: 'ბერძნული სიტყვა', c: 'საეკლესიო სიტყვა',
};

// what is not decorated: headings, verse numbers, buttons and links, the text's own marks
const SKIP = 'h1,h2,h3,h4,h5,h6,sup,button,a,script,style,[data-skip],.sg-word';
const BLOCK = 'p,li,div,blockquote,dd,td';

/** take the dotted words back out (before decorating anew) */
const undecorate = (root: HTMLElement) => {
  root.querySelectorAll('span.sg-word').forEach(s => {
    const parent = s.parentNode;
    s.replaceWith(document.createTextNode(s.textContent ?? ''));
    parent?.normalize();
  });
};

// a text node React keeps track of is never cut (React would lose it): only the text put in as HTML is decorated
const reactOwns = (n: Node) => Object.keys(n).some(k => k.startsWith('__reactFiber$'));

/** wrap the first meeting of each dictionary word in every part of the text; how many were wrapped */
const decorate = (root: HTMLElement, dict: Dict): number => {
  undecorate(root);
  const seen = new Set<number>();
  const wraps: { node: Text; at: number; len: number; i: number }[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      if (/^H[1-6]$/.test((n as Element).tagName)) seen.clear();
      continue;
    }
    const parent = n.parentElement;
    if (!parent || parent.closest(SKIP) || reactOwns(n)) continue;
    const text = n.nodeValue ?? '';
    for (const m of text.matchAll(WORD_RE)) {
      const i = lookupWord(dict.ix, m[0]);
      // a word most readers know gets no line (a long press still explains it)
      if (i < 0 || seen.has(i) || dict.words[i].q) continue;
      seen.add(i);
      wraps.push({ node: n as Text, at: m.index ?? 0, len: m[0].length, i });
    }
  }
  // from the last, so the earlier places in a text node stay where they were
  for (const w of wraps.reverse()) {
    const word = w.node.splitText(w.at);
    word.splitText(w.len);
    const span = document.createElement('span');
    span.className = 'sg-word';
    span.dataset.w = String(w.i);
    span.setAttribute('role', 'button');
    span.setAttribute('tabindex', '0');
    span.setAttribute('aria-haspopup', 'dialog');
    word.replaceWith(span);
    span.appendChild(word);
  }
  return wraps.length;
};

/** the word under a point of the screen and its place in its block's text */
const wordAt = (x: number, y: number, root: HTMLElement): { word: string; node: Text; at: number } | null => {
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  let node: Node | null = null;
  let offset = 0;
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; offset = p.offset; }
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; offset = r.startOffset; }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
  const text = node.nodeValue ?? '';
  for (const m of text.matchAll(WORD_RE)) {
    const s = m.index ?? 0;
    if (offset >= s && offset <= s + m[0].length) return { word: m[0], node: node as Text, at: s };
  }
  return null;
};

/** the words a place was met among: its block's text, a few words round it */
const contextOf = (node: Node, at: number, len: number, root: HTMLElement) => {
  const block = (node.parentElement?.closest(BLOCK) as HTMLElement | null) ?? root;
  const scope = root.contains(block) ? block : root;
  // the place's offset inside the block's whole text
  let offset = 0;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n && n !== node; n = walker.nextNode()) offset += (n.nodeValue ?? '').length;
  return sentenceAround(scope.textContent ?? '', offset + at, len);
};

type Open = { word: string; entry: number; seen: string } | { word: string; entry: -1 };

export const WordMeanings: React.FC<{ el: HTMLElement | null; html: string | null | undefined }> = ({ el, html }) => {
  const { user } = useAuth();
  const [dict, setDict] = useState<Dict | null>(null);
  const [count, setCount] = useState(0);
  const [hint, setHint] = useState(false);
  const [open, setOpen] = useState<Open | null>(null);
  const [sent, setSent] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const lit = useRef<HTMLElement | null>(null);

  useEffect(() => { void loadDict().then(setDict); }, []);

  // decorate the text when it or the element changes (ხუცური's old letters are not Georgian words here: nothing is found)
  useEffect(() => {
    if (!el || !dict || !html) return;
    const n = decorate(el, dict);
    setCount(n);
    return () => { if (el.isConnected) undecorate(el); };
  }, [el, dict, html]);

  // the one-time hint: shown the first time a text has dotted words, gone after ✕, a word tapped, or 15 seconds
  useEffect(() => {
    if (!count || hintSeen()) return;
    markHint();
    setHint(true);
    const t = window.setTimeout(() => setHint(false), 15_000);
    return () => window.clearTimeout(t);
  }, [count]);

  // taps on the dotted words, and a long press / right click on any word
  useEffect(() => {
    if (!el || !dict) return;
    const show = (span: HTMLElement) => {
      const i = Number(span.dataset.w);
      const node = span.firstChild;
      lit.current?.removeAttribute('data-on');
      span.setAttribute('data-on', '');
      lit.current = span;
      triggerHaptic(8);
      setHint(false);
      setOpen({ word: span.textContent ?? '', entry: i, seen: node ? contextOf(node, 0, (span.textContent ?? '').length, el) : '' });
    };
    const onClick = (e: MouseEvent) => {
      const span = (e.target as HTMLElement).closest<HTMLElement>('.sg-word');
      if (span && el.contains(span)) { e.preventDefault(); show(span); }
    };
    const onKey = (e: KeyboardEvent) => {
      const span = (e.target as HTMLElement).closest<HTMLElement>('.sg-word');
      if (span && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(span); }
    };
    const ask = (x: number, y: number) => {
      const hit = wordAt(x, y, el);
      if (!hit) return false;
      const span = hit.node.parentElement?.closest<HTMLElement>('.sg-word');
      if (span) { show(span); return true; }
      const i = lookupWord(dict.ix, hit.word);
      triggerHaptic(12);
      window.getSelection()?.removeAllRanges();
      setSent(sentBefore(normWord(hit.word)) ? 'done' : 'idle');
      setOpen(i >= 0
        ? { word: hit.word, entry: i, seen: contextOf(hit.node, hit.at, hit.word.length, el) }
        : { word: hit.word, entry: -1 });
      return true;
    };
    let timer = 0;
    let start: { x: number; y: number } | null = null;
    let fired = 0;
    const cancel = () => { window.clearTimeout(timer); start = null; };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      start = { x: e.clientX, y: e.clientY };
      timer = window.setTimeout(() => { if (start && ask(start.x, start.y)) fired = Date.now(); start = null; }, 550);
    };
    const onMove = (e: PointerEvent) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel();
    };
    const onMenu = (e: MouseEvent) => {
      // a finger's long press also raises the phone's menu: ours has answered already
      if (Date.now() - fired < 1500) { e.preventDefault(); return; }
      if (ask(e.clientX, e.clientY)) e.preventDefault();
    };
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointercancel', cancel);
    el.addEventListener('contextmenu', onMenu);
    window.addEventListener('scroll', cancel, { passive: true });
    return () => {
      cancel();
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', cancel);
      el.removeEventListener('pointercancel', cancel);
      el.removeEventListener('contextmenu', onMenu);
      window.removeEventListener('scroll', cancel);
    };
  }, [el, dict]);

  const close = () => {
    lit.current?.removeAttribute('data-on');
    lit.current = null;
    setOpen(null);
  };

  const report = async (word: string) => {
    if (!user) { openSignIn(); return; }
    const key = normWord(word);
    setSent('busy');
    try {
      await setDoc(doc(db, 'wordRequests', key), { n: increment(1), last: new Date().toISOString() }, { merge: true });
      markSent(key);
      setSent('done');
    } catch {
      setSent('error');
    }
  };

  const entry = open && open.entry >= 0 && dict ? dict.words[open.entry] : null;

  return (
    <>
      {hint && (
        <section role="status" className="sg-in mb-3 flex shrink-0 items-center gap-3 rounded-card bg-surf py-3 pr-2.5 pl-3.5 font-sans">
          <Dot icon={<Hand />} />
          <div className="min-w-0 flex-1">
            <p className="text-body leading-snug wrap-break-word">წერტილოვან სიტყვას შეეხე — გეტყვი, რას ნიშნავს.</p>
            <p className="mt-0.5 text-meta leading-snug text-mut wrap-break-word">ახსნები Claude-მა დაწერა, მასწავლებელს ჯერ არ შეუმოწმებია.</p>
          </div>
          <RoundButton label="გასაგებია, დახურე" size={36} tone="page" onClick={() => setHint(false)}><X /></RoundButton>
        </section>
      )}
      <Sheet open={!!open} title={open?.word ?? ''} onClose={close}>
        {open && entry && open.entry >= 0 && (
          <>
            <div className="shrink-0 px-1 text-meta font-semibold text-mut">
              {KIND[entry.k ?? 'o']}{normWord(open.word) !== normWord(entry.w) ? ` · „${entry.w}“` : ''}
            </div>
            <div className="shrink-0 rounded-card bg-surf px-[18px] py-4 text-head leading-normal wrap-break-word">{entry.m}</div>
            {'seen' in open && open.seen && (
              <p className="shrink-0 px-1.5 font-serif-ge text-body leading-normal text-mut wrap-break-word">„{open.seen}“</p>
            )}
          </>
        )}
        {open && open.entry < 0 && (
          <>
            <div className="shrink-0 rounded-card bg-surf px-[18px] py-4 text-lead leading-normal">ეს სიტყვა ლექსიკონში ჯერ არ არის.</div>
            <Button full icon={<Send />} disabled={sent === 'busy' || sent === 'done'} onClick={() => void report(open.word)}>
              {sent === 'done' ? 'გაიგზავნა — მადლობა' : sent === 'busy' ? 'იგზავნება…' : 'შეგვატყობინე — დავამატებთ'}
            </Button>
            {sent === 'error' && <p role="alert" className="px-1.5 text-meta text-danger">ვერ გაიგზავნა — შეამოწმე ინტერნეტი.</p>}
            <Helper icon={<Info />}>სკოლას მხოლოდ სიტყვა ეგზავნება, შენი სახელის გარეშე.</Helper>
          </>
        )}
      </Sheet>
    </>
  );
};
