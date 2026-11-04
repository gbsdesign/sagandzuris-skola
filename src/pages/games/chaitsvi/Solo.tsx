import React, { useState } from 'react';
import { Play, RotateCcw, Shirt, Trophy } from 'lucide-react';
import { scoreMs, timeText, type Outfit } from '../../../utils/chaitsvi';
import { triggerHaptic } from '../../../utils/haptics';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card } from '../../../components/ui/kit';
import { DressBoard, type Dressed } from './Dress';
import { PartPic, partLook, pickHat, useKaba, type HatPick } from './Doll';
import { HowTo } from '../../../components/games/HowTo';

// „ჩაიცვი ქართულად“ alone (the hub's „ონლაინ“): choose the chokha or the dress, with the parts' names or by their pictures
// only, dress against the clock; the best time of each way stays on this phone, and every part's story comes after.

const BEST_KEY = 'sg-chaitsvi-best';
const CONF_KEY = 'sg-chaitsvi';
type Best = Record<string, number>;
const load = <T,>(key: string, fallback: T): T => { try { return (JSON.parse(localStorage.getItem(key) || 'null') as T) ?? fallback; } catch { return fallback; } };
const save = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };
const wayKey = (outfit: Outfit, names: boolean) => `${outfit}${names ? '' : '-blind'}`;

export const OUTFIT_LABEL: Record<Outfit, string> = { chokha: 'ჩოხა', kaba: 'ქართული კაბა' };

/** the outfit and the names: chips, the dress only when its pictures may be seen */
export const DressOptions: React.FC<{
  outfit: Outfit; names: boolean; kabaOn: boolean;
  onOutfit: (o: Outfit) => void; onNames: (v: boolean) => void;
}> = ({ outfit, names, kabaOn, onOutfit, onNames }) => (
  <div className="space-y-2.5">
    {kabaOn && (
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="სამოსი">
        {(['chokha', 'kaba'] as Outfit[]).map(o => <Chip key={o} on={outfit === o} onClick={() => onOutfit(o)}>{OUTFIT_LABEL[o]}</Chip>)}
      </div>
    )}
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="ნაწილების სახელები">
      <Chip on={names} onClick={() => onNames(true)}>სახელებით</Chip>
      <Chip on={!names} onClick={() => onNames(false)}>მხოლოდ სურათებით</Chip>
    </div>
  </div>
);

interface Result extends Dressed { outfit: Outfit; names: boolean; hat: HatPick; score: number; record: boolean; before: number | null }

