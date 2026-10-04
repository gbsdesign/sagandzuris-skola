// "ჩემი სამოსი" assets: cuts scripts/samosi/chokha.png into part layers (background and face removed)
// with headless Chrome's canvas, and writes them as WebP to public/home/samosi (see src/data/samosiData.ts).
// Cartridges and akhalukhi are traced polygons (P). The belt, its hanging strap and the dagger are dark on the
// dark coat, so they are found by walking along their centre lines (AX) and detecting the edge on both sides,
// then smoothed; the hand stays in front of them. All edges are anti-aliased.
// Usage: node scripts/build-samosi.mjs   (set CHROME_PATH if Chrome is installed elsewhere)
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'samosi-'));
const srcPng = path.join(project, 'scripts', 'samosi', 'chokha.png');
const outDir = path.join(project, 'public', 'home', 'samosi');
fs.mkdirSync(outDir, { recursive: true });

const dataUrl = 'data:image/png;base64,' + fs.readFileSync(srcPng).toString('base64');

// polygons in photo pixels (406×702)
const P = {
  head: [[140,0],[290,0],[290,48],[252,53],[245,56],[235,61],[225,65],[216,67.5],[210,65],[200,59],[190,53],[181,48],[140,46]],
  akhalukhi: [[181,49],[190,54],[200,60],[210,66],[216,68],[225,65],[235,60],[245,55],[252,51],[251,60],[250,75],[249,98],[247,118],[243,138],[238,155],[232,175],[227,192],[224,201],[221,201],[217,192],[211,175],[205,155],[199,137],[192,117],[185,97],[179,75],[177,62]],
  gzL: [[111,160],[124,152],[137,146],[149,141],[160,137],[172,133],[183,129],[191,129],[196,138],[201,155],[206,172],[210,186],[212,196],[201,202],[183,210],[166,219],[150,226],[133,233],[126,215],[119,195],[114,178],[110,166]],
  gzR: [[250,136],[257,126],[269,131],[280,137],[290,143],[300,149],[309,154],[318,160],[324,167],[324,183],[318,200],[312,215],[306,232],[303,239],[292,231],[280,222],[265,212],[250,202],[235,192],[237,180],[242,165],[246,150]],
  holeR: [[294,238],[330,238],[330,437],[304,437],[302,338],[292,328]],
  holeL: [[86,236],[121,236],[121,332],[86,332]],
};
// centre lines [points, max half-width]; the pommel is traced round its centre
const AX = {
  dagger: [[[188,355],[200,366],[213,377],[232,391],[252,405],[275,422],[300,441],[313,451]], 16],
  band: [[[188,345.8],[205,346],[230,345.6],[260,345.4],[283,345]], 9],
  strapUp: [[[285,331],[286,341],[290,376],[294,413],[296,436],[298,447]], 10],
  strapLow: [[[304,486],[304.5,500],[304.5,545],[304.3,575],[304,595]], 7],
};
const POMMEL = [183.3, 348.6, 8, 12];

