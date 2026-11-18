import React, { useState } from 'react';
import {
  Bell, BookOpen, Calendar, Clock, Compass, Download, Heart, Home, Info, Library, MessageCircle, Mic, MoreHorizontal, Music,
  Play, Plus, Search, Settings, Share2, SlidersHorizontal, Sparkles, Sun, Target, Trash2, User, Users, Video,
} from 'lucide-react';
import {
  Area, Avatar, Badge, Bar, Bullets, Button, Card, Check, CheckButton, Chips, Choice, Dashes, Dot, Duo, Field, H2, Helper, Hero,
  Note, Num, PageHead, Para, Pill, RoundButton, Row, Rows, SectionLabel, Seg, Sheet, Small, Stats, Stepper, Steps, Thumb, Tiles,
  Toggle, ToggleRow, Two, Val, WrapChips,
} from '../components/ui2';

type Service = 'all' | 'liturgy' | 'vespers' | 'matins' | 'feasts' | 'rites';
type Voice = 'first' | 'second' | 'bass';
type Tab = 'program' | 'chat' | 'members';
type Often = 'daily' | 'weekly' | 'monthly' | 'yearly';
type Part = 'home' | 'path' | 'letters' | 'me';

/** Every kit v2 part on one phone-wide page, as the redesign will use them — a living check of the design rules. */
export const Gallery: React.FC = () => {
  const [service, setService] = useState<Service>('all');
  const [voices, setVoices] = useState<Voice[]>(['first', 'bass']);
  const [tab, setTab] = useState<Tab>('program');
  const [often, setOften] = useState<Often>('daily');
  const [part, setPart] = useState<Part>('path');
  const [reminder, setReminder] = useState(true);
  const [night, setNight] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [level, setLevel] = useState<'easy' | 'mid' | 'hard'>('mid');
  const [minutes, setMinutes] = useState(10);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(false);
  const [habit, setHabit] = useState('');
  const [habitOften, setHabitOften] = useState<Often>('daily');

  return (
    <div className="min-h-screen bg-page text-ink">
      <div className="mx-auto flex max-w-[390px] flex-col gap-3 px-4 py-5">
        <PageHead
          kicker="ახალი სახე · ნიმუშები"
          title="კიტი v2"
          right={<RoundButton label="პარამეტრები"><SlidersHorizontal /></RoundButton>}
        />

        {/* ——— buttons ——— */}
        <SectionLabel label="ღილაკები" />
        <Button full icon={<Play />}>დაწყება</Button>
        <Duo>
          <Button kind="ghost" icon={<Share2 />}>გაზიარება</Button>
          <Button kind="soft" icon={<Download />}>ჩამოტვირთვა</Button>
        </Duo>
        <Duo>
          <Button kind="danger" size="md" icon={<Trash2 />}>წაშლა</Button>
          <Button kind="quiet" size="md">გაუქმება</Button>
        </Duo>
        <Button kind="ghost" full disabled>ჯერ არ არის მზად</Button>
        <Button full>ძალიან გრძელი სიტყვა, რომელიც ერთ ხაზზე არ ეტევა და ბოლოში წერტილებით მთავრდება</Button>
        <Card pad="sm" className="flex items-center justify-between gap-2">
          <RoundButton label="უკან" tone="page"><Compass /></RoundButton>
          <RoundButton label="შეტყობინებები" tone="page" badge={3}><Bell /></RoundButton>
          <RoundButton label="მეტი" tone="plain"><MoreHorizontal /></RoundButton>
          <RoundButton label="ჩანაწერი" size={36} tone="page"><Mic /></RoundButton>
          <RoundButton label="დამატება" tone="wine"><Plus /></RoundButton>
          <RoundButton label="ძებნა" size={48} raised><Search /></RoundButton>
        </Card>

        {/* ——— surfaces ——— */}
        <SectionLabel label="ზედაპირები" />
        <Hero
          kicker="დღის გაკვეთილი · 10 წუთი"
          title="მხოლოდ-შობილი"
          sub="წირვა · I ტომი, გვ. 215"
          action={{ label: 'გაგრძელება', icon: <Play />, onClick: () => setSheet(true) }}
        >
          <div className="mt-3 flex items-center gap-2.5">
            <Bar value={0.62} tone="white" label="ნასწავლი" className="flex-1" />
            <span className="text-meta font-semibold text-white/85">5 / 8</span>
            <RoundButton label="მოწონება" tone="glass" size={36}><Heart /></RoundButton>
          </div>
        </Hero>
        <Card>
          <H2 flush sub="ორშაბათს და ხუთშაბათს, 18:00-დან">ერთი დიდი ოჯახი</H2>
          <Para className="mt-3">
            ღმერთი უფალი და გამოგვიჩნდა ჩვენ, კურთხეულ არს მომავალი სახელითა უფლისათა.
          </Para>
          <Para sans className="mt-2">იგივე ტექსტი ჩვეულებრივი ასოებით.</Para>
        </Card>
        <Note>ნოტები ტელეფონში ინახება და ინტერნეტის გარეშეც იხსნება.</Note>
        <Helper icon={<Info />}>ჩანაწერი მასწავლებელს მხოლოდ შენი ნებით ეგზავნება.</Helper>
        <H2 big sub="სახელი ყველა წევრს გამოუჩნდება.">როგორ დავარქვათ კლასს?</H2>
        <Bullets items={[
          { icon: <Clock />, title: 'ხუთი წუთი დღეში', sub: 'მოკლე ფრაზები, ნელა' },
          { icon: <Mic />, title: 'ტელეფონი გისმენს', sub: 'სად შეცდი, თავად გეტყვის' },
          { icon: <Users />, title: 'კლასთან ერთად', sub: 'მასწავლებელი შედეგს ხედავს' },
        ]} />
        <Button kind="ghost" full icon={<SlidersHorizontal />} onClick={() => setSheet(true)}>ფანჯრის გახსნა</Button>
        <Sheet open={sheet} title="ახალი ჩვევა" onClose={() => setSheet(false)}>
          <Field label="სახელი" value={habit} onChange={setHabit} placeholder="მაგ. საღმრთო წერილის კითხვა" />
          <SectionLabel label="რამდენად ხშირად" />
          <Seg
            label="რამდენად ხშირად"
            value={habitOften}
            onChange={setHabitOften}
            items={[
              { id: 'daily', label: 'ყოველდღე' },
              { id: 'weekly', label: 'კვირაში' },
              { id: 'monthly', label: 'თვეში' },
              { id: 'yearly', label: 'წელიწადში' },
            ]}
          />
          <Rows>
            <Row lead={<Dot icon={<BookOpen />} />} title="რა გაიხსნას მონიშვნისას" right={<Val>არაფერი</Val>} onClick={() => undefined} />
            <Row lead={<Dot icon={<Bell />} />} title="შეხსენება" right={<Val>არ არის</Val>} onClick={() => undefined} />
          </Rows>
          <Button full icon={<Plus />} onClick={() => setSheet(false)}>დამატება</Button>
        </Sheet>

        {/* ——— rows ——— */}
        <SectionLabel label="სტრიქონები" right={<Small tone="wine">ყველა</Small>} />
        <Rows>
          <Row lead={<Avatar name="ნინო" />} title="ნინო ბერიძე" sub="მთქმელი · ბოლოს გუშინ" right={<Badge n={2} />} onClick={() => undefined} />
          <Row lead={<Avatar name="გიორგი" color="gold" />} title="გიორგი" sub="ბანი" onClick={() => undefined} />
          <Row lead={<Avatar name="მარიამი" color="sea" />} title="მარიამი" sub="ძალიან გრძელი მეორე ხაზი, რომელიც ბოლოში წერტილებით უნდა მთავრდებოდეს" onClick={() => undefined} />
          <Row lead={<Dot icon={<Calendar />} />} title="შემდეგი გაკვეთილი" sub="ხვალ, 18:00–22:00" right={<Small tone="wine">ცხრილი</Small>} />
          <Row lead={<Dot icon={<Clock />} color="soft" />} title="გაკვეთილის ხანგრძლივობა" sub="წუთებში" right={<Stepper label="წუთები" value={minutes} min={5} max={60} step={5} onChange={setMinutes} />} />
          <Row lead={<Thumb duration="4:12" />} title="ეთნოფორი · გურია" sub="ჩაწერილია 2019 წელს" onClick={() => undefined} />
          <Row lead={<Dot icon={<Trash2 />} color="soft" />} title="ანგარიშის წაშლა" tone="danger" onClick={() => undefined} />
        </Rows>
        <Rows>
          <Row wrap lead={<Dot icon={<Sparkles />} color="plum" />} title="მითითება AI მასწავლებელს" sub="ამ კვირას „მხოლოდ-შობილი“ — მეორე ხმა, ნელა, ორჯერ" onClick={() => undefined} />
        </Rows>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Dot icon={<Music />} color="wine" />
            <Dot icon={<Sun />} color="gold" />
            <Dot icon={<Video />} color="sea" />
            <Dot icon={<Target />} color="leaf" />
            <Dot icon={<Library />} color="plum" size={40} />
            <Dot icon={<Heart />} color="clay" size={30} />
          </div>
          <div className="flex items-center gap-2.5">
            <Avatar name="ნინო" size={64} />
            <Avatar name="გიორგი" size={48} color="leaf" />
            <Avatar name="მარიამი" size={40} color="plum" />
            <Avatar name="ნინო" size={32} color="clay" />
            <Num n={1} on />
            <Num n={2} />
          </div>
          <div className="flex items-center gap-3">
            <Two title="ორი ხაზი" sub="სახელი და მეორე ხაზი" />
            <Small>12:40</Small>
            <Small tone="leaf">ნასწავლია</Small>
          </div>
        </Card>

        {/* ——— choices ——— */}
        <SectionLabel label="არჩევანი" />
        <Chips
          label="მსახურება"
          value={service}
          onChange={setService}
          items={[
            { id: 'all', label: 'ყველა' },
            { id: 'liturgy', label: 'წირვა' },
            { id: 'vespers', label: 'მწუხრი' },
            { id: 'matins', label: 'ცისკარი' },
            { id: 'feasts', label: 'დღესასწაულები' },
            { id: 'rites', label: 'საიდუმლოები' },
          ]}
        />
        <WrapChips
          label="ხმები"
          value={voices}
          onChange={setVoices}
          items={[
            { id: 'first', label: 'მთქმელი' },
            { id: 'second', label: 'მოძახილი' },
            { id: 'bass', label: 'ბანი' },
          ]}
        />
        <Seg
          label="კლასის ნაწილები"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'program', label: 'პროგრამა' },
            { id: 'chat', label: 'ჩათი', badge: 4 },
            { id: 'members', label: 'წევრები' },
          ]}
        />
        <Seg
          label="ხედი"
          value={often}
          onChange={setOften}
          items={[
            { id: 'daily', label: 'დღე' },
            { id: 'weekly', label: 'კვირა' },
            { id: 'monthly', label: 'თვე' },
            { id: 'yearly', label: 'წელი' },
          ]}
        />
        <Seg
          label="მთავარი მენიუ"
          iconsOnlyWhenIdle
          value={part}
          onChange={setPart}
          items={[
            { id: 'home', label: 'მთავარი', icon: <Home /> },
            { id: 'path', label: 'გზა', icon: <Compass /> },
            { id: 'letters', label: 'წერილები', icon: <MessageCircle />, badge: 2 },
            { id: 'me', label: 'პროფილი', icon: <User /> },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Pill on icon={<Sparkles />}>ახალი</Pill>
          <Pill>მეორე ხმა</Pill>
          <Pill icon={<Clock />}>10 წუთი</Pill>
        </div>
        <Rows role="radiogroup" aria-label="სირთულე">
          <Choice title="მარტივი" sub="ნელა, მოკლე ფრაზებით" on={level === 'easy'} onClick={() => setLevel('easy')} />
          <Choice title="საშუალო" on={level === 'mid'} onClick={() => setLevel('mid')} />
          <Choice title="რთული" sub="სრული სისწრაფით" on={level === 'hard'} onClick={() => setLevel('hard')} />
        </Rows>
        <Rows>
          <ToggleRow lead={<Dot icon={<Bell />} />} title="შეხსენება" sub="ყოველ დილით, 09:00" on={reminder} onChange={setReminder} />
          <ToggleRow title="ღამის ფურცელი" on={night} onChange={setNight} />
          <Row
            lead={<Dot icon={<Settings />} color="soft" />}
            title="ტაძარში ჩუმად"
            right={<Toggle label="ტაძარში ჩუმად" on={quiet} onChange={setQuiet} />}
          />
          <Row
            title="დილის ლოცვა"
            sub={ticked ? 'შესრულდა' : 'ჯერ არა'}
            right={<CheckButton label="დილის ლოცვა" on={ticked} onChange={setTicked} />}
          />
        </Rows>
        <Card pad="sm" className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check on />
            <Check on={false} />
            <Check on size={24} />
          </div>
          <Stepper label="რაუნდები" value={minutes / 5} min={1} max={12} onChange={v => setMinutes(v * 5)} />
        </Card>

        {/* ——— fields ——— */}
        <SectionLabel label="ველები" />
        <Field label="სახელი" value={name} onChange={setName} placeholder="ნინო" autoComplete="given-name" />
        <Field label="ტელეფონი" type="tel" inputMode="tel" value={phone} onChange={setPhone} placeholder="5XX XX XX XX" hint="მხოლოდ ადმინისტრაცია ხედავს." />
        <Area label="შენიშვნა" value={note} onChange={setNote} placeholder="რა გინდა, რომ მასწავლებელმა იცოდეს?" />

        {/* ——— progress ——— */}
        <SectionLabel label="პროგრესი" />
        <Card className="flex flex-col gap-3">
          <Two title="საგანძური" sub="7 / 18 ხმა ნასწავლია" />
          <Bar value={7 / 18} label="საგანძური" />
          <Bar value={0.8} tone="leaf" h={8} />
          <Bar value={0.35} tone="gold" h={5} />
          <Bar value={0.55} tone="sea" />
        </Card>
        <Dashes total={4} done={2} label="ნაბიჯი 2 / 4" />
        <Steps current={1} items={['აირჩიე საგალობელი', 'მოისმინე შენი ხმა', 'იმღერე ტელეფონთან ერთად', 'გაუგზავნე მასწავლებელს']} />
        <Stats items={[
          { value: 4, label: 'აქტიური დღე' },
          { value: 25, label: 'მონიშნული ჩვევა' },
          { value: 2, label: 'ნამუშევარი' },
        ]} />
        <Tiles items={[
          { lead: <Dot icon={<Music />} />, title: 'გალობა', sub: '12 საგალობელი', onClick: () => undefined },
          { lead: <Dot icon={<BookOpen />} />, title: 'ლოცვანი', sub: '3 რჩეული', onClick: () => undefined },
          { lead: <Dot icon={<Users />} />, title: 'კლასი', sub: 'ერთი დიდი ოჯახი', onClick: () => undefined },
          { lead: <Dot icon={<Calendar />} />, title: 'კალენდარი', sub: 'დღეს მარხვაა' },
        ]} />
        <Tiles cols={3} items={[
          { title: 'ახლოს', sub: '2 კმ', onClick: () => undefined },
          { title: 'ტაძრობა', sub: 'დღეს', onClick: () => undefined },
          { title: 'წიგნაკი', sub: '5 / 12', onClick: () => undefined },
        ]} />
        <div className="flex items-center gap-3">
          <Thumb duration="12:05" />
          <Thumb w={160} h={90} duration="1:02:30" />
        </div>
      </div>
    </div>
  );
};
