// Read the effective rules, rather than treating protected=true as sufficient.
export function validateProtection(branch, rules, sets) {
 if (!branch?.protected) throw Error('NEEDS_USER_ACTION: release branch must be protected');
 if (!Array.isArray(rules) || !rules.length) throw Error('Effective branch rules unavailable');
 const has = type => rules.some(r => r.type === type);
 if (!has('deletion') || !has('non_fast_forward')) throw Error('Deletion and force-push prevention required');
 if (!rules.some(r => r.type === 'pull_request' && r.parameters?.required_review_thread_resolution === true)) throw Error('PR and resolved review threads required');
 if (!rules.some(r => r.type === 'required_status_checks' && r.parameters?.strict_required_status_checks_policy === true && ['pr-gate', 'pr-trust'].every(context => r.parameters.required_status_checks?.some(c => c.context === context && c.integration_id === 15368)))) throw Error('Strict GitHub Actions pr-gate and pr-trust checks required');
 const ids = [...new Set(rules.map(r => r.ruleset_id))];
 if (ids.some(id => !Number.isSafeInteger(id))) throw Error('Effective ruleset identities unavailable');
 for (const id of ids) {
  const set = sets.find(s => s?.id === id);
  if (!set || set.enforcement !== 'active' || !Array.isArray(set.bypass_actors) || set.bypass_actors.length) throw Error('Active rules without bypass actors required');
 }
 return true;
}
export async function requireReleaseProtection(api, repository, name) {
 if (!['develop', 'main'].includes(name)) throw Error('Invalid release branch');
 const branch = await api(`/repos/${repository}/branches/${name}`);
 if (!branch?.protected) throw Error('NEEDS_USER_ACTION: release branch must be protected');
 const rules = await api(`/repos/${repository}/rules/branches/${name}`);
 if (!Array.isArray(rules)) throw Error('Effective branch rules unavailable');
 const ids = [...new Set(rules.map(r => r.ruleset_id))], sets = [];
 for (const id of ids) {
  if (!Number.isSafeInteger(id)) throw Error('Effective ruleset identities unavailable');
  sets.push(await api(`/repos/${repository}/rulesets/${id}`));
 }
 return validateProtection(branch, rules, sets);
}

export function authorizeReleaseContext(env, repository, branch, owners, manualOnly = false) {
 if (env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== `refs/heads/${branch}` || !owners?.includes(env.GITHUB_ACTOR) || !(manualOnly ? ['workflow_dispatch'] : ['push', 'workflow_dispatch']).includes(env.GITHUB_EVENT_NAME)) throw Error('Untrusted release event, actor or branch');
 return true;
}
