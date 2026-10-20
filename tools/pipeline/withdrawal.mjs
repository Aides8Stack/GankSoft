// Authority is protected main + an owner-reviewed merge, never the candidate checkout.
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import {
  requireReleaseProtection,
  authorizeReleaseContext,
} from "./protection.mjs";
import { tagSha, getRelease, verifyRemote } from "./release.mjs";
const fullSha = (x) => typeof x === "string" && /^[a-f0-9]{40}$/.test(x);
const positive = (x) => Number.isSafeInteger(x) && x > 0;
const timestamp = (x) =>
  typeof x === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x) &&
  Number.isFinite(Date.parse(x));
export function withdrawalPath(version) {
  if (
    typeof version !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-rc\.[1-9]\d*$/.test(version)
  )
    throw Error("BLOCKED: canonical RC withdrawal version required");
  return `.github/release-withdrawals/v${version}.json`;
}
export function validateWithdrawal(record, item, policy) {
  withdrawalPath(item.version);
  if (
    record?.schema !== 1 ||
    !["AUTHORIZED", "COMPLETED"].includes(record.phase) ||
    record.repository !== policy.repository ||
    record.version !== item.version ||
    record.tag !== "v" + item.version ||
    record.sourceSha !== item.sha ||
    !fullSha(record.sourceSha) ||
    record.lockSha256 !== item.lockSha256 ||
    !/^[a-f0-9]{64}$/.test(record.lockSha256 ?? "") ||
    !positive(record.releaseId) ||
    record.releaseUrl !==
      `https://github.com/${policy.repository}/releases/tag/${record.tag}` ||
    typeof record.reason !== "string" ||
    !record.reason.trim() ||
    record.reason.length > 4000 ||
    !policy.owners.includes(record.authorizedBy) ||
    !timestamp(record.authorizedAt) ||
    !/^([a-f0-9]{64})$/.test(record.manifestSha256 ?? "")
  )
    throw Error("BLOCKED: withdrawal identity or authorization mismatch");
  if (record.phase === "COMPLETED") {
    const e = record.execution;
    if (
      !e ||
      !["DELETE_RELEASE", "CONFIRM_AUTHORIZED_ABSENCE"].includes(e.operation) ||
      !fullSha(e.authorizationCommit) ||
      !fullSha(e.authorizationBlob) ||
      !positive(e.runId) ||
      !positive(e.attempt) ||
      !fullSha(e.workflowSha) ||
      !policy.owners.includes(e.actor) ||
      !timestamp(e.withdrawnAt) ||
      Date.parse(e.withdrawnAt) < Date.parse(record.authorizedAt)
    )
      throw Error("BLOCKED: withdrawal execution evidence invalid");
  }
  return record;
}
export const manifestHash = (checksums) =>
  createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(checksums).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      ),
    )
    .digest("hex");
