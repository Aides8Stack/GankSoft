# R0 dependency recovery — 2026-10-27

Starting remote: bccf6ff9f601bb586d5a3f1203378c825ac28eb8; PR15 open/Draft, develop base. Local c074dfa33dc4786fdd77e6215b470baae1433c4f is the prior local checkpoint: its tree 4dc91daeea63b82f084585928911676507cbb12e equals the remote tree. Initial worktree clean. No branch/history reset.

- `npm ci --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000` (90s outer timeout): exit 0, 381 packages in 11s. npm emitted an unknown http-proxy config warning. No lockfile changes.
- `npm ls --depth=0`: exit 0, no missing/invalid direct packages.
- Electron first require downloaded the locked 44.9.1 Linux binary successfully; this is separate from package installation.
- `npm run build`: exit 0, typechecks and production bundle completed; Vite reported large chunks.
- Prototype SHA256 matches 8f5db6aa3953d3b36cc10867cbbf3b149afd22d038bdb3a7526305657bc38015.
- Lockfile SHA256 remains e53b1b2e29621b28bec311b812cbe9a860bc1e9cee15d77b4def530352bbce31.
- Node v24.22.1, npm 11.9.0, Linux. No Windows execution.

Dependency-cache blocker resolved. R0 remains IN_PROGRESS pending source audit, matched fixtures, computed styles and baseline evidence; no R1/R2 work authorized this round.
