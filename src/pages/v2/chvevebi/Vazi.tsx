import React, { useState } from 'react';
import { Calendar, Clock, Grape, Info, Leaf } from 'lucide-react';
import { Bullets, Button, Card, Note, RoundButton, Sheet, Stats, TopBar } from '../../../components/ui2';
import { BUNCH_AT, LEAF_CAP, RECENT_DAYS, yellowShare } from '../../../utils/vazi';
import { VineArt } from '../../../components/habits/vine/VineArt';
import { bunchLooks } from '../../../components/habits/vine/HabitVine';
import { useVine } from '../../../components/habits/vine/useVine';
import { useHabitsNav } from './nav';

// „ჩემი ვაზი“ (boards x-vazi and x-vazi-rogor): the picture, three numbers and one sentence; the rules open from the ⓘ.

const RULES = [
  { icon: <Leaf />, title: 'ფოთოლი — ყველა საქმე', sub: `ჩვევა, თამაში, სწავლა · დღეში ${LEAF_CAP}-მდე` },
  { icon: <Grape />, title: `მტევანი — თვეში ${BUNCH_AT[0]} ფოთოლი`, sub: `${BUNCH_AT[1]} — მეორე, ${BUNCH_AT[2]} — მესამე მტევანი` },
  { icon: <Calendar />, title: 'წელი ნოემბრიდან ოქტომბრამდეა', sub: '1 ნოემბერს მტევნები ქვევრში მიდის' },
  { icon: <Clock />, title: `ფოთოლი ${RECENT_DAYS} დღე რჩება`, sub: 'მერე ცვივა — ვაზი კი იზრდება' },
];

export const VaziScreen: React.FC = () => {
  const { back } = useHabitsNav();
  const { vine, loaded, name } = useVine();
  const [info, setInfo] = useState(false);
  return (
    <div className="flex flex-col gap-3 pb-6">
      <TopBar
        title="ჩემი ვაზი"
        sub="ჩვევების ნაყოფი"
        onBack={back}
        right={<RoundButton label="როგორ იზრდება ვაზი" onClick={() => setInfo(true)}><Info aria-hidden="true" strokeWidth={1.75} /></RoundButton>}
      />
      <Card pad="none">
        <VineArt
          leaves={loaded ? vine.recent : 0}
          wood={loaded ? vine.leaves : 0}
          bunches={loaded ? bunchLooks(vine) : []}
          yellow={yellowShare(vine.idle)}
          fresh={vine.today}
          name={name || undefined}
          cellar={vine.cellar}
          className="block h-auto w-full"
        />
      </Card>
      <Stats items={[
        { value: loaded ? vine.recent : '—', label: 'ფოთოლი' },
        { value: loaded ? vine.seasonBunches : '—', label: 'მტევანი' },
        { value: loaded ? vine.cellar : '—', label: 'ქვევრში' },
      ]} />
      <Note>რაც მეტ ჩვევას ასრულებ, ვაზი იზრდება.</Note>
      <Sheet open={info} title="როგორ იზრდება ვაზი" onClose={() => setInfo(false)}>
        <div className="flex flex-col gap-4">
          <Bullets items={RULES} />
          <Button kind="ghost" full onClick={() => setInfo(false)}>გასაგებია</Button>
        </div>
      </Sheet>
    </div>
  );
};
