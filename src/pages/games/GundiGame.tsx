import React, { useState } from 'react';
import { Sparkles, Users } from 'lucide-react';
import { Card, Tabs } from '../../components/ui/kit';
import { useOpenRequest } from '../../utils/searchOpen';
import { GundiStudio } from './gundi/Studio';
import { GundiClass } from './gundi/ClassStage';
import { readTab, saveTab, type GundiTab } from './gundi/store';

// „ჩემი გუნდი“ (games hub, 2026-11-01, the plan's №5, like Incredibox): a stage of six — three singers and three players —
// loops a phrase of a folk song from the program's book notes; each performer comes in or goes out with a tap and has
// patterns to choose from. Two tabs: „სცენა“ (on my phone: build the ensemble, record it, send it to the class chat) and
// „ჰიბრიდული“ (the phone plays some performers through its speaker, the class does the others live, the teacher brings the
// groups in). The rules utils/gundi.ts, the sound engine and the stage pages/games/gundi/.

const GundiGame: React.FC = () => {
  const [tab, setTabState] = useState<GundiTab>(readTab);
  const setTab = (t: GundiTab) => { setTabState(t); saveTab(t); };
  // the hub's „ონლაინ“ opens the stage, „ჰიბრიდული“ the class's tab
  useOpenRequest('gundi', id => setTab(id === 'table' ? 'class' : 'stage'));
  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">ჩემი გუნდი</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          შენი ანსამბლი სცენაზე: მთქმელი, მოძახილი და ბანი მღერიან, ტაში, დოლი და ფანდური აჰყვებიან. ხალხური სიმღერის ფრაზა წრეზე
          ბრუნავს — ჩართე, გამორთე, შეცვალე რიტმი და მოისმინე, როგორ შენდება ქართული მრავალხმიანობა.
        </p>
      </Card>
      <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'stage', label: 'სცენა', Icon: Sparkles }, { id: 'class', label: 'ჰიბრიდული', Icon: Users }]} />
      {tab === 'stage' ? <GundiStudio /> : <GundiClass />}
    </div>
  );
};

export default GundiGame;
