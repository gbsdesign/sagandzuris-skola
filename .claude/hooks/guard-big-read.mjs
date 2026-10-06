// PreToolUse hook for Read: refuse to read a big text file whole (it costs the user real money).
// A Read with offset/limit, Grep, and images/PDFs are never blocked.
import fs from 'node:fs';

const LIMIT_KB = 200;
const TEXT = /\.(json|ts|tsx|js|mjs|cjs|jsx|md|txt|css|html|csv|svg|xml|yaml|yml)$/i;

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  try {
    const { tool_input: input = {} } = JSON.parse(raw);
    const file = input.file_path;
    if (!file || input.offset != null || input.limit != null || !TEXT.test(file)) return;
    const kb = fs.statSync(file).size / 1024;
    if (kb <= LIMIT_KB) return;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `${file} is ${Math.round(kb)} KB — reading it whole wastes many tokens. ` +
          'Use Grep to find what you need, or Read with offset/limit for a small line range.',
      },
    }));
  } catch {
    // never block work because the guard itself failed
  }
});