export const DressSolo: React.FC = () => {
  const kaba = useKaba();
  const [conf, setConf] = useState(() => {
    const c = load<{ outfit?: unknown; names?: unknown }>(CONF_KEY, {});
    return { outfit: (c.outfit === 'kaba' ? 'kaba' : 'chokha') as Outfit, names: c.names !== false };
  });
  const outfit: Outfit = conf.outfit === 'kaba' && kaba ? 'kaba' : 'chokha';
  const setC = (c: typeof conf) => { setConf(c); save(CONF_KEY, c); };
  const [best, setBest] = useState<Best>(() => load<Best>(BEST_KEY, {}));
  const [play, setPlay] = useState<{ seed: number; hat: HatPick } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const mine = best[wayKey(outfit, conf.names)] ?? null;

  const start = () => {
    triggerHaptic(10);
    const seed = (Date.now() % 2_147_483_647) || 1;
    setResult(null);
    setPlay({ seed, hat: pickHat(seed) });
  };
  const done = (r: Dressed) => {
    if (!play) return;
    const score = scoreMs(r.ms, r.mistakes);
    const key = wayKey(outfit, conf.names);
    const before = best[key] ?? null;
    const record = before === null || score < before;
    if (record) { const next = { ...best, [key]: score }; setBest(next); save(BEST_KEY, next); }
    setResult({ ...r, outfit, names: conf.names, hat: play.hat, score, record, before });
    setPlay(null);
  };

  if (play) {
    return (
      <DressBoard
        outfit={outfit} names={conf.names} seed={play.seed} hat={play.hat} kaba={kaba}
        title={`ჩაიცვი — ${OUTFIT_LABEL[outfit]}`}
        onClose={() => setPlay(null)}
        onDone={done}
      />
    );
  }

  return (
    <div className="space-y-4">
      {result && (
        <Card className="!p-4 space-y-3">
          <div className="text-center">
            <p className="text-[13px] text-[#75685a]">{OUTFIT_LABEL[result.outfit]} ჩაცმულია</p>
            <p className="font-serif-ge text-[44px] font-bold leading-none text-[#7a2028] tabular-nums">{timeText(result.score)}</p>
            <p className="mt-1 text-[13px] text-[#75685a] tabular-nums">
              {result.mistakes ? `${timeText(result.ms)} წამი და ${result.mistakes} შეცდომა (+${result.mistakes * 3} წამი)` : 'უშეცდომოდ!'}
            </p>
            {result.record ? (
              <p className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#2f7d4f] text-white text-[14px] font-bold"><Trophy className="w-4 h-4" />ახალი რეკორდი!</p>
            ) : result.before !== null && (
              <p className="mt-2 text-[13.5px] text-[#4a3426]">შენი საუკეთესო — <b className="tabular-nums">{timeText(result.before)}</b></p>
            )}
          </div>
          <div className="space-y-2">
            <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">რა ჩაიცვი</p>
            <ol className="space-y-2">
              {result.order.map((id, i) => {
                const l = partLook(result.outfit, id, result.hat, kaba);
                return (
                  <li key={id} className="flex items-start gap-3">
                    <PartPic look={l} className="w-12 h-12" />
                    <p className="min-w-0 text-[13.5px] leading-snug text-[#4a3426]"><b className="text-[#7a2028]">{i + 1}. {l.label}.</b> {l.story}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      )}

      <Card className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#7a2028] text-white inline-flex items-center justify-center"><Shirt className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">ჩაიცვი სწორი რიგით</p>
            <p className="text-[13px] leading-snug text-[#75685a]">რა იცმევა ჯერ და რა — მერე? არასწორი ნაწილი უკან ბრუნდება და დროს 3 წამს უმატებს.</p>
          </div>
        </div>
        <DressOptions
          outfit={outfit} names={conf.names} kabaOn={!!kaba}
          onOutfit={o => setC({ ...conf, outfit: o })} onNames={v => setC({ ...conf, names: v })}
        />
        <p className="text-[13px] text-[#75685a] tabular-nums">{mine !== null ? <>საუკეთესო დრო ამ გზით: <b className="text-[#4a3426]">{timeText(mine)}</b></> : 'ჯერ არ გითამაშია ამ გზით.'}</p>
        <Btn size="lg" full icon={result ? <RotateCcw /> : <Play />} onClick={start}>{result ? 'კიდევ ერთხელ' : 'დაწყება'}</Btn>
      </Card>

      {!result && (
        <HowTo id="chaitsvi-solo" steps={[
          'ეკრანზე ნაწილებია არეულად. შეეხე იმას, რაც ჯერ იცმევა — ის ფიგურაზე ჩაჯდება.',
          'ადრე შეეხე? ნაწილი უკან ბრუნდება და გეტყვის, რა უნდა ჩაიცვა ჯერ.',
          kaba ? 'ჩოხა: ახალუხი, ჩოხა, მასრები და ქამარი, ხანჯალი ქამარზე, ქუდი ბოლოს. კაბა: კაბა, გულისპირი და სარტყელი, ქათიბი, ლეჩაქი ბოლოს.' : 'ახალუხი, ჩოხა, მასრები და ქამარი, ხანჯალი ქამარზე, ქუდი ბოლოს — ქუდი ყოველ თამაშში სხვაა.',
          '„მხოლოდ სურათებით“ უფრო რთულია: სახელები არ ჩანს — ნაწილი სურათით უნდა იცნო.',
        ]} />
      )}
    </div>
  );
};
