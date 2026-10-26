# FAQ

## What does "too many DNS lookups" mean?

RFC 7208 limits SPF evaluation to 10 DNS-querying terms (`include`, `a`, `mx`, `ptr`, `exists`, `redirect`), counted across all nested includes. Above that, receivers stop and return `permerror`, which DMARC treats as a failure. Fix it by removing unused senders, replacing `a`/`mx` with `ip4`/`ip6`, or using a subdomain for bulk mail.

## Should I use ~all or -all?

`~all` (softfail) is the common, safe choice while you are still discovering who sends mail for you. `-all` (fail) is stricter. With DMARC enforcement (`p=quarantine` or `p=reject`) the difference matters less, because DMARC decides the outcome. Never use `+all`.

## I have two SPF records — is that a problem?

Yes. A domain must publish exactly one TXT record starting with `v=spf1`. Merge them into one: keep a single `v=spf1`, combine the mechanisms, end with one `all`.

## Does SPF alone stop spoofing?

No. SPF checks the envelope sender (Return-Path), not the From address people see. You need DKIM and a DMARC policy for real protection against spoofing.

## Why is the lookup count different from another checker?

Some tools count the `ip4`/`ip6` terms or skip `redirect`. This one follows RFC 7208: only the six lookup-costing terms count, `redirect` is ignored when `all` is present, and nested includes count fully.

## Is there a version without installing anything?

Yes — the [online SPF Checker](https://promopilot.link/en/tools/spf-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=spf-checker) runs the same checks in the browser and explains each problem.

---
[Home](Home) · [Getting started](Getting-Started) · [FAQ](FAQ) · [Troubleshooting](Troubleshooting) · [Online tool](https://promopilot.link/en/tools/spf-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=spf-checker)
