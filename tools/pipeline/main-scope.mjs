import{appendFileSync}from'node:fs';import{git,json}from'./version.mjs';import{docsOnly}from'./scope.mjs';
let docs=false;try{const e=json(process.env.GITHUB_EVENT_PATH);docs=docsOnly(git('diff','--name-only',e.before,e.after).split('\n').filter(Boolean));}catch{/* unknown -> full quality */}
appendFileSync(process.env.GITHUB_OUTPUT,`docs=${docs}\n`);
