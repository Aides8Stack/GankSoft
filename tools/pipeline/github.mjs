export function client(token=process.env.GITHUB_TOKEN,transport=fetch){
 if(!token)throw Error('GitHub token required');
 return async function request(path,{method='GET',body,binary=false,upload=false}={}){
  const url=path.startsWith('https:')?new URL(path):new URL('https://api.github.com'+path);
  if(!['api.github.com','uploads.github.com'].includes(url.hostname))throw Error('Untrusted API host');
  const response=await transport(url,{method,headers:{Authorization:`Bearer ${token}`,Accept:binary?'application/octet-stream':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':upload?'application/octet-stream':'application/json'},body:body===undefined?undefined:upload?body:JSON.stringify(body),redirect:'follow'});
  if(response.status===404 && method==='GET')return null;
  if(!response.ok)throw Error(`GitHub ${method} ${url.pathname}: ${response.status}`);
  if(response.status===204)return null;
  return binary?Buffer.from(await response.arrayBuffer()):response.json();
 };
}
export async function pages(api,path){let all=[];for(let page=1;;page++){const r=await api(path+(path.includes('?')?'&':'?')+`per_page=100&page=${page}`);if(!Array.isArray(r))throw Error('Missing paginated GitHub result');all.push(...r);if(r.length<100)return all;}}
