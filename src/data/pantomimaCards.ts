// „პანტომიმა“ (games hub, 2026-11-01, like Charades and Heads Up!): words to show with the body, in eight themes, each with
// the verb that says how — play the instrument, dance the dance, turn into the animal, put the garment on. The words are the
// app's own world (its instruments, dances, costume, table, crafts, tales — mostly the „ამიხსენი“ bank's) with a few everyday
// ones a child shows easily. Chosen by Claude for the school, not yet checked by a teacher — the page says so. A word is
// its own id (the test checks none comes twice), so add words at the end of a theme.

export interface PantoTheme {
  id: string;
  label: string;
  /** how it is shown, on the card and the actor's screen */
  verb: string;
  color: string;
  words: readonly string[];
}

export const PANTO_THEMES: readonly PantoTheme[] = [
  {
    id: 'sakravebi', label: 'საკრავები', verb: 'დაუკარი', color: '#a0522d', words: [
      'ჩონგური', 'ფანდური', 'დოლი', 'გარმონი', 'ჭუნირი', 'ჩანგი', 'სალამური', 'დუდუკი', 'გუდასტვირი', 'დაირა', 'დიპლიპიტო', 'ზურნა',
      'ბუკი', 'ფორტეპიანო', 'გიტარა', 'ვიოლინო', 'საყვირი', 'ბარაბანი',
    ],
  },
  {
    id: 'tsekva', label: 'ცეკვა და სიმღერა', verb: 'იცეკვე, იმღერე', color: '#6b4c9a', words: [
      'ხორუმი', 'ლეკური', 'ქართული ცეკვა', 'ფერხული', 'სამაია', 'ხევსურული', 'აჭარული', 'მთიულური', 'ბალეტი', 'ბალერინა', 'დირიჟორი',
      'მომღერალი', 'მგალობელი', 'კრიმანჭული', 'იავნანა', 'მრავალჟამიერი',
    ],
  },
  {
    id: 'tskhovelebi', label: 'ცხოველები და ფრინველები', verb: 'გადაიქეცი', color: '#6f8a1f', words: [
      'მგელი', 'დათვი', 'მელა', 'კურდღელი', 'ზღარბი', 'ციყვი', 'არწივი', 'ბუ', 'მერცხალი', 'ბულბული', 'კალმახი', 'დელფინი', 'ფუტკარი',
      'ჭიანჭველა', 'პეპელა', 'ბაყაყი', 'კუ', 'ცხენი', 'ძროხა', 'თხა', 'ნაგაზი', 'ჯიხვი', 'ირემი', 'მამალი',
    ],
  },
  {
    id: 'sporti', label: 'სპორტი და ეზოს თამაშები', verb: 'ითამაშე', color: '#1c7f86', words: [
      'ჭიდაობა', 'ლელობურთი', 'ფეხბურთი', 'კალათბურთი', 'რაგბი', 'ძიუდო', 'კრივი', 'ცურვა', 'თხილამური', 'ციგა', 'ველოსიპედი', 'მეკარე',
      'მსაჯი', 'ჭადრაკი', 'ფარიკაობა', 'ალპინიზმი', 'ძალოსნობა', 'ჯირითი', 'დამალობანა', 'კლასობანა', 'ჩოგბურთი', 'ფრენბურთი',
    ],
  },
  {
    id: 'kheloba', label: 'ხელობა და საქმე', verb: 'იმუშავე', color: '#5a4636', words: [
      'მჭედელი', 'მწყემსი', 'მეთევზე', 'მონადირე', 'მეთუნე', 'მეღვინე', 'ფეიქარი', 'მებაღე', 'მზარეული', 'ექიმი', 'მასწავლებელი',
      'მხატვარი', 'ფოტოგრაფი', 'მეხანძრე', 'მძღოლი', 'მფრინავი', 'მეფუტკრე', 'მკერავი', 'მეწისქვილე',
    ],
  },
  {
    id: 'samosi', label: 'სამოსი და აბჯარი', verb: 'ჩაიცვი, მოიმარჯვე', color: '#b0475f', words: [
      'ჩოხა', 'ქამარი', 'ხანჯალი', 'ფაფახი', 'ყაბალახი', 'ნაბადი', 'ქალამანი', 'მანდილი', 'თავსაფარი', 'ჩექმა', 'ხმალი', 'ფარი',
      'მშვილდ-ისარი', 'ჯაჭვის პერანგი', 'ხელთათმანი',
    ],
  },
  {
    id: 'supra', label: 'სუფრა და სამზარეულო', verb: 'მიირთვი, მოამზადე', color: '#c7701e', words: [
      'ხინკალი', 'ხაჭაპური', 'მწვადი', 'ჩურჩხელა', 'რთველი', 'ყურძენი', 'ყანწი', 'თამადა', 'სადღეგრძელო', 'თონის პური', 'ნიგოზი',
      'ღომი', 'საზამთრო', 'ნაყინი', 'ჩაი',
    ],
  },
  {
    id: 'zghapari', label: 'ყოფა, ზღაპარი, ისტორია', verb: 'გაითამაშე', color: '#7a2028', words: [
      'ქორწილი', 'ნეფე', 'დედოფალი', 'მეფე', 'მხედარი', 'აკვანი', 'სტუმარი', 'ბებია', 'ბაბუა', 'ურემი', 'ბუხარი', 'დევი', 'ამირანი',
      'ნაცარქექია', 'მზეთუნახავი', 'ოჩოკოჩი', 'გველეშაპი', 'ზარი', 'სანთელი', 'ბერიკაობა', 'ალილო',
    ],
  },
];

export interface PantoCard { w: string; theme: string }
export const PANTO_CARDS: readonly PantoCard[] = PANTO_THEMES.flatMap(t => t.words.map(w => ({ w, theme: t.id })));
export const pantoTheme = (id: string) => PANTO_THEMES.find(t => t.id === id);
