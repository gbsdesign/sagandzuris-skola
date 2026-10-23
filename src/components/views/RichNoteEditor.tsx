import React, { useEffect, useRef, useState } from 'react';
import { Bold, Check, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline, X } from 'lucide-react';
import { safeNoteHtml } from '../../utils/richNote';

// A habit's description with a small toolbar (bold, italic, underline, lists, a link, clearing the formatting).
// Pasted text comes in plain; the note is made safe (utils/richNote) and saved when the field is left or folded away.

/** how a formatted note looks, in the editor and under ⓘ */
export const RICH_TEXT =
  'break-words [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_li]:my-0.5 [&_a]:text-[#7a2028] [&_a]:underline [&_a]:underline-offset-2';

type Tool = { cmd: string; label: string; icon: React.ReactNode };
const TOOLS: (Tool | null)[] = [
  { cmd: 'bold', label: 'მუქი', icon: <Bold /> },
  { cmd: 'italic', label: 'დახრილი', icon: <Italic /> },
  { cmd: 'underline', label: 'ხაზგასმული', icon: <Underline /> },
  null,
  { cmd: 'insertOrderedList', label: 'დანომრილი სია', icon: <ListOrdered /> },
  { cmd: 'insertUnorderedList', label: 'სია', icon: <List /> },
  null,
  { cmd: 'createLink', label: 'ბმული', icon: <Link2 /> },
  { cmd: 'removeFormat', label: 'ფორმატის მოხსნა', icon: <RemoveFormatting /> },
];
const STATEFUL = ['bold', 'italic', 'underline', 'insertOrderedList', 'insertUnorderedList'];

const BTN =
  'w-9 h-9 shrink-0 rounded-lg flex items-center justify-center cursor-pointer transition-colors [&>svg]:w-[18px] [&>svg]:h-[18px]';

export const RichNoteEditor: React.FC<{ id: string; value: string; placeholder: string; onSave: (html: string) => void }> = ({
  id,
  value,
  placeholder,
  onSave,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const saved = useRef(value);
  const save = useRef(onSave);
  save.current = onSave;
  const range = useRef<Range | null>(null);
  const [on, setOn] = useState<string[]>([]);
  const [linking, setLinking] = useState<string | null>(null);

  const flush = () => {
    const html = safeNoteHtml(box.current?.innerHTML ?? '');
    if (html === saved.current) return;
    saved.current = html;
    save.current(html);
  };

  useEffect(() => {
    if (box.current) box.current.innerHTML = value;
    // the toolbar shows what the caret stands in
    const look = () => {
      if (!box.current?.contains(document.getSelection()?.anchorNode ?? null)) return;
      setOn(STATEFUL.filter(c => document.queryCommandState(c)));
    };
    document.addEventListener('selectionchange', look);
    return () => {
      document.removeEventListener('selectionchange', look);
      flush();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (cmd: string) => {
    box.current?.focus();
    if (cmd === 'createLink') {
      const sel = document.getSelection();
      range.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
      setLinking('https://');
      return;
    }
    document.execCommand(cmd);
    if (cmd === 'removeFormat') document.execCommand('unlink');
    setOn(STATEFUL.filter(c => document.queryCommandState(c)));
  };

  const addLink = () => {
    const url = (linking ?? '').trim();
    setLinking(null);
    if (!/^(https?:\/\/|mailto:)\S+$/i.test(url) || url === 'https://') return;
    box.current?.focus();
    const sel = document.getSelection();
    if (range.current && sel) {
      sel.removeAllRanges();
      sel.addRange(range.current);
    }
    if (sel && !sel.isCollapsed) document.execCommand('createLink', false, url);
    else document.execCommand('insertHTML', false, `<a href="${url.replace(/"/g, '%22')}">${url.replace(/</g, '&lt;')}</a>&nbsp;`);
    flush();
  };

  return (
    // the whole width under its label, so the toolbar keeps to one line
    <div className="basis-full min-w-0 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus-within:ring-2 focus-within:ring-[#7a2028]/40 transition">
      <div role="toolbar" aria-label="ფორმატი" className="flex flex-wrap items-center gap-0.5 px-1 pt-1">
        {TOOLS.map((t, i) =>
          t ? (
            <button
              key={t.cmd}
              type="button"
              title={t.label}
              aria-label={t.label}
              aria-pressed={STATEFUL.includes(t.cmd) ? on.includes(t.cmd) : undefined}
              // the text keeps its selection while a tool is pressed
              onMouseDown={e => e.preventDefault()}
              onClick={() => run(t.cmd)}
              className={`${BTN} ${on.includes(t.cmd) || (t.cmd === 'createLink' && linking !== null) ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#6a5646] hover:bg-[#7a2028]/[0.06]'}`}
            >
              {t.icon}
            </button>
          ) : (
            <span key={i} className="w-px h-5 mx-1 bg-[#e8dcc8]" aria-hidden />
          )
        )}
      </div>
      {linking !== null && (
        <div className="flex items-center gap-1 px-2 pt-1 animate-in fade-in duration-150">
          <input
            autoFocus
            type="url"
            inputMode="url"
            value={linking}
            aria-label="ბმულის მისამართი"
            onChange={e => setLinking(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addLink(); }
              if (e.key === 'Escape') setLinking(null);
            }}
            className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[14px] text-[#2a2017] outline-none focus:ring-[#7a2028]/40"
          />
          <button type="button" aria-label="ბმულის დამატება" onClick={addLink} className={`${BTN} text-[#7a2028] hover:bg-[#7a2028]/[0.06]`}>
            <Check />
          </button>
          <button type="button" aria-label="გაუქმება" onClick={() => setLinking(null)} className={`${BTN} text-[#a08a76] hover:bg-[#7a2028]/[0.06]`}>
            <X />
          </button>
        </div>
      )}
      <div
        ref={box}
        id={`note-${id}`}
        role="textbox"
        aria-multiline="true"
        aria-label="აღწერა"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onBlur={flush}
        onPaste={e => {
          e.preventDefault();
          document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        }}
        className={`${RICH_TEXT} min-h-[72px] max-h-64 overflow-y-auto px-3 py-2 text-[14px] leading-relaxed text-[#2a2017] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#b3a594]`}
      />
    </div>
  );
};
