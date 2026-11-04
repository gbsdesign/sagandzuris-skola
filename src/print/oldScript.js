// The old scripts on paper, shared by the kits that teach them („ასოების ბადე“, „ხუცური წარწერა“): the app's own fonts for
// nuskhuri and asomtavruli (public/fonts — the „SG Old Script“ of index.css), the alphabet's key strip (the old letter over
// today's) and the big key of the 33 letters in the three scripts with their old names.
import { esc } from './lib.js';
import * as __d0 from '../utils/oldScripts';

const { toScript, ALPHABET, LETTER_NAMES, SCRIPT_LABEL } = ({ ...__d0 });

// only the old scripts' code points, drawn ~1.5× wide by the app's fonts — brought to size by 70%, as on the site
export const oldHead = `<style>
@font-face{font-family:'SGOld';src:url('/fonts/sg-nuskhuri.woff') format('woff');unicode-range:U+2D00-2D25;size-adjust:70%}
@font-face{font-family:'SGOld';src:url('/fonts/sg-asomtavruli.woff') format('woff');unicode-range:U+10A0-10C5;size-adjust:70%}
</style>`;

export const letterCls = script => (script === 'mkhedruli' ? 'mk' : 'old');

/** the alphabet's key: two rows, the old letter over today's */
export const keyStrip = (script, label = `ანბანის გასაღები: ზემოთ ${SCRIPT_LABEL[script]}, ქვემოთ დღევანდელი ასო`) => {
  const rows = [ALPHABET.slice(0, 17), ALPHABET.slice(17)];
  return `<div class="os-key">${label ? `<div class="os-keyLabel">${esc(label)}</div>` : ''}${rows.map(r => `<div class="os-keyRow">${r.map(ch => `<span><b class="old">${toScript(ch, script)}</b><i>${ch}</i></span>`).join('')}</div>`).join('')}</div>`;
};

/** the big key: three columns of eleven letters, each in the three scripts with its old name */
const SCRIPTS3 = ['mkhedruli', 'nuskhuri', 'asomtavruli'];
const HEAD3 = { mkhedruli: 'მხედ&shy;რული', nuskhuri: 'ნუს&shy;ხური', asomtavruli: 'ასომ&shy;თავ&shy;რული' };
export const keyColumns = () => `<div class="os-kcols">${[0, 1, 2].map(c => `<table class="os-kt"><tr>${SCRIPTS3.map(s => `<th>${HEAD3[s]}</th>`).join('')}<th>სახელი</th></tr>${ALPHABET.slice(c * 11, c * 11 + 11).map((ch, i) => `<tr>${SCRIPTS3.map(s => `<td class="${letterCls(s)}">${toScript(ch, s)}</td>`).join('')}<td class="nm">${esc(LETTER_NAMES[c * 11 + i])}</td></tr>`).join('')}</table>`).join('')}</div>`;

/** three lines on the three scripts' history */
export const scriptsNote = `<div class="box os-hist">
    <p><b>ასომთავრული</b> — ქართული დამწერლობის უძველესი სახე, V საუკუნის წარწერებიდან ვიცნობთ: დიდი, მრგვალი ასოები.</p>
    <p><b>ნუსხური</b> — IX საუკუნიდან ხელნაწერი წიგნების ასოები. ასომთავრულს და ნუსხურს ერთად <b>ხუცური</b> ჰქვია.</p>
    <p><b>მხედრული</b> — X საუკუნიდან; დღეს ამ ასოებით ვწერთ. სამივეს ერთი და იგივე 33 ასო და ერთი რიგი აქვს.</p>
  </div>`;

export const oldCss = `
.old{font-family:'SGOld','SansKa',sans-serif}
.os-keyLabel{font-size:8.6pt;color:var(--muted);margin-bottom:1mm}
.os-keyRow{display:flex;gap:.6mm;margin-bottom:.8mm}
.os-keyRow span{width:10.1mm;height:10.6mm;border:.2mm solid var(--line);border-radius:.9mm;background:var(--paper);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5mm}
.os-keyRow b{font-size:15pt;font-weight:400;line-height:1;color:#2f2018}
.os-keyRow i{font-style:normal;font-family:'SansKa',sans-serif;font-weight:700;font-size:8.2pt;line-height:1;color:var(--muted)}
.os-kcols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5mm;margin-top:2mm}
table.os-kt{border-collapse:collapse;width:100%;table-layout:fixed}
table.os-kt th{font-size:7.6pt;color:var(--wine);font-weight:700;padding:1mm .3mm;border-bottom:.3mm solid var(--gold);text-align:center;vertical-align:bottom;line-height:1.15;hyphens:manual}
table.os-kt td{height:17.4mm;text-align:center;border-bottom:.15mm solid var(--line);line-height:1}
table.os-kt td.mk{font-family:'SansKa',sans-serif;font-weight:700;font-size:22pt}
table.os-kt td.old{font-size:27pt}
table.os-kt td.nm{font-size:10.5pt;color:var(--brown);font-weight:700}
.os-hist{margin-top:4mm;font-size:9.6pt;line-height:1.35}
.os-hist p{margin:0 0 1.2mm}
.os-hist b{color:var(--wine)}
`;