async function ownerMerge(api, repo, commit, policy, mainSha) {
  const merges = await api(`/repos/${repo}/commits/${commit}/pulls`);
  if (!Array.isArray(merges) || !merges.length)
    throw Error("BLOCKED: owner-reviewed withdrawal merge required");
  let reviewed = null;
  for (const p of merges) {
    const pr = await api(`/repos/${repo}/pulls/${p.number}`);
    if (
      pr?.merged === true &&
      fullSha(pr.merge_commit_sha) &&
      pr.base?.ref === "main" &&
      pr.base?.repo?.full_name === repo &&
      pr.head?.repo?.full_name === repo &&
      policy.owners.includes(pr.user?.login) &&
      policy.owners.includes(pr.merged_by?.login)
    ) {
      // Path history returns the original PR commit for a normal merge, not the merge SHA.
      const contained = await api(
        `/repos/${repo}/compare/${commit}...${pr.merge_commit_sha}`,
      );
      const landed = await api(
        `/repos/${repo}/compare/${pr.merge_commit_sha}...${mainSha}`,
      );
      if (
        !["ahead", "identical"].includes(contained?.status) ||
        !["ahead", "identical"].includes(landed?.status)
      )
        throw Error("BLOCKED: owner merge not in trusted main history");
      reviewed = { pr: pr.number ?? p.number, mergeSha: pr.merge_commit_sha };
    }
  }
  if (!reviewed)
    throw Error("BLOCKED: owner-reviewed withdrawal merge required");
  return reviewed;
}
export async function readWithdrawal(api, item, policy) {
  const path = withdrawalPath(item.version),
    repo = policy.repository;
  const main = await api(`/repos/${repo}/branches/main`),
    mainSha = main?.commit?.sha;
  if (!fullSha(mainSha)) throw Error("BLOCKED: trusted main unavailable");
  const file = await api(`/repos/${repo}/contents/${path}?ref=${mainSha}`);
  if (file === null) return null;
  await requireReleaseProtection(api, repo, "main");
  if (
    file?.type !== "file" ||
    file.encoding !== "base64" ||
    typeof file.content !== "string" ||
    file.content.length > 1000000
  )
    throw Error("BLOCKED: withdrawal record unavailable");
  const bytes = Buffer.from(file.content.replace(/\s/g, ""), "base64");
  if (
    file.sha !==
    createHash("sha1")
      .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
      .digest("hex")
  )
    throw Error("BLOCKED: withdrawal blob digest mismatch");
  let record;
  try {
    record = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw Error("BLOCKED: malformed withdrawal record");
  }
  validateWithdrawal(record, item, policy);
  const history = await api(
    `/repos/${repo}/commits?sha=${mainSha}&path=${encodeURIComponent(path)}&per_page=1`,
  );
  if (
    !Array.isArray(history) ||
    history.length !== 1 ||
    !fullSha(history[0].sha)
  )
    throw Error("BLOCKED: withdrawal audit history unavailable");
  const approval = await ownerMerge(api, repo, history[0].sha, policy, mainSha);
  if (record.phase === "COMPLETED") {
    const e = record.execution;
    const original = await api(
      `/repos/${repo}/contents/${path}?ref=${e.authorizationCommit}`,
    );
    if (
      original?.type !== "file" ||
      original.encoding !== "base64" ||
      original.sha !== e.authorizationBlob ||
      typeof original.content !== "string" ||
      original.content.length > 1000000
    )
      throw Error("BLOCKED: original authorization unavailable");
    const bytes = Buffer.from(original.content.replace(/\s/g, ""), "base64");
    if (
      createHash("sha1")
        .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
        .digest("hex") !== e.authorizationBlob
    )
      throw Error("BLOCKED: original authorization blob mismatch");
    let prior;
    try {
      prior = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw Error("BLOCKED: malformed original authorization");
    }
    const expected = { ...record, phase: "AUTHORIZED" };
    delete expected.execution;
    if (!isDeepStrictEqual(prior, expected))
      throw Error("BLOCKED: completed receipt altered original authorization");
    validateWithdrawal(prior, item, policy);
    await ownerMerge(api, repo, e.authorizationCommit, policy, mainSha);
    const authorizedBeforeRun = await api(
      `/repos/${repo}/compare/${e.authorizationCommit}...${e.workflowSha}`,
    );
    if (!["ahead", "identical"].includes(authorizedBeforeRun?.status))
      throw Error("BLOCKED: authorization not in execution main history");
    const run = await api(
      `/repos/${repo}/actions/runs/${e.runId}/attempts/${e.attempt}`,
    );
    if (
      run?.id !== e.runId ||
      run.run_attempt !== e.attempt ||
      run.repository?.full_name !== repo ||
      run.head_repository?.full_name !== repo ||
      run.event !== "workflow_dispatch" ||
      run.head_branch !== "main" ||
      run.path !== ".github/workflows/release-control.yml" ||
      run.head_sha !== e.workflowSha ||
      run.actor?.login !== e.actor ||
      !policy.owners.includes(run.triggering_actor?.login) ||
      run.status !== "completed" ||
      run.conclusion !== "success" ||
      !Number.isFinite(Date.parse(run.created_at)) ||
      !Number.isFinite(Date.parse(run.updated_at)) ||
      Date.parse(e.withdrawnAt) < Date.parse(run.created_at) ||
      Date.parse(e.withdrawnAt) > Date.parse(run.updated_at)
    )
      throw Error("BLOCKED: trusted withdrawal Run evidence mismatch");
    const ancestry = await api(
      `/repos/${repo}/compare/${e.workflowSha}...${mainSha}`,
    );
    if (!["ahead", "identical"].includes(ancestry?.status))
      throw Error("BLOCKED: withdrawal workflow not in trusted main history");
  }
  return {
    record,
    mainSha,
    auditCommit: history[0].sha,
    blob: file.sha,
    approval,
  };
}
// Called only by owner workflow_dispatch on main; no contents write to main is performed.
export async function withdrawRC(
  api,
  item,
  policy,
  env = process.env,
  now = () => new Date().toISOString(),
) {
  authorizeReleaseContext(env, policy.repository, "main", policy.owners, true);
  if (env.CONFIRM !== `withdraw v${item.version} ${item.sha}`)
    throw Error("Explicit withdrawal confirmation required");
  const trusted = await readWithdrawal(api, item, policy);
  if (!trusted)
    throw Error("BLOCKED: approved main withdrawal authorization required");
  const { record } = trusted,
    repo = policy.repository;
  if (trusted.mainSha !== env.GITHUB_SHA)
    throw Error("BLOCKED: dispatch must use current reviewed main");
  if ((await tagSha(api, repo, record.tag)) !== item.sha)
    throw Error("BLOCKED: withdrawal Tag mismatch");
  const release = await getRelease(api, repo, record.tag);
  if (record.phase === "COMPLETED") {
    if (release) throw Error("BLOCKED: withdrawn Release reappeared");
    return record;
  }
  if (!release) {
    const completed = {
      ...record,
      phase: "COMPLETED",
      execution: {
        runId: Number(env.GITHUB_RUN_ID),
        attempt: Number(env.GITHUB_RUN_ATTEMPT),
        workflowSha: env.GITHUB_SHA,
        actor: env.GITHUB_ACTOR,
        withdrawnAt: now(),
        operation: "CONFIRM_AUTHORIZED_ABSENCE",
        authorizationCommit: trusted.auditCommit,
        authorizationBlob: trusted.blob,
      },
    };
    validateWithdrawal(completed, item, policy);
    return completed;
  }
  if (
    release.draft ||
    !release.prerelease ||
    release.id !== record.releaseId ||
    release.target_commitish !== item.sha ||
    release.html_url !== record.releaseUrl
  )
    throw Error("BLOCKED: authorized original public RC required");
  const verified = await verifyRemote(api, repo, release, item);
  if (manifestHash(verified.checksums) !== record.manifestSha256)
    throw Error("BLOCKED: authorized release manifest mismatch");
  const execution = {
    runId: Number(env.GITHUB_RUN_ID),
    attempt: Number(env.GITHUB_RUN_ATTEMPT),
    workflowSha: env.GITHUB_SHA,
    actor: env.GITHUB_ACTOR,
    withdrawnAt: now(),
    operation: "DELETE_RELEASE",
    authorizationCommit: trusted.auditCommit,
    authorizationBlob: trusted.blob,
  };
  const completed = { ...record, phase: "COMPLETED", execution };
  validateWithdrawal(completed, item, policy);
  // Recheck the immutable deletion target and Tag after asset verification.
  const current = await getRelease(api, repo, record.tag);
  if (
    !current ||
    current.id !== record.releaseId ||
    current.draft ||
    !current.prerelease ||
    current.target_commitish !== item.sha ||
    (await tagSha(api, repo, record.tag)) !== item.sha
  )
    throw Error("BLOCKED: withdrawal race conflict");
  await api(`/repos/${repo}/releases/${record.releaseId}`, {
    method: "DELETE",
  });
  completed.execution.withdrawnAt = now();
  validateWithdrawal(completed, item, policy);
  if (
    (await getRelease(api, repo, record.tag)) ||
    (await tagSha(api, repo, record.tag)) !== item.sha
  )
    throw Error("BLOCKED: withdrawal postcondition failed");
  return completed;
}

