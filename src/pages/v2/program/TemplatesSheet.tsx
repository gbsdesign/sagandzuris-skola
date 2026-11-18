import React, { useState } from 'react';
import { ChevronRight, ListMusic, Plus, Trash2 } from 'lucide-react';
import { Button, Dot, Field, Press, RoundButton, Rows, Sheet, Two } from '../../../components/ui2';

// x-tsirva-shabloni: the saved programs as rows, a tap uses one; at the bottom „+ ამ პროგრამის შენახვა შაბლონად“.

export interface TemplateRow { name: string; count: number }

export const TemplatesSheet: React.FC<{
  open: boolean; templates: TemplateRow[]; canSave: boolean;
  onClose: () => void; onUse: (name: string) => void; onDelete: (name: string) => void; onSave: (name: string) => void;
}> = ({ open, templates, canSave, onClose, onUse, onDelete, onSave }) => {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const close = () => { setNaming(false); setName(''); onClose(); };
  return (
    <Sheet open={open} title="შაბლონები" onClose={close}>
      <p className="px-1 text-body leading-relaxed text-mut">შეინახე დღევანდელი პროგრამა და შემდეგ ჯერზე ერთი შეხებით ჩასვი.</p>
      {templates.length > 0 && (
        <Rows>
          {templates.map(t => (
            <div key={t.name} className="flex items-center pr-2">
              <Press
                onClick={() => onUse(t.name)}
                className="flex min-h-row min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pr-1 pl-4 text-left transition-colors active:bg-soft"
              >
                <Dot icon={<ListMusic />} size={40} />
                <Two title={t.name} sub={`${t.count} საგალობელი`} />
                <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
              </Press>
              <RoundButton label={`„${t.name}“ წაშლა`} size={36} tone="plain" onClick={() => onDelete(t.name)}><Trash2 /></RoundButton>
            </div>
          ))}
        </Rows>
      )}
      {naming ? (
        <form className="flex flex-col gap-2.5" onSubmit={e => { e.preventDefault(); const n = name.trim(); if (!n) return; onSave(n); setName(''); setNaming(false); }}>
          <Field label="შაბლონის სახელი" value={name} onChange={setName} autoFocus autoComplete="off" placeholder="მაგ. საკვირაო წირვა" />
          <Button full type="submit" disabled={!name.trim()}>შენახვა</Button>
        </form>
      ) : (
        <Button kind="ghost" full icon={<Plus />} disabled={!canSave} onClick={() => setNaming(true)}>ამ პროგრამის შენახვა შაბლონად</Button>
      )}
    </Sheet>
  );
};
