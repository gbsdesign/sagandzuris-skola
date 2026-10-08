// Chant recordings without notes in the app, from the user's Drive folders „ალაზანი“ and „ანჩისხატი“, placed by the
// user on the 2026-10-08 review page: one album per choir (რუსთავი, სამების გუნდი, ფაზისი), one per school for the
// recordings whose book version is not in the app or not clear, and „დასაზუსტებელი“ for the ones still unknown.
// The ones that match a single book version are bound in chantRecordings.ts instead. Shown on the chant page under
// „ჩანაწერები“ (pages/galoba/ChantAlbumPage.tsx); guests see no recordings.

/** One recording: Drive file id, chant, performer, the user's remark ("ზატიკი", "გამშვენებული") */
export type AlbumRec = [id: string, title: string, who: string, note?: string];

export type ChantAlbumId = 'rustavi' | 'sameba' | 'pazisi' | 'shemokmedi' | 'gelati' | 'kartlkakh' | 'unsure';

export interface ChantAlbum {
  id: ChantAlbumId;
  title: string;
  note: string;
}

export const CHANT_ALBUMS: ChantAlbum[] = [
  { id: 'rustavi', title: 'ანსამბლი „რუსთავი“', note: 'გუნდის ჩანაწერები' },
  { id: 'sameba', title: 'სამების გუნდი', note: 'გუნდის ჩანაწერები' },
  { id: 'pazisi', title: 'ანსამბლი „ფაზისი“', note: 'გუნდის ჩანაწერები' },
  { id: 'shemokmedi', title: 'შემოქმედის სკოლა', note: 'ჩანაწერები, რომელთა ნოტები აპში ჯერ არ არის' },
  { id: 'gelati', title: 'გელათის სკოლა', note: 'ჩანაწერები, რომელთა ნოტები აპში ჯერ არ არის' },
  { id: 'kartlkakh', title: 'ქართლ-კახური', note: 'ჩანაწერები, რომელთა ნოტები აპში ჯერ არ არის' },
  { id: 'unsure', title: 'დასაზუსტებელი', note: 'ჯერ გაურკვეველია, რომელ საგალობელს ან სკოლას ეკუთვნის' },
];

