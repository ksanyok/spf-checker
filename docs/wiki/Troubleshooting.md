# Troubleshooting

## `DNS error ... ETIMEOUT` or `ECONNREFUSED`

Your network blocks DNS or the resolver is slow. Try another network, or pass your own resolver via the library's `resolveTxt` option.

## The record I just changed is not shown

DNS caches records for their TTL. Wait for the TTL to expire, or query the authoritative server with `dig TXT example.com @ns1.your-dns.com`.

## `include-no-spf` for a vendor include

The include points to a domain without an SPF record — often a typo or a retired vendor hostname. Check the vendor's documentation for the current include.

## `npx github:...` is slow the first time

npx downloads the repository once and caches it. Install globally with `npm install -g` to avoid the delay.

## `SyntaxError: Cannot use import statement`

Your Node.js is too old. Run `node -v`; version 18 or newer is required.

Still stuck? [Open an issue](https://github.com/ksanyok/spf-checker/issues/new/choose) or try the [online version](https://promopilot.link/en/tools/spf-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=spf-checker).

---
[Home](Home) · [Getting started](Getting-Started) · [FAQ](FAQ) · [Troubleshooting](Troubleshooting) · [Online tool](https://promopilot.link/en/tools/spf-checker.php?utm_source=github&utm_medium=repo&utm_campaign=tools&utm_content=spf-checker)
