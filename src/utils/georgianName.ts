// Name checks without Firebase (memberName.ts re-exports them), so plain helpers and tests can use them.

const GEORGIAN = /^[ა-ჿᲐ-Ჿ]+(?:[\s-][ა-ჿᲐ-Ჿ]+)*$/;
export const isGeorgian = (s: string | undefined) => !!s && GEORGIAN.test(s.trim());

export interface ProfileName {
  firstName: string;
  lastName: string;
  churchName: string;
}

export const fullName = (p: Partial<ProfileName> | undefined) => [p?.firstName, p?.lastName].map(x => (x || '').trim()).filter(Boolean).join(' ');
export const prayerName = (p: Partial<ProfileName> | undefined) => (p?.churchName || p?.firstName || '').trim();
export const hasGeorgianName = (p: Partial<ProfileName> | undefined) => isGeorgian(p?.firstName) && isGeorgian(p?.lastName);

// Latin-letter names (Google names such as „giorgi Tskhovrebashvili“) shown in Georgian letters everywhere
// (the user's rule, 2026-11-22: „მინდა რომ მხოლოდ ქართულად ეწეროს ყველგან“). Only the Latin letters change;
// a Georgian name comes back as it is. Common first names whose t / k / p the letters can't tell are listed.
const KNOWN: Record<string, string> = {
  ketevan: 'ქეთევან', keti: 'ქეთი', ketino: 'ქეთინო', ekaterine: 'ეკატერინე', eka: 'ეკა', kote: 'კოტე', tite: 'ტიტე',
  aleksandre: 'ალექსანდრე', alexandre: 'ალექსანდრე', alexander: 'ალექსანდრე', aleksander: 'ალექსანდრე', alex: 'ალექსი',
  sophio: 'სოფიო', sopio: 'სოფიო', sofia: 'სოფია', sophia: 'სოფია', sopo: 'სოფო', george: 'გიორგი', giorgi: 'გიორგი',
  irakli: 'ირაკლი', nikoloz: 'ნიკოლოზ', nika: 'ნიკა', luka: 'ლუკა', beka: 'ბექა', mikheil: 'მიხეილ',
  dachi: 'დაჩი', archil: 'არჩილ', paata: 'პაატა', pridon: 'ფრიდონ', tekle: 'თეკლე', tekla: 'თეკლა', tako: 'თაკო',
  maka: 'მაკა', nanuka: 'ნანუკა', nutsa: 'ნუცა', khatia: 'ხატია', tamta: 'თამთა', teona: 'თეონა', ketato: 'ქეთათო',
  demetre: 'დემეტრე', dimitri: 'დიმიტრი', petre: 'პეტრე', pavle: 'პავლე', konstantine: 'კონსტანტინე', tornike: 'თორნიკე',
  temur: 'თემურ', temo: 'თემო', toma: 'თომა', ilia: 'ილია', iakob: 'იაკობ', tatia: 'თათია', mate: 'მათე', tedo: 'თედო',
  lika: 'ლიკა', lela: 'ლელა', kakha: 'კახა', koba: 'კობა', merab: 'მერაბ', vakhtang: 'ვახტანგ', tengiz: 'თენგიზ',
};

const PAIRS: [RegExp, string][] = [
  [/^tch|^ch'|^ch`/, 'ჭ'], [/^ts'|^ts`|^tz'/, 'წ'], [/^dzh/, 'ჯ'],
  [/^kh/, 'ხ'], [/^gh/, 'ღ'], [/^zh/, 'ჟ'], [/^sh/, 'შ'], [/^ch/, 'ჩ'], [/^ts|^tz/, 'ც'], [/^dz/, 'ძ'],
  [/^ph/, 'ფ'], [/^th/, 'თ'], [/^k'|^k`/, 'კ'], [/^p'|^p`/, 'პ'], [/^t'|^t`/, 'ტ'], [/^q'|^q`/, 'ყ'], [/^ck/, 'კ'],
];
const ONE: Record<string, string> = {
  a: 'ა', b: 'ბ', g: 'გ', d: 'დ', e: 'ე', v: 'ვ', w: 'ვ', z: 'ზ', t: 'თ', i: 'ი', y: 'ი', k: 'კ', l: 'ლ', m: 'მ', n: 'ნ',
  o: 'ო', p: 'პ', r: 'რ', s: 'ს', u: 'უ', f: 'ფ', q: 'ყ', c: 'ც', x: 'ხ', j: 'ჯ', h: 'ჰ',
};

const wordToKa = (w: string) => {
  const low = w.toLowerCase();
  if (KNOWN[low]) return KNOWN[low];
  let out = '';
  for (let i = 0; i < low.length; ) {
    const rest = low.slice(i);
    const pair = PAIRS.find(([re]) => re.test(rest));
    if (pair) {
      const m = rest.match(pair[0])![0];
      out += pair[1];
      i += m.length;
      continue;
    }
    const ch = low[i];
    out += ONE[ch] ?? (ch === "'" || ch === '`' ? '' : w[i]);
    i += 1;
  }
  return out;
};

/** A name in Georgian letters: Latin words are spelled out in Georgian, everything else stays. */
export const kaName = (s: string | null | undefined): string => {
  const t = (s || '').trim();
  if (!/[a-z]/i.test(t)) return s || '';
  return t.replace(/[a-z][a-z'`]*/gi, wordToKa);
};
