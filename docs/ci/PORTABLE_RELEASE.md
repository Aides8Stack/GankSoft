# Windows Portable Release (GankSoft)

Current goal: Windows 10/11 x64 portable ZIP only. No Inno Setup EXE, no installer registry/upgrade/uninstall tests, no historical multi-RC rebuild queue in the active develop workflow.

After merge into develop:
1. GitHub Actions runs the quality (Ubuntu+Windows), security, Windows portable package/GUI smoke, real Windows ZIP extraction at 80/100 character destinations, and artifact verification.
2. Only a verified `GankSoft-v<version>-win64-portable.zip` is built. ZIP root is `GankSoft/`; fully extract it and run `GankSoft.exe`.
3. The `release-rc` job waits for the repository owner's approval in `rc-publish-owner`, then creates a **prerelease** tagged `v<version>` with the portable ZIP, SHA256SUMS.txt, source.json and TEST_REPORT.json. It refuses to overwrite an existing release/tag. GitHub Release assets do not inherit the 14-day Actions artifact expiry, though owners may remove them.
4. Manual Win10/11 testing remains NOT_RUN until separately performed. Application/user data is not bundled or deleted.

This intentionally replaces the active install-centric develop workflow. The legacy installer scripts/tests and manual stable-candidate workflow are retained for historical reference but are not invoked by the portable develop pipeline. Before ever using legacy stable-candidate, it must be migrated separately; do not regard it as a portable-only release.

Gates: protect develop, PR quality + pr-trust, owner-controlled rc-publish-owner environment. No merge/release is performed by creating this PR.
