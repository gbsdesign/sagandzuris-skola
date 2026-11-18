// „პატარა თეორია“ of the AI lesson (board x-ai-teoria): a rule meets the member where the phrase has it — one sentence on
// what it is, one on where it is in this phrase. Only what the book notes can show (pitch, start, length of each note;
// the books' data has no fermata, tie, bar line or key signature): utils/aiTheory.ts finds them. The school may reword the
// term and its meaning (⚙ „სკოლა“ → AI მასწავლებელი → „პატარა თეორია“, settings/aiTheory); the place sentence stays here:
// `{on}` = „მესამე ნოტზეა“, `{between}` = „მეორე და მესამე ნოტს შორისაა“, `{after}` = „მეორე ნოტის შემდეგაა“.
// Ids stay: a member's record keeps the ones already shown (students.aiNote.seen).

export type TheoryId = 'long' | 'leap' | 'rest' | 'recite' | 'drone' | 'half';

export interface TheoryEntry {
  id: TheoryId;
  term: string;
  /** one sentence: what it means */
  meaning: string;
  /** one sentence: where it is in this phrase */
  where: string;
}

/** in the order they are offered when a phrase has several (one a phrase, each once) */
export const AI_THEORY: TheoryEntry[] = [
  {
    id: 'long', term: 'გრძელი ნოტი',
    meaning: 'ზოგი ნოტი სხვებზე ბევრად გრძელია: მას ბოლომდე აჩერებ და ადრე არ უშვებ.',
    where: 'ამ ფრაზაში ის {on}.',
  },
  {
    id: 'leap', term: 'ნახტომი',
    meaning: 'ხმა ერთი ნოტიდან შორეულ ნოტზე გადადის — მეორე ნოტი ჯერ გულში გაიგონე, მერე აიღე.',
    where: 'ამ ფრაზაში ის {between}.',
  },
  {
    id: 'rest', term: 'პაუზა',
    meaning: 'პაუზა ნოტებს შორის მოკლე სიჩუმეა — აქ ჩაისუნთქე და შემდეგ ნოტს მოემზადე.',
    where: 'ამ ფრაზაში ის {after}.',
  },
  {
    id: 'recite', term: 'ერთ ნოტზე კითხვა',
    meaning: 'რამდენიმე მარცვალი ერთსა და იმავე ნოტზე იგალობება: სიმაღლე არ იცვლება, სიტყვა თანაბრად მიედინება.',
    where: 'ამ ფრაზაში ის {on}.',
  },
  {
    id: 'drone', term: 'ბურდონი',
    meaning: 'ბანი ერთ ნოტს დიდხანს აჩერებს, ზედა ხმები კი მის ზემოთ მოძრაობენ.',
    where: 'ამ ფრაზაში ის {on}.',
  },
  {
    id: 'half', term: 'ნახევარი ტონი',
    meaning: 'ნახევარი ტონი ყველაზე პატარა ნაბიჯია ორ ნოტს შორის — ხმა სულ ცოტათი ინაცვლებს.',
    where: 'ამ ფრაზაში ის {between}.',
  },
];
