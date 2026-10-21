import {windowsVersion} from './windows-version.mjs';
export function delivery(version) {
 windowsVersion(version);
 const stem=`GankSoft-v${version}-win64`;
 return {schema:1,installer:`${stem}-setup.exe`,portable:`${stem}-portable.zip`,zipRoot:'GankSoft/'};
}
export function validateDelivery(source,report,names,archiveSha256) {
 if(source.delivery===undefined){if(source.packagingToolchain!==undefined)throw Error('Delivery evidence missing for coordinator build');return;} // Existing published legacy bundles retain their original protocol.
 const expected=delivery(source.version);
 if(JSON.stringify(source.delivery)!==JSON.stringify(expected)||!names.includes(expected.installer)||!names.includes(expected.portable))throw Error('Delivery filename/root mismatch');
 if(report.runId!==source.runId||report.runAttempt!==source.runAttempt)throw Error('Package from wrong build Run/attempt');
 const z=report.zipExtraction;
 if(report.buildIdentity!==source.name||!source.runId||!source.name||z?.status!=='PASS'||z.archiveSha256!==archiveSha256||z.platform!=='win32'||z.zipRoot!==expected.zipRoot||z.archive!==expected.portable||!Number.isInteger(z.maxEntryPath)||z.maxEntryPath<1||!Array.isArray(z.destinations)||z.destinations.length!==2||z.destinations.some((d,i)=>d.status!=='PASS'||!Number.isInteger(d.destinationLength)||d.destinationLength!==[80,100][i]||d.maxAbsolutePath>=260||d.maxAbsolutePath!==d.destinationLength+1+z.maxEntryPath||d.filesVerified!==z.filesVerified)||!Number.isInteger(z.filesVerified)||z.filesVerified<1)throw Error('Windows extraction/build identity evidence missing');
}