// Planning is read-only. The resulting authorization still needs a separate owner-merged main PR.
export async function prepareWithdrawal(
  api,
  item,
  policy,
  env = process.env,
  now = () => new Date().toISOString(),
) {
  authorizeReleaseContext(env, policy.repository, "main", policy.owners, true);
  await requireReleaseProtection(api, policy.repository, "main");
  const main = await api(`/repos/${policy.repository}/branches/main`);
  if (main?.commit?.sha !== env.GITHUB_SHA)
    throw Error("BLOCKED: dispatch must use current reviewed main");
  if (await readWithdrawal(api, item, policy))
    throw Error(
      "BLOCKED: withdrawal record already exists; preserve audit history",
    );
  const tag = "v" + item.version,
    release = await getRelease(api, policy.repository, tag);
  if (
    !release ||
    release.draft ||
    !release.prerelease ||
    release.target_commitish !== item.sha ||
    (await tagSha(api, policy.repository, tag)) !== item.sha
  )
    throw Error("BLOCKED: original published RC required");
  const verified = await verifyRemote(api, policy.repository, release, item);
  const record = {
    schema: 1,
    phase: "AUTHORIZED",
    repository: policy.repository,
    version: item.version,
    tag,
    sourceSha: item.sha,
    lockSha256: item.lockSha256,
    releaseId: release.id,
    releaseUrl: release.html_url,
    reason: env.WITHDRAWAL_REASON,
    authorizedBy: env.GITHUB_ACTOR,
    authorizedAt: now(),
    manifestSha256: manifestHash(verified.checksums),
  };
  return validateWithdrawal(record, item, policy);
}
