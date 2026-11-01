import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const id=process.argv[2],out=process.argv[3];if(!['NEW-13','CLIP-03','CLIP-09'].includes(id))throw Error('UNKNOWN_PHYSICAL_CASE');mkdirSync(out,{recursive:true});
writeFileSync(join(out,'case.json'),JSON.stringify({id,status:'BLOCKED',layer:'electronUi',platform:process.platform,kind:'PLATFORM_REQUIRED',actual:'Requires real Windows10/11 with physical Chinese IME or original Word/WPS/PNG clipboard source. Current host is '+process.platform+'; no simulated event may attest this case.',steps:[],evidence:[],next:'T2-W-01; operate real Windows GUI, record source/version, read-only SQLite and new PID restore; all Windows layers remain NOT_RUN'},null,2)+'\n');process.exitCode=2;
