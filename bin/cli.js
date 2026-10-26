#!/usr/bin/env node
import { checkSpf, parseSpf, lintSpf } from '../src/index.js';

const HELP = `Usage: spf-checker <domain> [options]
       spf-checker --record "v=spf1 include:_spf.google.com ~all"

Looks up a domain's SPF record, follows every include/redirect, counts DNS
lookups against the limit of 10 and reports syntax and policy problems.

Options:
  --record <spf>    Lint a record string offline instead of querying DNS
  --json            Print the full report as JSON
  --tree            Show the include tree
  --strict          Exit with code 1 on warnings too
  -h, --help        Show this help

Online version (no install): https://promopilot.link/en/tools/spf-checker.php
`;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (!args.length || flag('-h') || flag('--help')) { process.stdout.write(HELP); process.exit(args.length ? 0 : 2); }

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const ICON = { error: c(31, '✖'), warning: c(33, '!'), info: c(36, 'i') };

function printTree(node, indent = '  ') {
  console.log(`${indent}${c(1, node.domain)}  ${c(2, node.record || '(no SPF)')}`);
  for (const child of node.includes || []) printTree(child, `${indent}  `);
}

try {
  let report;
  if (value('--record')) {
    const record = value('--record');
    const parsed = parseSpf(record);
    const issues = [...parsed.errors.map((m) => ({ level: 'error', code: 'syntax', message: m })), ...lintSpf(record, parsed)];
    report = { record, terms: parsed.terms, issues, ok: !issues.some((i) => i.level === 'error') };
  } else {
    report = await checkSpf(args.find((a) => !a.startsWith('-')));
  }
  if (flag('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (report.domain) console.log(`${c(1, 'Domain:')}  ${report.domain}`);
    console.log(`${c(1, 'Record:')}  ${report.record || '(none)'}`);
    if (report.lookups !== undefined) console.log(`${c(1, 'Lookups:')} ${report.lookups}/10`);
    if (flag('--tree') && report.tree) { console.log(''); printTree(report.tree); }
    console.log('');
    if (!report.issues.length) console.log(c(32, '✔ SPF looks good'));
    for (const i of report.issues) console.log(`  ${ICON[i.level]} ${i.message}`);
  }
  const failing = report.issues.filter((i) => i.level === 'error' || (flag('--strict') && i.level === 'warning'));
  process.exit(failing.length ? 1 : 0);
} catch (err) {
  console.error(c(31, `Error: ${err.message}`));
  process.exit(2);
}
