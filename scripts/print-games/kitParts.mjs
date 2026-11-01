// Parts shared by the musical games' print kits (2026-11-01): the score sheet (teams in columns, rounds in rows), the
// cover's „how a round goes“ steps and the team names. Each kit keeps its own words.
import { C, aso, esc, icon, page } from './lib.mjs';
import { app } from './melodies.mjs';

export const { TEAM_NAMES } = app;

/** a cover's step: an icon and a line */
export const step = (name, text, color = C.wine) => `<div class="rs-step">${icon(name, { size: 6, color, width: 1.7 })}<span>${text}</span></div>`;

/**
 * The score sheet, the same on both sides: the teams' names on top, a row per round (`what`: a second column the host
 * fills, e.g. the melody's number), the sum, the winner, and four reminders `[icon, bold, text]`.
 */
export const scoreSheet = ({ title, rows, hint, what = '', remind }) => page(`<div class="rs-sc">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="rs-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="rs-scHint">${hint}</p>
  <table class="rs-tab">
    <tr><th class="r">რაუნდი</th>${what ? `<th class="r w">${esc(what)}</th>` : ''}${TEAM_NAMES.map(n => `<th><span>${esc(n)}</span><i></i></th>`).join('')}</tr>
    ${Array.from({ length: rows }, (_, r) => `<tr><td class="r">${r + 1}</td>${what ? '<td class="r w"></td>' : ''}${TEAM_NAMES.map(() => '<td></td>').join('')}</tr>`).join('')}
    <tr class="sum"><td class="r">ჯამი</td>${what ? '<td class="r w"></td>' : ''}${TEAM_NAMES.map(() => '<td></td>').join('')}</tr>
  </table>
  <div class="rs-win">გამარჯვებული გუნდი: <i></i></div>
  <div class="rs-remind box">${remind.map(([name, bold, text, color = C.wine]) => `<div>${icon(name, { size: 5, color, width: 1.9 })}<span><b>${bold}</b> — ${text}</span></div>`).join('')}</div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · ქულების ფურცელი</div>`, 'rs-scP');

export const partsCss = `
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:11pt;line-height:1.4}
.rulesP .lead{font-size:11pt}
.cover .lead{margin-bottom:5mm}
.rs-step{display:flex;gap:2.6mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.4mm}
.rs-step svg{flex:none;margin-top:.2mm}
.rs-sc{position:absolute;inset:12mm 12mm 12mm}
.rs-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.rs-scHead .aso{font-size:15pt;color:var(--wine);white-space:nowrap}
.rs-scHead b{font-size:14pt;color:var(--wine);white-space:nowrap}
.rs-date{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline;white-space:nowrap}
.rs-date i{display:inline-block;width:22mm;border-bottom:.25mm solid #bba98f}
.rs-scHint{margin:2.6mm 0 3mm;font-size:10pt;line-height:1.35;color:var(--brown)}
table.rs-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.rs-tab th,.rs-tab td{border:.25mm solid #bba98f;text-align:center}
.rs-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;padding:1.2mm .5mm 1mm}
.rs-tab th span{display:block}
.rs-tab th i{display:block;margin:2.4mm 2mm .4mm;border-bottom:.25mm solid #bba98f;height:3.5mm}
.rs-tab th.r,.rs-tab td.r{width:15mm}
.rs-tab td{height:13.2mm;font-size:12pt}
.rs-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.rs-tab td.w{background:#fff;color:var(--brown)}
.rs-tab tr:nth-child(odd) td:not(.r){background:#fdfaf3}
.rs-tab tr.sum td{height:13mm;background:#fbf6ec;border-top:.6mm solid var(--wine)}
.rs-tab tr.sum td.r{font-size:10pt}
.rs-win{display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);margin:4mm 0 3mm}
.rs-win i{flex:1;border-bottom:.3mm solid #bba98f}
.rs-remind{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.4pt;line-height:1.3}
.rs-remind>div{display:flex;gap:2mm;align-items:flex-start}
.rs-remind svg{flex:none}
.rs-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;
