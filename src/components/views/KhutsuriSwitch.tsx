import React from 'react';
import { Knob } from '../ui/kit';
import { triggerHaptic } from '../../utils/haptics';
import { useKhutsuriSetting } from '../../utils/khutsuri';

/** The profile's „ხუცური“: the whole site in the old Georgian script — text in nuskhuri, headings in asomtavruli, drawn
 *  with the „საღვთისმსახურო წიგნები“ app's alphabet (utils/khutsuri.ts, index.css). Kept on this device. The whole row is
 *  the switch; its letter shows the alphabet even while the site is in mkhedruli. */
export const KhutsuriSwitch: React.FC = () => {
  const [on, set] = useKhutsuriSetting();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => { triggerHaptic(10); set(!on); }}
      className="w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-4 py-3 flex items-center gap-3.5 text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.99]"
    >
      <span aria-hidden className={`w-11 h-11 shrink-0 rounded-2xl ring-1 flex items-center justify-center transition-colors ${
        on ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] ring-[#7a2028]/10 text-[#7a2028]'}`}>
        <span className="text-[24px] leading-none translate-y-[1px]" style={{ fontFamily: '"SG Asomtavruli", var(--font-serif-ge)' }}>Ⴞ</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-serif-ge text-[15px] font-bold text-[#4a3426]">ხუცური</span>
        <span className="block text-[13px] text-[#8a7a6a] leading-snug">მთელი საიტი ძველი ქართული ანბანით</span>
      </span>
      <Knob on={on} />
    </button>
  );
};
