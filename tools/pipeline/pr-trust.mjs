// Embedded verbatim in pr-trust.yml. It must run from the protected default
// branch, with API metadata only: never checkout/import/install PR content.
export async function trustedPR({github, context, core, env}) {
 const repository = 'Aides8Stack/GankSoft', owner = 'Aides8Stack';
 if (context.eventName === 'workflow_dispatch' && context.ref !== 'refs/heads/main') throw Error('Owner review must run on default main');
 const repo = {owner: 'Aides8Stack', repo: 'GankSoft'};
 const manual = context.eventName === 'workflow_dispatch';
 if (context.repo.owner + '/' + context.repo.repo !== repository) throw Error('Wrong repository');
 const number = manual ? Number(env.PR_NUMBER) : context.payload.pull_request?.number;
 if (!Number.isSafeInteger(number) || number < 1) throw Error('Invalid PR number');
 const pr = (await github.rest.pulls.get({...repo, pull_number: number})).data;
 const sha = pr.head?.sha;
 if (!/^[a-f0-9]{40}$/.test(sha)) throw Error('Invalid PR SHA');
 const status = async (state, description) => github.rest.repos.createCommitStatus({...repo, sha, context: 'pr-trust', state, description,
  target_url: `https://github.com/${repository}/actions/runs/${context.runId}`});
 await status('pending', 'Trusted metadata policy is evaluating this exact SHA');
 try {
  if (pr.state !== 'open' || pr.base?.repo?.full_name !== repository || !['develop', 'main'].includes(pr.base?.ref) || pr.head?.repo?.full_name !== repository || pr.user?.login !== owner) throw Error('Only owner-maintained same-repository PRs are authorized');
  if (!Number.isSafeInteger(pr.changed_files) || pr.changed_files < 1 || pr.changed_files >= 3000) throw Error('Incomplete or oversized PR file list');
  const files = await github.paginate(github.rest.pulls.listFiles, {...repo, pull_number: number, per_page: 100});
  if (files.length !== pr.changed_files || files.some(f => typeof f.filename !== 'string')) throw Error('Incomplete PR file metadata');
  const controls = path => /^(?:\.github\/|tools\/|tests\/|package(?:-lock)?\.json$|.*(?:^|\/)tsconfig[^/]*\.json$|forge\.|vite\.config|\.npmrc$|\.gitattributes$|\.gitmodules$)/.test(path);
  const changedControls = files.some(f => controls(f.filename) || (f.previous_filename && controls(f.previous_filename)));
  if (manual && (context.actor !== owner || env.EXPECTED_SHA !== sha || env.CONFIRM !== `review ${sha}`)) throw Error('Owner review requires current full SHA and exact confirmation');
  if (changedControls && !manual) throw Error('CI_POLICY_REVIEW_REQUIRED: owner must review this exact SHA');
  const latest = (await github.rest.pulls.get({...repo, pull_number: number})).data;
  if (latest.head?.sha !== sha || latest.base?.sha !== pr.base?.sha || latest.base?.ref !== pr.base?.ref || latest.state !== 'open') throw Error('PR changed during metadata evaluation');
  await status('success', changedControls ? 'Owner reviewed CI policy for this exact SHA' : 'Trusted origin and unchanged CI policy verified');
 } catch (error) {
  await status('failure', 'Trust policy rejected this SHA; see trusted workflow log');
  core.setFailed(error.message);
 }
}
