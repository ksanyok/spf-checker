# SPF Checker

`spf-checker` looks up a domain's SPF record, parses it, follows every `include:` and `redirect=` recursively and counts DNS lookups the way receiving mail servers do. It reports syntax errors, risky policies and the infamous *too many DNS lookups* `permerror` — and prints the whole include tree so you can see which vendor is eating your budget.

- **[Getting started](Getting-Started)** — install, first run, reading the output
- **[FAQ](FAQ)** — common questions
- **[Troubleshooting](Troubleshooting)** — errors and how to fix them

Prefer a browser? The same check runs online at **[PromoPilot](https://promopilot.link/en/tools/spf-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=spf-checker)** — free, no sign-up.

---
[Home](Home) · [Getting started](Getting-Started) · [FAQ](FAQ) · [Troubleshooting](Troubleshooting) · [Online tool](https://promopilot.link/en/tools/spf-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=spf-checker)
