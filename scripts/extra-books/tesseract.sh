#!/bin/bash
# Reads the modern-letter scans page by page with tesseract (Georgian): $WORK/up/bNN.pdf -> $WORK/tess/bNN-PPP.txt
WORK=${EXTRA_BOOKS_WORK:-$HOME/extra-books-work}
mkdir -p "$WORK/tess" && cd "$WORK/tess" || exit 1
doit() { b=$1; p=$2; f=b${b}-$(printf %03d $p); [ -s $f.txt ] && return; pdftoppm -f $p -l $p -r 300 -gray -png "$WORK/up/b$b.pdf" /tmp/$f >/dev/null 2>&1; img=$(ls /tmp/$f*.png | head -1); OMP_THREAD_LIMIT=1 tesseract "$img" $f -l kat --psm 3 >/dev/null 2>&1; rm -f /tmp/$f*.png; }
export -f doit; export WORK
for b in "$@"; do n=$(pdfinfo "$WORK/up/b$b.pdf" | awk '/^Pages/{print $2}'); for p in $(seq 1 $n); do echo "$b $p"; done; done | xargs -P 2 -n 2 bash -c 'doit "$0" "$1"'
