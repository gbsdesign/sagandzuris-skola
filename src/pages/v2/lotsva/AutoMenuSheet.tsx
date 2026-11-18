import React from 'react';
import { ChevronsDown, Scan } from 'lucide-react';
import { Dot, Note, Row, Rows, Sheet } from '../../../components/ui2';

/** x-avto-meniu — „ავტომატური კითხვა“: the ⏬ button's two ways as big rows with a line each (AutoScrollButton in
 *  components/views/ReadingTools.tsx opens it in the new look; the old look keeps its small menu at the button). */
export const AutoMenuSheet: React.FC<{ open: boolean; onPick: (way: 'page' | 'full') => void; onClose: () => void }> = ({
  open, onPick, onClose,
}) => (
  <Sheet open={open} title="ავტომატური კითხვა" onClose={onClose}>
    <Rows>
      <Row
        lead={<Dot icon={<ChevronsDown strokeWidth={2} />} />}
        title="აქ გადახვევა"
        sub="ტექსტი ნელა ადის ამავე გვერდზე"
        onClick={() => onPick('page')}
      />
      <Row
        lead={<Dot icon={<Scan strokeWidth={2} />} />}
        title="სრულ ეკრანზე"
        sub="დიდი ასოები — ხმამაღლა საკითხავად"
        onClick={() => onPick('full')}
      />
    </Rows>
    <Note>სიჩქარეს კითხვისას შეცვლი.</Note>
  </Sheet>
);
