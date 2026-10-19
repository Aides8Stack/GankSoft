import {readFileSync,existsSync} from "node:fs";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const requiredCases=Array.from({length:40},(_,i)=>`W${String(i+1).padStart(2,"0")}`);
const reports = ["win10", "win11"].map((os) => {
  if(!existsSync(`validation-results/${os}-actual.json`))throw Error(`${os}: Windows acceptance report missing; release blocked`);
  const r = JSON.parse(
    readFileSync(`validation-results/${os}-actual.json`, "utf8").replace(
      /^\uFEFF/,
      "",
    ),
  );
  if (
    r.version !== version ||
    r.target !== os ||
    r.automated !== "passed" ||
    r.msvcSignature !== "passed" ||
    r.manualSignoff !== "passed" ||
    Object.keys(r.manualCases ?? {}).length !== 40 ||
    requiredCases.some(k=>r.manualCases[k]!=="passed")
  )
    throw Error(`${os}: Windows acceptance incomplete`);
  return r;
});
if (
  reports[0].zipSha256 !== reports[1].zipSha256 ||
  reports[0].exeSha256 !== reports[1].exeSha256
)
  throw Error("Both systems must test the identical delivered artifact");
console.log("Windows release gate passed");