export const ALBUM_RECS: Record<ChantAlbumId, AlbumRec[]> = {
  rustavi: [
    ['1B0W99VMK3EhL5tgDhhXqOw10QEQLDBk5', 'და ვითარცა მეუფესა', 'ანსამბლი „რუსთავი“'],
    ['16wOjbVr9V3Nwpq0f9oHmhsF--6qD35vH', 'გიხაროდენ ქალწულთა სიხარულო', 'ანსამბლი „რუსთავი“'],
    ['1o1ySk83Zgv_xgJyWDcHSHdfy5562Vhs8', 'ჯვარსა შენსა', 'ანსამბლი „რუსთავი“'],
    ['17ldkcmFV3F5xCD9hRy9Fq8vLNIaAMc4g', 'ოხითა ამაღლებისა', 'ანსამბლი „რუსთავი“'],
    ['1H3nJWg7jdJT2CwGI3yKWJ5kHUweWnoLp', 'შენ ხარ ვენახი (გურული)', 'ანსამბლი „რუსთავი“'],
    ['1IPDppSqy7dY27xZ8vdIgC1Y4_GlBcEa6', 'შენ ხარ ვენახი', 'ანსამბლი „რუსთავი“'],
    ['1dIBqe2Vjm3acgXzwGNLVlA4Zs2EZEGK1', 'წმიდაო ღმერთო', 'ანსამბლი „რუსთავი“'],
    ['11MdiQeWMOZp1g2u7C9z-dgWFrLg9cC-8', 'ყოველსა ქვეყანასა', 'ანსამბლი „რუსთავი“'],
  ],
  sameba: [
    ['1Tlb7t1orBfhsiDGfkEMq1nI2TUmU7IHz', 'აღდგომისა დღე არს', 'სამების გუნდი'],
    ['1xtLIV1joOjMRxIRrbZZdqjsnxx6otQjG', 'აღვიმსთოთ ჩვენ', 'სამების გუნდი'],
    ['1szssd0ir1lPDdQHoGpJkO_A2pYlQtwBt', 'ანგელოზი ღაღადებს', 'სამების გუნდი'],
    ['1acJ5k2iFzkB00gyVNPtJf2tl5L_j0GT5', 'წმიდაო ღმერთო', 'სამების გუნდი'],
    ['1THrnxHuoj_b3V8F8OSsx3_iQWHHtUzT4', 'ესე არს', 'სამების გუნდი'],
    ['1B6WzHSeJgX0DGL-2Q1PG3AoasofmXuGp', 'განათლდი, განათლდი', 'სამების გუნდი'],
    ['1IVdr38OUDR44uLOKBx8mwvfdYmYYmxgP', 'მოვედით და ვსვათ', 'სამების გუნდი'],
    ['1x4EGtDbUjTGfpedrAxauZTc5frffk1DO', 'რომელმან ყრმანი', 'სამების გუნდი'],
    ['1gTNS56kIFpAv823UhYJl4fw7rRN2amuB', 'საღმრთოსა სახმილავსა', 'სამების გუნდი'],
    ['1KPZqhJVQcu1wqwl59FsOu6hDEa3ZQcLo', 'საუფლო კვართის ტროპარი', 'სამების გუნდი'],
    ['1OJjpIntMdk9bhi53veQ3ImTDaMuGCkG2', 'შენ გიგალობთ', 'სამების გუნდი'],
    ['1g7NHjzsSv9Y5AdZPzu50DUdgE8uKT12R', 'შთაჰხედ შენ', 'სამების გუნდი'],
    ['1GNeAqG8Vs5-OlmCF2EIO6Gd_P0dL31r4', 'სვანური „წმიდაო ღმერთო“', 'სამების გუნდი'],
  ],
  pazisi: [
    ['1XnXjN7tVd33yNrNcHLKi5YdLkv7YfnxD', 'ალილუია', 'ანსამბლი „ფაზისი“'],
    ['1k6w_Q_uz68b7XC1a0vQKGRhVX6WOnv3B', 'ღმერთი უფალი', 'ანსამბლი „ფაზისი“'],
    ['1UrpLtSiUIHGMDE4vyHvCHhif2oX8uSKr', 'ღმერთო, ღმერთო', 'ანსამბლი „ფაზისი“'],
    ['1Mm2PplrDEIqL8Qt8Z5LLNcVxcL0qTDns', 'ჟამთა და წელთა', 'ანსამბლი „ფაზისი“'],
  ],
  shemokmedi: [
    ['1RAo3WkcYpQbnrVkaE8hbMCkQBdP_EEhS', 'კვერთხი იესეს ძირისაგან', 'ანსამბლი „სათანაო“'],
    ['17156_F9-Jppt_5svSaSRApXQU7cysPMl', 'შენ ხარ ვენახი', 'ანსამბლი „ქართული ხმები“'],
    ['1SmnSMZmzPuRwld54GrriswNS2hDVvxTE', 'კონდაკი', 'ანსამბლი „შავნაბადა“'],
    ['1_EUf0FuP-cToqDVX7_zxgTZTmjsZxHqi', 'აღაღე პირი ჩემი', '„11 მარგალიტი“'],
    ['190JMqPRJ0NFeF50hUn8XuFkG71ytUArD', 'ღირსად გაბრიელ', '„11 მარგალიტი“'],
    ['1QyoTsJxQzWl1xoGdU4cAfPMi5xdiXt-7', 'მერცხალო მშვენიერო', '„11 მარგალიტი“'],
    ['1DVNiOWF_53hNKYPtKKPbbWBz6HLQjlCK', 'მოსვლისა შენისა', '„11 მარგალიტი“'],
    ['1beWyPuKo_Lz3gcsVyLKsRlEV-l_KqbtF', 'ნათელი ნათლისაგან მოვლინებული', '„11 მარგალიტი“'],
    ['1nJYvjU2SLNnQXc52NLbNmZb4xRmKYhx9', 'შენ ხარ ვენახი', '„11 მარგალიტი“'],
    ['17DPvOJDqRjwDSHtOmVXQJBNEZEcydQmK', 'შენ, რომელმან განანათლენ', '„11 მარგალიტი“'],
    ['1OOk4KsXDu3pR0QwIdrjKoNSg9cAyexnE', 'შენ ხარ ვენახი', 'არტემ ერქომაიშვილი'],
    ['1ZxsXx_HmuvTGShzjOGAknlNG78brrsrj', 'ესაია მხიარულ', 'ივეტ გრიმოს ექსპედიცია'],
    ['1SU43ZKYnVDxUVrV4gRO9hoTXVf7XFiWS', 'მერცხალო მშვენიერო', 'ივეტ გრიმოს ექსპედიცია'],
    ['1W_s80XLeUqTIPoH7ppBfYnINIHOS2UNq', 'მეუფეო ზეცათაო', 'ივეტ გრიმოს ექსპედიცია'],
    ['1YaQNenEBIr2B-WsiM2fQYxGPHIzzMKSb', 'შენ, რომელმან განანათლე', 'სამუელ ჩავლეიშვილი'],
    ['15ZpFkfS7gPeJVJ9meHtr4lydsrjcfwkb', 'ამინ', 'არტემ ერქომაიშვილი'],
    ['1eo3iRj5zrXFGekmUNtGPOtGNVyxLpfRi', 'აწ ყოვლითურთ', 'არტემ ერქომაიშვილი'],
    ['1rCBVpxqJ6hJELlm6YuMZzIJXtwlyXM6d', 'ბარბარეს ტროპარი', 'არტემ ერქომაიშვილი'],
    ['1XhRdt6K3sglDyar46lnLp9zSTfvtWEDh', 'დიდება შენდა, ქრისტე ღმერთო', 'არტემ ერქომაიშვილი'],
    ['17ROE2tIb2Nmu3kPnzBlyPQF-VhNNSF59', 'ესაია მხიარულ', 'არტემ ერქომაიშვილი'],
    ['1TBhZr5wY--0Y-8LOfdi6b_ETI0L4xxLK', 'ღირს არს', 'არტემ ერქომაიშვილი'],
    ['1wb9xYYlY0zfcJ46qvO2iHLmwYVig2sXj', 'ღირსად გაბრიელ', 'არტემ ერქომაიშვილი'],
    ['1z_8PUIuuFoXMGEs5R8pen_UcYhHcbl7M', 'ღმერთო, მოხედენ', 'არტემ ერქომაიშვილი'],
    ['1zovsAc3xjwotHjbTRSvqbUTEAIaUg-el', 'გული წმიდა და რომელმან', 'არტემ ერქომაიშვილი'],
    ['1GmyatxA5ly-Y4gKlohDRZsRZjbPSXYEY', 'ღვთისმშობლის IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი'],
    ['1abZ4cvmQhEcvws5U5LbKFec2pH8L9hwO', 'კირიე ელეისონ', 'არტემ ერქომაიშვილი'],
    ['1V3SnzTE5X79PHg4BcWbgrjldFgSCS4jO', 'მამაო ყოვლისა მპყრობელო', 'არტემ ერქომაიშვილი'],
    ['1i1XUC7g0E4y3XKGsGlwzP_J3y0C9qEpv', 'მოციქული ქრისტესგან გამორჩეული', 'არტემ ერქომაიშვილი'],
    ['1iq7SNS2YtbjuQojRD6chCzPyAN_jrnI7', 'ნათელი ნათლისაგან', 'არტემ ერქომაიშვილი'],
    ['1_Xf14ciTJiFvbeBTM-gXRfpJgHrURbc9', 'რომელმან შევ…', 'არტემ ერქომაიშვილი'],
    ['1YuJEQHNs5cxZCvXd7tP34MQD7OENhBXt', 'სასწაულით იხსნა ერი თვისი უფალმა', 'არტემ ერქომაიშვილი'],
    ['1J1LLedd9Lx8id2xljR9geclNjrcJ7h6N', 'შობამან შენმან', 'არტემ ერქომაიშვილი'],
    ['1JQLvW03lppDmerp8eX_YiqTfDNhsI5EI', 'წანი ყოვლად ღირსებით', 'არტემ ერქომაიშვილი'],
    ['1gbeha9cChsVpSgAEE5EJHacrNOcDiiUG', 'წინამორბედისა დიდებულისა', 'არტემ ერქომაიშვილი'],
    ['12RI1L3kRXyTK4zwRxUfbyvopUY0tBge8', 'წმიდანო მოწამენო', 'არტემ ერქომაიშვილი'],
    ['12RIyOguSnt0HHBikpluGe719b_LgIrqv', 'წმიდაო, წმიდაო', 'არტემ ერქომაიშვილი'],
    ['1GqpDzKzd8XpZWZn4Yx9gLma6Xw_tRJn5', 'ზეცით გამოჩინებულისა', 'არტემ ერქომაიშვილი'],
    ['15SORbboXFLww-YvmmjRi6_95T9kHyOZr', 'დიდება შენდა, ქრისტე ღმერთო', 'ანჩისხატის გუნდი'],
    ['1koUhML1MzUUUNRPMSL39bDRD3uYxfv5O', 'ღმერთო, მოხედენ', 'ანჩისხატის გუნდი'],
    ['1lCJYe_o_Zt4lAWYJ2zvi2HyPS8iD_eaN', 'ღირს არს', 'ანჩისხატის გუნდი'],
    ['1AvAtXepavYG7X7ylnWgrd01MbAQjUcdP', 'ღირსად გაბრიელ', 'ანჩისხატის გუნდი'],
    ['1NDH5bYNWrTlqN5wc2-gI5mrVvSogg3Es', 'ნათელი ნათლისაგან მოვლინებული', 'ანჩისხატის გუნდი'],
    ['1gKmgBsC4BLy9Mz3dhrxYdQvHuGbTpcHR', 'შობამან შენმან', 'ანჩისხატის გუნდი'],
    ['1km2WT7FwB2vQ7qqQHkIp8B_Z-JwfK8my', 'წანი ყოვლად ღირსებით', 'ანჩისხატის გუნდი'],
    ['1UqvVRt9WdrTCp4JbZLD84DuJxurHLAdl', 'წინამორბედისა დიდებულისა', 'ანჩისხატის გუნდი'],
    ['1BSTWFZ0_ebRmcDqULHffj7B3T9H-X-bC', 'ზეცით გამოჩინებულისა', 'ანჩისხატის გუნდი'],
  ],
  gelati: [
    ['1tbDYOd5f9Nt6u4F3dHKA-Ce3dWIJD2tD', 'სულო ჩემო', 'ანსამბლი „სათანაო“', 'გამშვენებული'],
    ['1S_ImbOUPVKkUiKM2jUeJLJm7HIjf4rAn', 'შთაჰხედ შენ', 'ანსამბლი „სახიობა“', 'ზატიკი'],
    ['1yIiU5Byp9FGnAu3gU-XKYXp7DwEaFKsj', 'შენ გიგალობთ', 'ანსამბლი „შავნაბადა“', 'წირვაშია'],
  ],
  kartlkakh: [
    ['1h01dK6esCoMZQprJVqkqEl8qaC1GXGED', 'საიდუმლო უცხო და დიდებული', 'ანსამბლი „სათანაო“'],
  ],
  unsure: [
    ['1DXElXc0Xazum2pPZHWkdq7slE0spwB3X', 'დიდება', 'ანსამბლი „დიდგორი“'],
    ['118Y0LhcFGaM4IVs_yGHxVrAevrhoAyac', 'ადიდებს სული ჩემი', 'ანსამბლი „სახიობა“'],
    ['1VOKtW1Qb6vg7k9FJN0F_txW6CL8-njDb', 'აღაღე პირი', 'ანსამბლი „სახიობა“'],
    ['1tDpiLdw3ULztmVyD4JPnOTdIVnMgc7bI', 'აღვიმსთოთ ჩვენ', 'ანსამბლი „სახიობა“'],
    ['1eaMCzD3VGG_9n-0sWUPkf3exiwOvL93u', 'და ჩვენ მოგვანიჭა', 'ანსამბლი „სახიობა“'],
    ['1lIrS7MSh1-w1mSPQsF3TwRTciXknjVTI', 'დაღაცათუ ნებსით თვისით', 'ანსამბლი „სახიობა“'],
    ['1M2KiGwlYJcTTrF4PpCy52Z-_e491TgLO', 'გადიდებთ შენ', 'ანსამბლი „სახიობა“'],
    ['1sxDnUCNy7QILoC1PXuuHxr41X3JS6PWc', 'განადიდე შენ, ქრისტე', 'ანსამბლი „სახიობა“'],
    ['1eaj8jgAG8aX-3P13ygHUprgOANb4kExb', 'განათლდი, განათლდი', 'ანსამბლი „სახიობა“'],
    ['1Zp_0LMxm1IFhBzytnEy1uvuPcBYPSszp', 'ღმრთისმშობელო', 'ანსამბლი „სახიობა“'],
    ['1M4EOsVL1bdyzyyMeCMb7sLBY6G2Irfl3', 'ხორცითა მიიძინე', 'ანსამბლი „სახიობა“'],
    ['17nU2qA9oOrKNxD9xSNCJQAH1i-HQDJNS', 'ნუ გარე-მიიქცევ', 'ანსამბლი „სახიობა“'],
    ['1Wofk3fwm0CKOugagOnXE0J2Fzx5iu09L', 'რომელმან ყრმანი იხსნნა', 'ანსამბლი „სახიობა“'],
    ['1DUA1XUOp03fmHBEboxjg1yLsP-5KoAbj', 'რომელმან მეცხრესა ჟამსა', 'ანსამბლი „სახიობა“'],
    ['1cGPy-Ws1SmTLDQm-TxqnTNBBh2j8uImD', 'სახმილავსა', 'ანსამბლი „სახიობა“'],
    ['179pLQxT1un5GZD86oUnszQt-ReAWIjs_', 'საფლავად ხორცისა', 'ანსამბლი „სახიობა“'],
    ['1vLD_H48fGJHzN09SFc5xHMIAndvjQzgB', 'სასუფეველსა შენსა', 'ანსამბლი „სახიობა“'],
    ['1uber94y3OcRNoCYf5wpfS0ppPpn9J0gi', 'სერობასა მას', 'ანსამბლი „სახიობა“'],
    ['1Dmw2GaHqVPd7TZmrcm741tiWtuNzms9k', 'შვენიერმან იოსებ', 'ანსამბლი „სახიობა“'],
    ['1BMQ7qBwv0HqQleJRrxoI9tMyr_CDppCJ', 'სტუმრობისა საღმრთოსა', 'ანსამბლი „სახიობა“'],
    ['1zIqcDoKle8nQbuWouxzR9XblGhH5w3US', 'წარემართენ ლოცვა ჩემი', 'ანსამბლი „სახიობა“'],
    ['1hv3HGRm0P78xVfky8ap7H0NALX1f7Dge', 'წმიდაო დედაო', 'ანსამბლი „სახიობა“'],
    ['1IjFGz_ZKpRcFH3_ZcDlU1zxWzisrmMEQ', 'უფალო, ღაღად-ვყავ', 'ანსამბლი „სახიობა“'],
  ],
};

export const getChantAlbum = (id: string) => CHANT_ALBUMS.find(a => a.id === id);
