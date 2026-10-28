// A table as CSV text that Excel and Google Sheets open as it is: commas between cells, quotes around a cell that holds
// a comma, a quote or a line break, and a byte-order mark in front so Excel reads the Georgian letters right.
// A cell that starts like a formula (= + - @) gets an apostrophe, so a typed name can never run as one.

export const csvCell = (v: unknown): string => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: unknown[][]): string => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

/** Gives the browser the table as a file. */
export const downloadCsv = (name: string, rows: unknown[][]) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
