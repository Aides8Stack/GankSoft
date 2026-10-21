import {windowsVersion} from '../ci/windows-version.mjs';
/** Static consistency only; does not execute the Windows application. */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { extractFile, listPackage } from "@electron/asar";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { NtExecutable, NtExecutableResource, Resource, Data } =
  await require("resedit/cjs").load();
const folder = resolve(process.argv[2]);
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const exe = NtExecutable.from(readFileSync(join(folder, "GankSoft.exe")));
const resources = NtExecutableResource.from(exe).entries;
const icon = Data.IconFile.from(readFileSync("assets/ganksoft.ico"));
const iconGroup = Resource.IconGroupEntry.fromEntries(resources)[0];
const iconEntries = iconGroup.getIconItemsFromEntries(resources);
assert.equal(iconEntries.length, icon.icons.length);
for (let i = 0; i < iconEntries.length; i++)
  assert(
    Buffer.from(
      iconEntries[i].isRaw() ? iconEntries[i].bin : iconEntries[i].generate(),
    ).equals(
      Buffer.from(
        icon.icons[i].data.isRaw()
          ? icon.icons[i].data.bin
          : icon.icons[i].data.generate(),
      ),
    ),
    "EXE icon content mismatch",
  );
const info = Resource.VersionInfo.fromEntries(
  NtExecutableResource.from(exe).entries,
)[0];
const strings = info.getStringValues(info.getAllLanguagesForStringValues()[0]);
assert.equal(strings.FileVersion, version);
assert.equal(strings.ProductVersion, version);
const fixed=info.fixedInfo,parts=(ms,ls)=>[ms>>>16,ms&65535,ls>>>16,ls&65535].join('.');
assert.equal(parts(fixed.fileVersionMS,fixed.fileVersionLS),windowsVersion(version).numeric);
assert.equal(parts(fixed.productVersionMS,fixed.productVersionLS),windowsVersion(version).numeric);
const archive = join(folder, "resources/app.asar");
assert(
  !listPackage(archive).some((p) => p.endsWith("/knowledge/archives.js")),
  "Removed archive module found in package",
);
assert.equal(
  JSON.parse(extractFile(archive, "package.json").toString()).version,
  version,
);
const addonBase = "node_modules/@napi-rs/image-win32-x64-msvc";
const addonDir = join(folder, "resources/app.asar.unpacked", addonBase);
const addonMeta = JSON.parse(
  readFileSync(join(addonDir, "package.json"), "utf8"),
);
assert.equal(addonMeta.name, "@napi-rs/image-win32-x64-msvc");
assert.equal(
  addonMeta.version,
  JSON.parse(extractFile(archive, "node_modules/@napi-rs/image/package.json"))
    .version,
);
assert(readFileSync(join(addonDir, addonMeta.main)).length > 1000000);
for (const dll of ["vcruntime140.dll", "vcruntime140_1.dll"])
  assert(
    readFileSync(join(addonDir, dll)).equals(readFileSync(join(folder, dll))),
    dll,
  );
const imageEntry = extractFile(
  archive,
  "dist-electron/electron/infrastructure/images.js",
).toString();
assert(
  !imageEntry.includes('from "@napi-rs/image"'),
  "Eager image addon import",
);
assert(
  extractFile(archive, "dist-electron/electron/infrastructure/image-binding.js")
    .toString()
    .includes("@napi-rs/image-win32-x64-msvc"),
);
let compared = 0;
function compare(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) compare(path);
    else {
      assert(
        extractFile(archive, path.replaceAll("\\", "/")).equals(
          readFileSync(path),
        ),
        path,
      );
      compared++;
    }
  }
}
compare("dist");
compare("dist-electron");
const result = {
  version,
  fileVersion: strings.FileVersion,
  productVersion: strings.ProductVersion,
  asarVersion: version,
  sourceBuildFilesMatched: compared,
  customIconSizes: iconGroup.icons.map((i) => i.width || 256),
  explicitWindowsMsvcBinding: true,
  addonPackageFullyUnpacked: true,
  colocatedMsvcRuntime: true,
  windowsExecutionTested: false,
};
writeFileSync(
  `validation-results/version-v${version.replaceAll(".", "")}.json`,
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