// the work runs synchronously in the load handler, so --dump-dom waits for it to finish
const page = `<!doctype html><html><body>
<img id="src" src="${dataUrl}">
<script>
const P = ${JSON.stringify(P)}, AX = ${JSON.stringify(AX)}, POMMEL = ${JSON.stringify(POMMEL)};
window.addEventListener('load', () => {
  const out = {};
  try {
    const W = 406, H = 702, N = W * H;
    const img = document.getElementById('src');
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
    const S = cx.getImageData(0, 0, W, H).data;

    const polyCover = (...polys) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff';
      for (const p of polys) { x.beginPath(); p.forEach(([px, py], k) => k ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.fill(); }
      const d = x.getImageData(0, 0, W, H).data; const m = new Float32Array(N);
      for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] / 255;
      return m;
    };
    const polyMask = (...polys) => { const c = polyCover(...polys); const m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = c[i] > 0.5 ? 1 : 0; return m; };
    const rgbAt = i => [S[i*4], S[i*4+1], S[i*4+2]];
    const isBgRGB = ([r, g, b]) => Math.min(r, g, b) > 192 && Math.max(r, g, b) - Math.min(r, g, b) < 24;
    const isSkinRGB = ([r, g, b]) => r - b > 26 && r > 80;
    // belt, scabbard and silver are neutral; the coat is clearly blue (b/r > 2.2 in samples, belt and scabbard < 1.6)
    const isObjRGB = c => !isBgRGB(c) && !isSkinRGB(c) && c[2] / (c[0] + 4) < 1.85 && c[2] / (c[1] + 4) < 1.5;
    const sampleAt = (x, y) => {
      const X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y;
      const px = (a, b) => rgbAt(Math.max(0, Math.min(H - 1, b)) * W + Math.max(0, Math.min(W - 1, a)));
      const p00 = px(X, Y), p10 = px(X + 1, Y), p01 = px(X, Y + 1), p11 = px(X + 1, Y + 1);
      return [0, 1, 2].map(k => p00[k] * (1 - fx) * (1 - fy) + p10[k] * fx * (1 - fy) + p01[k] * (1 - fx) * fy + p11[k] * fx * fy);
    };

    const components = (m, keep) => {
      const lab = new Int32Array(N); let n = 0; const sizes = [0];
      for (let s = 0; s < N; s++) {
        if (!m[s] || lab[s]) continue;
        n++; let size = 0; const st = [s]; lab[s] = n;
        while (st.length) {
          const i = st.pop(); size++;
          const x = i % W, y = (i - x) / W;
          const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
          for (const j of nb) if (j >= 0 && m[j] && !lab[j]) { lab[j] = n; st.push(j); }
        }
        sizes.push(size);
      }
      const r = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (lab[i] && keep(sizes[lab[i]], sizes)) r[i] = 1;
      return r;
    };

    // ---- background, face, figure ----
    const isBg = i => isBgRGB(rgbAt(i));
    const bg = new Uint8Array(N); const st = [];
    for (let x = 0; x < W; x++) st.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) st.push(y * W, y * W + W - 1);
    while (st.length) { const i = st.pop(); if (bg[i] || !isBg(i)) continue; bg[i] = 1; const x = i % W, y = (i - x) / W; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
    const holes = polyMask(P.holeR, P.holeL);
    for (let i = 0; i < N; i++) if (holes[i] && isBg(i)) bg[i] = 1;
    const headCov = polyCover(P.head);
    const head = new Uint8Array(N); for (let i = 0; i < N; i++) head[i] = headCov[i] > 0.97 ? 1 : 0;
    let fg = new Uint8Array(N);
    for (let i = 0; i < N; i++) fg[i] = !bg[i] && !head[i] && i < 695 * W ? 1 : 0;
    fg = components(fg, (s, all) => s === Math.max(...all.slice(1)));

    // soft outer edge: estimate alpha for pixels touching the background and remove the light fringe
    const A = new Float32Array(N); const C = new Uint8ClampedArray(S);
    for (let i = 0; i < N; i++) A[i] = fg[i];
    const dist = new Uint8Array(N).fill(9);
    for (let i = 0; i < N; i++) if (!fg[i]) dist[i] = 0;
    for (let pass = 1; pass <= 4; pass++) for (let i = 0; i < N; i++) { if (dist[i] !== 9) continue; const x = i % W, y = (i - x) / W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && dist[j] === pass - 1) { dist[i] = pass; break; } }
    for (let i = 0; i < N; i++) {
      if (dist[i] !== 1) continue;
      const x = i % W, y = (i - x) / W; let B = [0, 0, 0], nb = 0, F = [0, 0, 0], nf = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || X >= W || Y < 0 || Y >= H) continue; const j = Y * W + X;
        if (!fg[j] && Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && !head[j]) { B[0] += S[j*4]; B[1] += S[j*4+1]; B[2] += S[j*4+2]; nb++; }
        if (fg[j] && dist[j] >= 3) { F[0] += S[j*4]; F[1] += S[j*4+1]; F[2] += S[j*4+2]; nf++; }
      }
      if (!nb || !nf) continue;
      B = B.map(v => v / nb); F = F.map(v => v / nf);
      const c = rgbAt(i);
      const d = [F[0] - B[0], F[1] - B[1], F[2] - B[2]]; const dd = d[0]*d[0] + d[1]*d[1] + d[2]*d[2];
      if (dd < 400) continue;
      let a = ((c[0]-B[0])*d[0] + (c[1]-B[1])*d[1] + (c[2]-B[2])*d[2]) / dd;
      a = Math.max(0, Math.min(1, a));
      A[i] = a < 0.12 ? 0 : a;
      if (a >= 0.12) for (let k = 0; k < 3; k++) C[i*4+k] = (c[k] - (1 - a) * B[k]) / a;
    }
    // smooth (anti-aliased) neckline where the face was cut away
    for (let i = 0; i < N; i++) if (fg[i] && headCov[i] > 0) A[i] *= 1 - headCov[i];

    // ---- belt, strap, dagger: edge tracing along centre lines ----
    // the hand (skin), softened a little so its outline over the scabbard and strap is smooth
    const skin = new Float32Array(N);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      let s = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += isSkinRGB(rgbAt((y + dy) * W + x + dx)) ? 1 : 0;
      skin[y * W + x] = s / 9;
    }
    const smooth = (v, med, avg) => {
      const n = v.length; const a = v.map((_, i) => { const w = []; for (let d = -med; d <= med; d++) w.push(v[Math.max(0, Math.min(n - 1, i + d))]); w.sort((p, q) => p - q); return w[med]; });
      return a.map((_, i) => { let s = 0; for (let d = -avg; d <= avg; d++) s += a[Math.max(0, Math.min(n - 1, i + d))]; return s / (2 * avg + 1); });
    };
    const fillGaps = v => {
      const n = v.length; const r = v.slice(); const ok = r.map(x => !Number.isNaN(x));
      const first = ok.indexOf(true), last = ok.lastIndexOf(true);
      if (first < 0) return r.map(() => 0);
      for (let i = 0; i < first; i++) r[i] = r[first];
      for (let i = last + 1; i < n; i++) r[i] = r[last];
      for (let i = first; i <= last; i++) if (!ok[i]) { let j = i; while (!ok[j]) j++; const a = r[i - 1], b = r[j]; for (let k = i; k < j; k++) r[k] = a + (b - a) * (k - i + 1) / (j - i + 1); i = j; }
      return r;
    };
    // walk the centre line in 1px steps; across it (0.5px steps) find the run of belt/dagger colour nearest the line
    // bright: near-white silver highlights count as the object (only the strap borders the real background)
    const trace = ([axis, maxHalf], bright) => {
      const isObj = c => bright ? !isSkinRGB(c) && c[2] / (c[0] + 4) < 1.85 && c[2] / (c[1] + 4) < 1.5 : isObjRGB(c);
      const pts = [];
      for (let k = 0; k < axis.length - 1; k++) {
        const [ax, ay] = axis[k], [bx, by] = axis[k + 1]; const len = Math.hypot(bx - ax, by - ay); const n = Math.max(1, Math.round(len));
        for (let j = 0; j < n; j++) pts.push({ x: ax + (bx - ax) * j / n, y: ay + (by - ay) * j / n, dx: (bx - ax) / len, dy: (by - ay) / len });
      }
      const last = axis[axis.length - 1]; pts.push({ x: last[0], y: last[1], dx: pts[pts.length - 1].dx, dy: pts[pts.length - 1].dy });
      const Ls = [], Rs = []; let firstOcc = -1;
      const step = 0.5, M = Math.round(maxHalf / step);
      pts.forEach((p, idx) => {
        const nx = -p.dy, ny = p.dx;
        if (skin[Math.round(p.y) * W + Math.round(p.x)] > 0.5) { if (firstOcc < 0) firstOcc = idx; Ls.push(NaN); Rs.push(NaN); return; }
        const arr = []; for (let k = -M; k <= M; k++) arr.push(isObj(sampleAt(p.x + nx * k * step, p.y + ny * k * step)));
        // bridge gaps up to 2.5px: dark engraving lines inside the silver must not split it
        for (let k = 1; k < arr.length; k++) if (!arr[k] && arr[k - 1]) { let e = k; while (e < arr.length && !arr[e]) e++; if (e < arr.length && e - k <= 5) for (let q = k; q < e; q++) arr[q] = true; k = e; }
        let best = null;
        for (let k = 0; k < arr.length; k++) if (arr[k]) {
          let e = k; while (e + 1 < arr.length && arr[e + 1]) e++;
          const a0 = (k - M) * step, a1 = (e - M) * step; const d = a0 <= 0 && a1 >= 0 ? 0 : Math.min(Math.abs(a0), Math.abs(a1));
          if (!best || d < best.d || (d === best.d && a1 - a0 > best.a1 - best.a0)) best = { a0, a1, d };
          k = e;
        }
        if (best && best.d <= 3) { Ls.push(best.a1 + step / 2); Rs.push(-best.a0 + step / 2); } else { Ls.push(NaN); Rs.push(NaN); }
      });
      const L = smooth(fillGaps(Ls), 3, 2), R = smooth(fillGaps(Rs), 3, 2);
      // under the hand keep the width the object had just before it (the last few samples touch skin and background)
      if (firstOcc > 25) {
        const med = v => { const w = v.slice(firstOcc - 22, firstOcc - 6).sort((p, q) => p - q); return w[w.length >> 1]; };
        const l = med(L), r = med(R);
        for (let i = firstOcc - 6; i < pts.length; i++) { L[i] = l; R[i] = r; }
      }
      return { pts, L, R, firstOcc: firstOcc < 0 ? pts.length : firstOcc };
    };
    // outline polygon of a traced stretch [from, to], optionally with a rounded end
    const outline = (tr, from, to, roundEnd) => {
      const left = [], right = [];
      for (let i = from; i <= to; i++) { const p = tr.pts[i], nx = -p.dy, ny = p.dx; left.push([p.x + nx * tr.L[i], p.y + ny * tr.L[i]]); right.push([p.x - nx * tr.R[i], p.y - ny * tr.R[i]]); }
      const cap = [];
      if (roundEnd) {
        const p = tr.pts[to], nx = -p.dy, ny = p.dx, r = (tr.L[to] + tr.R[to]) / 2, off = (tr.L[to] - tr.R[to]) / 2;
        const ccx = p.x + nx * off, ccy = p.y + ny * off;
        for (let k = 1; k < 12; k++) { const t = Math.PI * k / 12; cap.push([ccx + nx * r * Math.cos(t) + p.dx * r * Math.sin(t), ccy + ny * r * Math.cos(t) + p.dy * r * Math.sin(t)]); }
      }
      return [...left, ...cap, ...right.reverse()];
    };
    const radial = ([cx0, cy0, rMin, rMax]) => {
      const rs = [];
      for (let a = 0; a < 72; a++) {
        const th = a * 5 * Math.PI / 180; let r = 0;
        // step over engraving: stop only after 2px without silver
        for (let k = 0, miss = 0; k <= rMax * 2; k++) { const rr = k / 2; if (isObjRGB(sampleAt(cx0 + Math.cos(th) * rr, cy0 + Math.sin(th) * rr))) { r = rr; miss = 0; } else if (rr > 2 && ++miss > 4) break; }
        rs.push(Math.max(rMin, Math.min(rMax, r + 0.25)));
      }
      const sm = rs.map((_, i) => { const w = [-2, -1, 0, 1, 2].map(d => rs[(i + d + 72) % 72]).sort((p, q) => p - q); return w[2]; });
      return sm.map((r, i) => [cx0 + Math.cos(i * 5 * Math.PI / 180) * r, cy0 + Math.sin(i * 5 * Math.PI / 180) * r]);
    };

    const dTr = trace(AX.dagger, true), bTr = trace(AX.band, true), suTr = trace(AX.strapUp, false), slTr = trace(AX.strapLow, false);
    const pommel = radial(POMMEL);
    // on the figure the dagger stops a little way under the hand; its picture gets the whole scabbard
    const dagVisible = outline(dTr, 0, Math.min(dTr.pts.length - 1, dTr.firstOcc + 4), false);
    const dagWhole = outline(dTr, 0, dTr.pts.length - 1, true);
    const dagShape = polyCover(pommel, dagVisible), dagWholeShape = polyCover(pommel, dagWhole);
    const beltShape = polyCover(
      outline(bTr, 0, bTr.pts.length - 1, false),
      outline(suTr, 0, Math.min(suTr.pts.length - 1, suTr.firstOcc + 4), false),
      outline(slTr, 0, slTr.pts.length - 1, false)
    );
    const dagCov = new Float32Array(N), beltCov = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      dagCov[i] = dagShape[i] * (1 - skin[i]);
      beltCov[i] = beltShape[i] * (1 - skin[i]) * (1 - dagCov[i]);
    }
    const gzCov = polyCover(P.gzL, P.gzR), akCov = polyCover(P.akhalukhi);
    // the coat keeps full strength under half-covered edge pixels, so ticking every part leaves no seams
    const chCov = new Float32Array(N);
    for (let i = 0; i < N; i++) chCov[i] = Math.max(0, Math.min(1, 2 * (1 - Math.min(1, dagCov[i] + beltCov[i] + gzCov[i] + akCov[i]))));

    // ---- output ----
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < N; i++) if (A[i] > 0) { const x = i % W, y = (i - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const cw = x1 - x0 + 1, chh = y1 - y0 + 1;
    out.box = [x0, y0, cw, chh];
    const webp = c => c.toDataURL('image/webp', 0.9);
    const layer = (cov) => {
      const c = document.createElement('canvas'); c.width = cw; c.height = chh;
      const x = c.getContext('2d'); const d = x.createImageData(cw, chh);
      for (let y = 0; y < chh; y++) for (let X = 0; X < cw; X++) {
        const i = (y + y0) * W + (X + x0), o = (y * cw + X) * 4;
        d.data[o] = C[i*4]; d.data[o+1] = C[i*4+1]; d.data[o+2] = C[i*4+2]; d.data[o+3] = Math.round(A[i] * (cov ? cov[i] : 1) * 255);
      }
      x.putImageData(d, 0, 0); return webp(c);
    };
    // square picture of one part: alpha (0..1 per pixel) and colours, cropped to area [x0, y0, x1, y1]
    const thumb = (alpha, colors, area = [0, 0, W, H]) => {
      const full = document.createElement('canvas'); full.width = W; full.height = H;
      const fx = full.getContext('2d'); const d = fx.createImageData(W, H);
      let tx0 = W, ty0 = H, tx1 = 0, ty1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (x < area[0] || x > area[2] || y < area[1] || y > area[3]) continue;
        const a = alpha(x, y, i); if (a <= 0) continue;
        d.data[i*4] = colors[i*4]; d.data[i*4+1] = colors[i*4+1]; d.data[i*4+2] = colors[i*4+2]; d.data[i*4+3] = Math.round(a * 255);
        if (a > 0.08) { if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (y < ty0) ty0 = y; if (y > ty1) ty1 = y; }
      }
      fx.putImageData(d, 0, 0);
      const bw = tx1 - tx0 + 1, bh = ty1 - ty0 + 1, T = 200, pad = 14;
      const k = Math.min((T - 2 * pad) / bw, (T - 2 * pad) / bh);
      const c = document.createElement('canvas'); c.width = T; c.height = T;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(full, tx0, ty0, bw, bh, (T - bw * k) / 2, (T - bh * k) / 2, bw * k, bh * k);
      return webp(c);
    };
    const ramp = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));

    // dagger picture: continue the scabbard under the hand with its own last clean cross-section
    const dagColors = new Uint8ClampedArray(C);
    {
      const src = dTr.pts[Math.max(0, dTr.firstOcc - 3)], nx = -src.dy, ny = src.dx;
      for (let i = 0; i < N; i++) {
        if (dagWholeShape[i] <= 0 || skin[i] <= 0) continue;
        const x = i % W, y = (i - x) / W; const s = (x - src.x) * nx + (y - src.y) * ny;
        const c = sampleAt(src.x + nx * s, src.y + ny * s);
        for (let k = 0; k < 3; k++) dagColors[i*4+k] = C[i*4+k] * (1 - skin[i]) + c[k] * skin[i];
      }
    }

    out.files = {
      'figure.webp': layer(null),
      'chokha.webp': layer(chCov),
      'akhalukhi.webp': layer(akCov),
      'masrebi.webp': layer(gzCov),
      'kamari.webp': layer(beltCov),
      'khanjali.webp': layer(dagCov),
      'thumb-chokha.webp': thumb((x, y, i) => A[i], C, [0, 0, W, 430]),
      'thumb-akhalukhi.webp': thumb((x, y, i) => A[i] * akCov[i], C),
      'thumb-masrebi.webp': thumb((x, y, i) => A[i] * gzCov[i], C),
      // the belt from the buckle on, fading where the dagger and the hand hide it
      'thumb-kamari.webp': thumb((x, y, i) => A[i] * beltCov[i] * ramp(x, 192, 204) * (1 - ramp(y, 428, 444)), C, [192, 320, 310, 444]),
      'thumb-khanjali.webp': thumb((x, y, i) => dagWholeShape[i], dagColors),
    };

    // check image: parts tinted on a checkerboard, traced outlines in red
    const dbg = document.createElement('canvas'); dbg.width = W * 2; dbg.height = H * 2;
    const dx2 = dbg.getContext('2d'); const base = document.createElement('canvas'); base.width = W; base.height = H;
    const bx = base.getContext('2d'); const dd = bx.createImageData(W, H);
    const tint = [[akCov, [40, 220, 90]], [gzCov, [255, 150, 20]], [beltCov, [255, 40, 60]], [dagCov, [20, 230, 255]]];
    for (let i = 0; i < N; i++) {
      const x = i % W, y = (i - x) / W; const chk = ((x >> 3) + (y >> 3)) & 1 ? 235 : 205;
      let c = [C[i*4], C[i*4+1], C[i*4+2]];
      for (const [m, t] of tint) if (m[i] > 0) c = c.map((v, k) => v * (1 - 0.55 * m[i]) + t[k] * 0.55 * m[i]);
      for (let k = 0; k < 3; k++) dd.data[i*4+k] = c[k] * A[i] + chk * (1 - A[i]);
      dd.data[i*4+3] = 255;
    }
    bx.putImageData(dd, 0, 0);
    dx2.imageSmoothingEnabled = false; dx2.drawImage(base, 0, 0, W * 2, H * 2);
    dx2.strokeStyle = '#ff0000'; dx2.lineWidth = 1;
    for (const poly of [pommel, dagWhole, outline(bTr, 0, bTr.pts.length - 1, false), outline(suTr, 0, suTr.pts.length - 1, false), outline(slTr, 0, slTr.pts.length - 1, false)]) {
      dx2.beginPath(); poly.forEach(([px, py], k) => k ? dx2.lineTo(px * 2, py * 2) : dx2.moveTo(px * 2, py * 2)); dx2.closePath(); dx2.stroke();
    }
    out.debug = dbg.toDataURL('image/png');
    out.trace = { daggerOcc: dTr.firstOcc, daggerLen: dTr.pts.length, strapOcc: suTr.firstOcc };
  } catch (e) { out.error = String(e && e.stack || e); }
  document.body.innerHTML = '<pre id="res' + 'ult"></pre>';
  document.getElementById('res' + 'ult').textContent = JSON.stringify(out);
});
</script></body></html>`;

const htmlPath = path.join(scratch, 'samosi-process.html');
fs.writeFileSync(htmlPath, page);
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let m = null;
for (let attempt = 0; attempt < 5 && !m; attempt++) {
  const dom = execFileSync(chrome, ['--headless=new', '--disable-gpu', `--virtual-time-budget=${60000 * (attempt + 1)}`, '--dump-dom', 'file:///' + htmlPath.replace(/\\/g, '/')], { maxBuffer: 300e6, stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
  m = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
}
if (!m) { console.error('no output'); process.exit(1); }
const json = JSON.parse(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
if (json.error) { console.error(json.error); process.exit(1); }
for (const [name, url] of Object.entries(json.files)) {
  if (!url.startsWith('data:image/webp')) { console.error('not webp:', name, url.slice(0, 30)); process.exit(1); }
  fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
}
fs.writeFileSync(path.join(scratch, 'samosi-debug.png'), Buffer.from(json.debug.split(',')[1], 'base64'));
console.log('check image:', path.join(scratch, 'samosi-debug.png'));
console.log('box', json.box, 'trace', json.trace);
for (const f of fs.readdirSync(outDir)) console.log(f, fs.statSync(path.join(outDir, f)).size);
