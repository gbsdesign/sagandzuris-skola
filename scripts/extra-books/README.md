# „დამატებითი წიგნები“

The liturgical books the monastery app does not have, turned into the app's book files
(`public/wignebi-x/<NN>.json`, the shape of `public/wignebi`) and the menu `src/data/extraBooks.ts`.
Kept apart from `public/wignebi`: the monastery app's daily update rebuilds that folder and would refuse an unknown one.

The PDFs are not in the repo (the school's own collection, sorted into 62 books, `bNN.pdf` by the list of 2026-11-18).
Everything works in one folder, `$EXTRA_BOOKS_WORK` (default `~/extra-books-work`):

| what | where | made by |
|---|---|---|
| the PDFs | `up/bNN.pdf` | by hand |
| the church books' word list | `words.pkl` | a Counter of every word in `public/wignebi/**` and the converted books |
| a modern-letter scan read by tesseract | `tess/bNN-PPP.txt` | `tesseract.sh 53` |
| the computer-set old-script scan (b46) | `d46.pkl` | `pdfimages -png up/b46.pdf n46/p`, then `decipher.py 'n46/p-*.png' 1.0 140 d46.pkl 0,1,2` |
| the 19th-century print kept as pictures (b52) | `n52/p-*.png` | `pdfimages -png up/b52.pdf n52/p` |
| „ქართველ წმიდათა ცხოვრებანი“ (b62) | `up/b62.pdf` | by hand — its scanned-text layer is read by `lives.py` |

Then `python3 -I gen.py` writes the books and the menu.

- `pdfbook.py` — a text PDF → sections: red, bold or bigger lines are rubrics, running heads and page numbers go, a word's first
  letter drawn as a picture is filled in from the word list, old legacy fonts are converted (`legacy.py`, the wignebi table).
- `seg.py` · `tmpl.py` · `ocr.py` · `decipher.py` — old-script (nuskhuri) pages: glyphs cut out, matched to the app's own
  „SG Nuskhuri“ / „SG Asomtavruli“ letters, grouped by shape and the groups' letters improved until most words are real words.
- `lives.py` — „ქართველ წმიდათა ცხოვრებანი“ (2018): a book a month (+ the movable commemorations and the closing hymn
  „ქებაი და დიდებაი ქართულისა ენისაი“), part 0 = the month's list, then each life with its date. A life = the date line
  (`2 (15) იანვარი`) and the title lines above it; ღ read as ლ, თჳს and ჴ are put right against the app's own saints' lives
  (`public/lives`); the titles the scanner misread are written out in `TITLES`, read from the page pictures.
- `ocrbook.py` — scanned text → sections, with small fixes from the word list and scanner noise dropped. Such books carry
  `scan: true` and the reader says the text may hold mistakes.

Left out (2026-11-18): the 1711 Kondaki and „ღმრთისმშობლის აწ დები“ (tiny old-script scans no reader can read) and the
books the app already has. „ქართველ წმიდათა ცხოვრებანი“ went in the same day at the user's wish.
