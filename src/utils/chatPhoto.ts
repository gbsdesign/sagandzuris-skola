// A photo for the chat (2026-11-22): the full one at most 1600 px and about 2 MB, and a small one (a data URL of ≤ ~55 000
// letters) that the message itself carries, so the chat shows it at once and the full one loads only when it is opened.

const loadImage = (file: File) => new Promise<HTMLImageElement>((ok, bad) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); ok(img); };
  img.onerror = () => { URL.revokeObjectURL(url); bad(new Error('not a picture')); };
  img.src = url;
});

// the browser turns the picture by its camera's mark itself when it draws it
const drawn = (img: HTMLImageElement, max: number) => {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // a see-through PNG gets white, not black, as a JPEG
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
};

const jpeg = (c: HTMLCanvasElement, q: number) => new Promise<Blob>((ok, bad) =>
  c.toBlob(b => (b ? ok(b) : bad(new Error('no jpeg'))), 'image/jpeg', q));

export const preparePhoto = async (file: File) => {
  const img = await loadImage(file);
  const big = drawn(img, 1600);
  let q = 0.82;
  let full = await jpeg(big, q);
  while (full.size > 2_000_000 && q > 0.45) {
    q -= 0.12;
    full = await jpeg(big, q);
  }
  let thumb = '';
  for (const [side, tq] of [[360, 0.62], [320, 0.5], [240, 0.45]] as const) {
    thumb = drawn(img, side).toDataURL('image/jpeg', tq);
    if (thumb.length <= 55_000) break;
  }
  return { full, thumb, w: big.width, h: big.height };
};
