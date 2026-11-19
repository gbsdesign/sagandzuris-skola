import React, { useCallback, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { Avatar, RoundButton, Row, cx } from '../../../components/ui2';
import type { UserRecord } from '../../../components/admin/UsersTab';

export type Say = (text: string, type: 'success' | 'error') => void;

/** The panel's one message line (what was saved, what failed): shown on top of the screen until closed or replaced. */
export const useMsg = () => {
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error'; at: number } | null>(null);
  const say = useCallback<Say>((text, type) => setMsg({ text, type, at: Date.now() }), []);
  const fail = useCallback((text: string) => setMsg({ text, type: 'error', at: Date.now() }), []);
  const clear = useCallback(() => setMsg(null), []);
  return { msg, say, fail, clear };
};

export const MsgLine: React.FC<{ msg: ReturnType<typeof useMsg>['msg']; onClose: () => void; className?: string }> = ({ msg, onClose, className }) => {
  if (!msg) return null;
  const bad = msg.type === 'error';
  return (
    <div key={msg.at} role={bad ? 'alert' : 'status'}
      className={cx('sg-in flex shrink-0 items-start gap-2.5 rounded-tile py-2 pr-1.5 pl-3.5', bad ? 'bg-danger/10 text-danger' : 'bg-leaf-tint text-leaf-ink', className)}>
      <span aria-hidden="true" className="flex pt-2.5 [&_svg]:size-[18px]">{bad ? <CircleAlert /> : <CircleCheck />}</span>
      <p className="min-w-0 flex-1 py-2 text-body leading-snug font-semibold wrap-break-word">{msg.text}</p>
      <RoundButton label="დახურვა" size={36} tone="plain" onClick={onClose}><X /></RoundButton>
    </div>
  );
};

/** „ახლახან“, „3 სთ-ის წინ“, „გუშინ“, „5 დღის წინ“, „3 კვირის წინ“ — a row's right end or grey line. */
export const agoWords = (iso?: string) => {
  if (!iso) return 'არასდროს';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '—';
  if (ms < 3600_000) return 'ახლახან';
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)} სთ-ის წინ`;
  const d = Math.floor(ms / 86400_000);
  if (d === 1) return 'გუშინ';
  if (d < 14) return `${d} დღის წინ`;
  if (d < 60) return `${Math.floor(d / 7)} კვირის წინ`;
  return `${Math.floor(d / 30)} თვის წინ`;
};

/** A lesson's day (YYYY-MM-DD) in the same words: „დღეს“, „გუშინ“, „2 დღის წინ“. */
export const dayWords = (day: string) => {
  if (!day) return '—';
  const today = new Date();
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = day.split('-').map(Number);
  const n = Math.round((t - Date.UTC(y, m - 1, d)) / 86400_000);
  if (n <= 0) return 'დღეს';
  if (n === 1) return 'გუშინ';
  if (n < 14) return `${n} დღის წინ`;
  if (n < 60) return `${Math.floor(n / 7)} კვირის წინ`;
  return `${Math.floor(n / 30)} თვის წინ`;
};

/** A person as one line: photo or letter, the name, a grey line and something at the right. */
export const PersonRow: React.FC<{
  u: Pick<UserRecord, 'name' | 'photoURL'>;
  sub?: React.ReactNode;
  right?: React.ReactNode | 'chev';
  lead?: React.ReactNode;
  onClick?: () => void;
  current?: boolean;
} & Omit<React.HTMLAttributes<HTMLElement>, 'onClick'>> = ({ u, sub, right, lead, onClick, current, className, ...rest }) => (
  <Row
    {...rest}
    aria-current={current ? 'true' : undefined}
    lead={<>{lead}<Avatar name={u.name} photo={u.photoURL || undefined} /></>}
    title={u.name}
    sub={sub}
    right={right}
    onClick={onClick}
    className={cx(current && 'bg-tint', className)}
  />
);

/** Label at the left, value at the right — the facts of a person (x-adamiani-elodeba). */
export const FactRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
    <span className="shrink-0 text-body text-mut">{label}</span>
    <span className="min-w-0 flex-1 text-right text-body font-bold wrap-break-word">{children}</span>
  </div>
);

/** A screen of the panel: its column and its gaps. */
export const Screen: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('flex w-full min-w-0 flex-col gap-2.5 pb-6', className)}>{children}</div>
);
