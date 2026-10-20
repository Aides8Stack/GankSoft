export function classify(paths) {
 if(!Array.isArray(paths)||!paths.length)return ['CI_SECURITY_CRITICAL'];
 const tags=new Set();
 for(const p of paths){
  if(/^(README|CHANGELOG|PROGRESS|HANDOFF|TEST_REPORT|PLAN)\.md$/.test(p)||p==='AGENTS.md'||(/^docs\//.test(p)&&(/\.(md|txt)$/.test(p)||/^docs\/development\/(?:history\/[^/]+\/)?TASK\.json$/.test(p))))tags.add('DOCS_ONLY');
  else if(/^\.github\/|^tools\/(?:ci|pipeline|build|development)\/|^package(?:-lock)?\.json$|^forge\./.test(p))tags.add('CI_SECURITY_CRITICAL');
  else if(/protocol|shared\/|preload/.test(p))tags.add('PROTOCOL_CRITICAL');
  else if(/image|media|attachment/i.test(p))tags.add('MEDIA_CRITICAL');
  else if(/review|study|schedul|fsrs/i.test(p))tags.add('REVIEW_CRITICAL');
  else if(/database|sqlite|migration|backup|import|export|persistence|storage/i.test(p))tags.add('DATA_CRITICAL');
  else if(/^src\/.*\.(vue|css)$/.test(p))tags.add('UI');
  else if(/^(src|electron|tests)\//.test(p))tags.add('BUSINESS');
  else tags.add('CI_SECURITY_CRITICAL');
 }
 if(tags.size>1)tags.delete('DOCS_ONLY');return [...tags].sort();
}
export const docsOnly=paths=>classify(paths).join(',')==='DOCS_ONLY';
export function gate(results){if(!results.length||results.some(x=>x!=='success'))throw Error('Required check failed, cancelled, skipped or missing');return true;}
