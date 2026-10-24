// At the start of every session: which folder this copy is in, and whether it is behind or ahead of GitHub.
// The user works on several computers, with the project in a different folder on each; GitHub main is what they share.
import { execFileSync } from 'node:child_process';

const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const lines = [`Project folder on this computer: ${dir}`];
try {
  let reached = true;
  try { git('fetch', '--quiet', 'origin'); } catch { reached = false; }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  const [behind, ahead] = git('rev-list', '--left-right', '--count', 'origin/main...HEAD').split(/\s+/).map(Number);
  const changed = git('status', '--porcelain').split('\n').filter(Boolean).length;
  lines.push(`Branch ${branch}: ${behind} commit(s) behind GitHub main, ${ahead} ahead${reached ? '' : ' (GitHub not reached — as of the last fetch)'}; ${changed} changed file(s) not committed.`);
  if (behind > 0) lines.push('This copy is BEHIND GitHub: tell the user in Georgian and, with their OK, `git pull` before editing anything.');
  if (ahead > 0 || changed > 0) lines.push('Some work here is not on GitHub yet: the other computers will not see it until it is committed and pushed (/publish).');
} catch (e) {
  lines.push(`The git check failed: ${e.message}`);
}
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } }));
