# ზარები: TURN გასაღების დაყენება

ზარი ჩვეულებრივ პირდაპირ (STUN-ით) ერთდება. ზოგ ქსელში (სამსახური, სკოლა, ზოგი მობილური ინტერნეტი) ასე ვერ ერთდება —
მაშინ საჭიროა TURN: Cloudflare-ის სერვერი, რომელიც ზარს გადასცემს. კოდი მზადაა, საჭიროა მხოლოდ გასაღები. ეს ერთხელ კეთდება
თქვენი კომპიუტერიდან.

1. გახსენით Cloudflare: https://dash.cloudflare.com → **Realtime** → **TURN Server** → **Create** (სახელი ნებისმიერი).
2. შექმნის შემდეგ გამოჩნდება ორი რამ: **Turn Token ID** და **API Token**. API Token მხოლოდ ერთხელ ჩანს — შეინახეთ.
   (ეს გასაღებები არავისთან გააზიაროთ და ჩატში ან ფაილში ნუ ჩაწერთ.)
3. პროექტის საქაღალდეში, `worker/calls`-ში, ტერმინალში გაუშვით ორი ბრძანება და თითოეულზე ჩასვით შესაბამისი მნიშვნელობა:

   ```
   cd worker/calls
   npx wrangler secret put TURN_KEY_ID
   npx wrangler secret put TURN_KEY_TOKEN
   ```

   `TURN_KEY_ID` = Turn Token ID, `TURN_KEY_TOKEN` = API Token.
4. მზადაა — თავიდან გაშვება არ სჭირდება. შემოწმება: იმავე საქაღალდეში `npx wrangler secret list` — სიაში უნდა ჩანდეს
   `TURN_KEY_ID` და `TURN_KEY_TOKEN`.
