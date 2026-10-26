# Getting started

## Requirements

Node.js 18 or newer. Nothing else — the package has no dependencies.

## Install

```bash
# run straight from GitHub, nothing to install
npx github:ksanyok/spf-checker example.com

# or install the CLI globally
npm install -g github:ksanyok/spf-checker
spf-checker example.com
```

## First run

### Check a domain and show the include tree

```bash
spf-checker example.com --tree
```

### Lint a record before publishing it (no DNS needed)

```bash
spf-checker --record "v=spf1 include:_spf.google.com include:sendgrid.net ~all"
```

### JSON for monitoring scripts

```bash
spf-checker example.com --json | jq '.lookups, .issues'
```

## Reading the result

The header shows the domain, the record found and `Lookups: N/10`. With `--tree` you see each include with its own record, indented by depth — the deepest, widest branches are where lookups go. Findings:

- **✖ error** — receivers will return `permerror` or the policy is dangerous (`+all`). Fix now.
- **! warning** — works, but weak or close to the limit.
- **i info** — cleanup suggestions.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | SPF is valid (warnings allowed unless `--strict`) |
| 1 | At least one error, or a warning with `--strict` |
| 2 | DNS failure or invalid arguments |

Use them in scripts and CI to fail a build when something breaks.

---
[Home](Home) · [Getting started](Getting-Started) · [FAQ](FAQ) · [Troubleshooting](Troubleshooting) · [Online tool](https://promopilot.link/en/tools/spf-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=spf-checker)
