// OS identity gate shared by attended Windows cases and unprivileged CI diagnostics.
// Build number alone is insufficient: Windows Server 2025 and Win11 may both report 26100.
import {arch as nodeArch,release as nodeRelease} from 'node:os';
import {spawnSync} from 'node:child_process';

export function classifyWindowsIdentity({platform,arch,release,productType,caption='',identitySource=''}={}){
  const build=Number(String(release??'').split('.').at(-1));
  const type=productType===null||productType===undefined||productType===''?null:Number(productType);
  let family='unverified';
  if(platform!=='win32')family='not_windows';
  else if(!Number.isInteger(build)||build<19041||arch!=='x64')family='unsupported';
  else if(type===2||type===3)family='windows_server';
  else if(type!==1)family='unverified';
  else family=build>=22000?'win11':'win10';
  return {family,arch,build,productType:type,caption:String(caption),
    identitySource,clientVerified:family==='win10'||family==='win11'};
}

export function currentWindowsIdentity(){
  const basis={platform:process.platform,arch:nodeArch(),release:nodeRelease()};
  if(basis.platform!=='win32')return classifyWindowsIdentity(basis);
  // Win32_OperatingSystem.ProductType=1 means Workstation, 2/3 mean server.
  // Fail closed if Windows CIM is unavailable; never guess from build alone.
  const script='$os=Get-CimInstance -ClassName Win32_OperatingSystem -ErrorAction Stop; [pscustomobject]@{ProductType=[int]$os.ProductType; Caption=[string]$os.Caption; BuildNumber=[int]$os.BuildNumber} | ConvertTo-Json -Compress';
  const p=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],
    {encoding:'utf8',timeout:15000,maxBuffer:256*1024,windowsHide:true});
  if(p.status!==0){
    return {...classifyWindowsIdentity(basis),identityError:
      'OS_CIM_UNAVAILABLE: '+String(p.error?.message??p.stderr??'unknown').slice(0,180)};
  }
  try{
    const info=JSON.parse(String(p.stdout).trim().replace(/^\uFEFF/,''));
    const build=Number(info.BuildNumber);
    const identity=classifyWindowsIdentity({...basis,
      release:Number.isInteger(build)?'10.0.'+build:basis.release,
      productType:info.ProductType,caption:info.Caption,identitySource:'Win32_OperatingSystem'});
    return identity;
  }catch(e){
    return {...classifyWindowsIdentity(basis),identityError:
      'OS_CIM_PARSE_FAILED: '+String(e.message??e).slice(0,180)};
  }
}
