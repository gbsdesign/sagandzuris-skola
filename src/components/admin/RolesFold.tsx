import React from 'react';
import { Crown, GraduationCap, ShieldCheck, User as UserIcon, UsersRound } from 'lucide-react';
import { useAuth } from '../../context';
import { Pill } from '../ui/kit';
import { Fold } from './Fold';

// „ვის რა შეუძლია“ (admin review, idea 14, 2026-10-28): what each role may do, in ⚙ „სკოლა“, so a new admin needs no
// explaining. Each role holds everything of the one under it; the lines follow firestore.rules and the panel (who names
// whom: the `admins` rule's canGrant; letting members in: memberAccess; a teacher: their own classes only).
const ROLES: { id: string; Icon: React.ComponentType<{ className?: string }>; name: string; who: string; can: string[] }[] = [
  {
    id: 'owner', Icon: Crown, name: 'მფლობელი', who: 'სკოლის დამფუძნებელი, ერთადერთი',
    can: ['ყველაფერი, რაც სუპერადმინს', 'ნიშნავს და ხსნის სუპერადმინებს (მის გარდა მაქსიმუმ 3)', 'მისი როლის შეცვლა არავის შეუძლია'],
  },
  {
    id: 'superadmin', Icon: Crown, name: 'სუპერადმინი', who: 'ნიშნავს მფლობელი',
    can: [
      'ყველაფერი, რაც ადმინს',
      'უშვებს ახალ წევრს ან აფერხებს და ირჩევს, რა გაეხსნას',
      'ნიშნავს და ხსნის ადმინებს',
      'ხედავს ცვლილებების ჟურნალს',
      'წევრების სიას ცხრილად ჩამოტვირთავს',
      'ტელეფონზე: „ახალი წევრი ელოდება“',
    ],
  },
  {
    id: 'admin', Icon: ShieldCheck, name: 'ადმინი', who: 'ნიშნავს სუპერადმინი',
    can: [
      'ხედავს ყველა წევრს და ყველა კლასს',
      'ქმნის კლასს, უნიშნავს მასწავლებლებს, აგზავნის არქივში და აბრუნებს',
      'ნიშნავს და ხსნის მასწავლებლებს',
      'წევრს ჩაწერს კლასში, მონიშნავს „გასულად“, ურთავს საბავშვო რეჟიმს, უწერს პირად ჩანიშვნას',
      'ხსნის, „მალე“-ზე აყენებს ან მალავს განყოფილებებს, თარიღითაც',
      'აძლევს დამატებით უფლებებს: ცენტრის ჩანაწერები, სიმღერის ტექსტები',
      'უგზავნის განცხადებას კლასებს, იღებს სარეზერვო ასლს',
      'ტელეფონზე: ორშაბათის მიმოხილვა',
    ],
  },
  {
    id: 'teacher', Icon: GraduationCap, name: 'მასწავლებელი', who: 'ნიშნავს ადმინი',
    can: [
      'მხოლოდ თავის კლასებში: პროგრამა, განრიგი, წევრების დამატება და ამოღება',
      'დასწრება, დავალებები, ოსტატობის შეფასებები',
      'უსმენს მოსწავლეების ნამღერს და „ჩათვლის“',
      'კლასის ფსალმუნთა ჯგუფი, ჩატი და ზარები',
      'თავის მოსწავლეს რთავს საბავშვო რეჟიმს',
      'ხედავს მხოლოდ თავისი კლასების წევრების ჩანაწერებს',
    ],
  },
  {
    id: 'member', Icon: UserIcon, name: 'წევრი', who: 'უშვებს სუპერადმინი',
    can: ['ხედავს იმას, რაც დაშვებისას გაეხსნა', 'თავის კლასში: პროგრამა, დავალებები, ჩატი'],
  },
];

export const RolesFold: React.FC = () => {
  const { isOwner, isSuperAdmin } = useAuth();
  const mine = isOwner ? 'owner' : isSuperAdmin ? 'superadmin' : 'admin';
  return (
    <Fold icon={<UsersRound />} title="ვის რა შეუძლია" summary="მფლობელი · სუპერადმინი · ადმინი · მასწავლებელი · წევრი">
      <p className="mb-3 text-[13px] text-[#75685a] leading-snug">ყოველ როლს შეუძლია ყველაფერი, რაც მის ქვემოთ მდგომს. როლი იცვლება წევრების სიაში, ადამიანის ფანჯარაში.</p>
      <ul className="grid sm:grid-cols-2 gap-2.5">
        {ROLES.map(({ id, Icon, name, who, can }) => (
          <li key={id} className={`rounded-2xl px-3.5 py-3 ${id === mine ? 'bg-[#7a2028]/[0.05] ring-1 ring-[#7a2028]/25' : 'bg-[#fbf6ec] ring-1 ring-[#efe4d3]'}`}>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 shrink-0 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center"><Icon className="w-[18px] h-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[15px] font-bold text-[#2a2017]">{name}</span>
                  {id === mine && <Pill tone="wine">შენ</Pill>}
                </span>
                <span className="block text-[12px] text-[#8a7a6a]">{who}</span>
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-[13px] leading-snug text-[#4a3426]">
              {can.map(line => (
                <li key={line} className="flex gap-2"><span aria-hidden className="mt-[7px] w-1 h-1 shrink-0 rounded-full bg-[#b3a594]" />{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Fold>
  );
};
