# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-26

### Added
- `spf-checker` CLI with `--tree`, `--json`, `--strict` and offline `--record` linting
- RFC 7208 parser for all mechanisms, qualifiers and modifiers with IPv4/IPv6 validation
- Recursive include/redirect evaluation with lookup and void-lookup counting and loop detection
- Policy lints: +all, ?all, missing all, ptr, mechanisms after all, duplicates, long records
- Library API (`checkSpf`, `parseSpf`, `lintSpf`) with injectable resolver, and GitHub Action

[1.0.0]: https://github.com/ksanyok/spf-checker/releases/tag/v1.0.0
