---
name: publish
description: Check the app and publish it to the live site sagandzuris-skola.pages.dev (გამოქვეყნება). Use when the user asks to publish, upload to GitHub, or put changes on the site.
---

# Publish

The live site serves GitHub `main` (Cloudflare Pages, auto-deploy within minutes). Talk in Georgian, step by step.

1. **See what will go out.** `git status` and `git diff --stat`. List the changed files for the user in plain
   words. If some changes look unfinished or belong to another session's work, ask before including them.
   Re-check `git log -1` right before committing — the user sometimes commits from VS Code themselves.
2. **Check it builds.** `npm run typecheck`, then `npm run build` (about 1–2 minutes; it copies ~200 MB of
   public files). If either fails, stop, explain in Georgian, and fix only with the user's OK.
3. **Firestore rules.** If `firestore.rules` changed, remind the user it must be pasted into the Firebase
   console by hand (project psalms-reading-group-ge-dev → Firestore → the `ai-studio-…` database → Security tab).
4. **Commit and push.**
   - Local session on `main`: commit with a clear message and `git push origin main` (needs the user's OK).
   - Cloud session: push a branch and open a pull request; tell the user that merging it publishes the site.
5. **Verify live** (after a push to main, wait ~2–3 minutes): fetch `https://sagandzuris-skola.pages.dev` and
   check that a new feature string appears in the live JS bundle, or that a new `/public` file answers with its
   real type (the SPA fallback answers missing files with `index.html` and status 200, so check the type).
6. Report: what was published, the commit id, and that the site is updated.
