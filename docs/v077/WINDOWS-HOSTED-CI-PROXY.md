# GankSoft v0.7.7 — Windows hosted CI proxy (not client acceptance)

## Scope and hard boundary

This branch adds a **read-only CI proxy** on GitHub-hosted `windows-latest`. It intentionally does **not** call the 8 physically attended native cases:
`NEW-13`, `CLIP-03`, `CLIP-09`, `WIN-04`, `WIN-05`, `WIN-06`, `WIN-07`, `WIN-09`.

GitHub Windows Server CI can establish useful automated Electron GUI and controlled-clipboard behavior,
but is not an attested client Windows 10/11 desktop with installed Word/WPS, live IME candidate input,
physical Snipping Tool paste, and two-platform evidence.

Only the five *supplementary Windows-hosted cross-platform proxy runs* `NEW-01`, `OLD-03`, `CLIP-01`,
`CLIP-02`, `CLIP-04` are executed in CI. They do **not** replace the previous Linux evidence
or modify the canonical `E2E-RESULTS.json`. They use real Electron GUI and isolated Schema606 fixtures,
and all evidence is saved under `validation-results/v077/windows-ci-proxy/` plus the standard runs directory.

## Workflow and source identity

- Workflow: `.github/workflows/v077-windows-proxy.yml`, push scoped to `feature/v077`
  and only test/workflow files. It does not modify the protected default branch, RC/release jobs,
  or existing PR-required checks. No deploy keys or secrets; permissions are read-only.
- `windows-platform.mjs`: OS identity via `Win32_OperatingSystem.ProductType`.
  Build 26100 with ProductType=3 is **Windows Server**, never automatically Win11.
  Unavailable CIM identity fails closed.
- `scenarios/win-native-support.mjs`: requires verified client ProductType=1 before
  a physical native case may proceed. `win09-verify.mjs` and `m5-pair-verify.mjs`
  reject server evidence.
- `windows-ci-proxy.mjs`: generates `summary.json` with source SHA, OS type,
  per-case outputs, errors, and explicitly unchanged 8-case physical status.
- CI artifacts upload even if tests fail. No automatic PASS promotion from Windows Server.

## Next real client acceptance

A true Win10/Win11 desktop VM or interactive self-hosted runner must run the **existing**
attended cases, with verified ProductType=1, actual applications and physical/system-level
input event evidence. Cross-OS WIN-09 requires same ZIP + EXE + source-hash proofs.
There are still 8 native priority cases with no such attested results as of this
integration; the CI proxy cannot sign them off.

## Status

## Actual GitHub Actions result — 2026-10-30

- **Run:** [#41035381730](https://github.com/Aides8Stack/GankSoft/actions/runs/41035381730) — **SUCCESS**.
- **Exact tested SHA:** `44960f900aa94210f60e706aef2b666c7f62fff7`.
- **Host identity:** Microsoft Windows Server 2025 Datacenter, build `26100`, `Win32_OperatingSystem.ProductType=3`, correctly classified `windows_server`, **not Windows 11**.
- **Completed checks:** OS identity unit tests PASS; `npm ci` PASS; `npm run build` PASS; actual Windows-hosted Electron GUI and controlled clipboard proxy **5/5 PASS**.
- **Proxy cases:** `NEW-01`, `OLD-03`, `CLIP-01`, `CLIP-02`, `CLIP-04` — all PASS (GUI steps and persistent draft readback; supplementary Windows Server evidence).
- **Source-signed evidence:** [Artifact #12968156118](https://github.com/Aides8Stack/GankSoft/actions/runs/41035381730/artifacts/12968156118); artifact ZIP SHA-256 `98b02aa659c33ef7c663bf8ff731b2c3ca22c647198704b9d27c613896d2924e`; upload succeeded.
- **Original 8 physical Windows cases:** `NEW-13`, `CLIP-03`, `CLIP-09` remain BLOCKED; `WIN-04`, `WIN-05`, `WIN-06`, `WIN-07`, `WIN-09` remain NOT_RUN. Windows Server 2025 results are not their client/native certification.
- **Canonical ledger:** deliberately unchanged by this CI run; this is supplementary platform coverage, not a new set of original test CASE results.
- Persistent compact machine-readable evidence: `docs/v077/evidence/WINDOWS-HOSTED-CI-RESULTS.json`. The uploaded original screenshots and `case.json` retain their detailed runtime provenance.

**Next physical acceptance:** Arrange actual Windows 10/11 client interactive VM or self-hosted runner; use existing native tests and verify ProductType=1, genuine external sources and, for WIN-09, same portable ZIP on both clients. Do not relax source authentication or accept PowerShell-generated fake IME/paste events.
