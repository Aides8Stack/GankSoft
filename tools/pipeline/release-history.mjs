import { tagSha, getRelease, verifyRemote } from "./release.mjs";
import { readWithdrawal } from "./withdrawal.mjs";
export async function releaseState(api, item, policy) {
  const repo = policy.repository,
    tag = "v" + item.version;
  const authorization = await readWithdrawal(api, item, policy);
  const sha = await tagSha(api, repo, tag),
    release = await getRelease(api, repo, tag),
    record = authorization?.record;
  if (sha && sha !== item.sha) throw Error("BLOCKED: Tag conflict");
  if (record?.phase === "COMPLETED") {
    if (sha !== item.sha || release)
      throw Error(
        "BLOCKED: completed withdrawal conflicts with Tag or Release",
      );
    return {
      state: "WITHDRAWN_AUTHORIZED",
      version: item.version,
      sha: item.sha,
      releaseId: record.releaseId,
      authorization,
    };
  }
  // An approved intent reserves a version but does not prove deletion completed.
  if (record) throw Error("BLOCKED: withdrawal completion receipt required");
  if (!release) {
    if (sha)
      throw Error(
        "BLOCKED: unknown orphan Tag; withdrawal authorization missing",
      );
    return { state: "PENDING", ...item };
  }
  if (release.draft) {
    if (
      release.target_commitish !== item.sha ||
      !release.prerelease ||
      !release.body?.includes(`\nSource: ${item.sha}\n`) ||
      !release.body.includes(`\nVersion: ${item.version}\n`) ||
      !release.body.includes(`\nLock SHA256: ${item.lockSha256}\n`)
    )
      throw Error("BLOCKED: Draft identity conflict");
    return { state: "DRAFT_RECOVERABLE", ...item, releaseId: release.id };
  }
  if (!release.prerelease || sha !== item.sha)
    throw Error("BLOCKED: public RC identity mismatch");
  return {
    state: "PUBLISHED_VERIFIED",
    ...(await verifyRemote(api, repo, release, item)),
  };
}
export async function reconcileHistory(api, items, policy) {
  const intents = [],
    completed = [],
    withdrawn = [],
    history = [];
  for (const item of items) {
    const entry = await releaseState(api, item, policy);
    history.push(entry);
    if (entry.state === "PUBLISHED_VERIFIED") completed.push(entry);
    else if (entry.state === "WITHDRAWN_AUTHORIZED") withdrawn.push(entry);
    else intents.push(item);
  }
  return { intents, completed, withdrawn, history };
}
