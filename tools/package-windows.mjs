import {windowsVersion,stampWindowsVersion} from './ci/windows-version.mjs';
/** Build Windows x64 runtime + application, without shipping development dependencies. */
import { createHash } from "node:crypto";
import { packager } from "@electron/packager";
import {
  readFileSync,
  writeFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
// Source is the current historical worktree; tools/dependencies resolve from this module.
const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const image = JSON.parse(
  readFileSync(join(root, "node_modules/@napi-rs/image/package.json"), "utf8"),
);
const nativeDir = resolve(
  process.argv[2] ?? join(root, "node_modules/@napi-rs/image-win32-x64-msvc"),
);
const out = resolve(process.argv[3] ?? join(root, "out"));
if (!existsSync(join(nativeDir, "image.win32-x64-msvc.node")))
  throw new Error(
    "Missing Windows x64 image decoder. Run npm ci on Windows, or pass its extracted package directory as argument 1.",
  );
const native = JSON.parse(
  readFileSync(join(nativeDir, "package.json"), "utf8"),
);
if (
  native.version !== image.version ||
  native.name !== "@napi-rs/image-win32-x64-msvc"
)
  throw new Error("Native decoder version/architecture mismatch");
const work = mkdtempSync(join(tmpdir(), "gank-windows-package-")),
  stage = join(work, "application");
mkdirSync(stage);
for (const name of ["dist", "dist-electron"])
  cpSync(join(root, name), join(stage, name), { recursive: true });
writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: pkg.name,
      productName: pkg.productName,
      version: pkg.version,
      description: pkg.description,
      author: pkg.author,
      type: pkg.type,
      main: pkg.main,
    },
    null,
    2,
  ),
);
const copied = new Set();
function copyRuntime(name) {
  if (copied.has(name)) return;
  copied.add(name);
  const dir = join(root, "node_modules", name);
  const meta = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  cpSync(dir, join(stage, "node_modules", name), { recursive: true });
  for (const dependency of Object.keys(meta.dependencies ?? {}))
    copyRuntime(dependency);
}
for (const name of ["ts-fsrs", "mdast-util-from-markdown", "@napi-rs/image", "zod", "yauzl", "yazl"])
  copyRuntime(name);
cpSync(nativeDir, join(stage, "node_modules/@napi-rs/image-win32-x64-msvc"), {
  recursive: true,
});
const paths = await packager({
  dir: stage,
  name: "GankSoft",
  executableName: "GankSoft",
  icon: join(root, "assets/ganksoft.ico"),
  appVersion: windowsVersion(pkg.version).numeric,
  buildVersion: windowsVersion(pkg.version).numeric,
  platform: "win32",
  arch: "x64",
  electronVersion: JSON.parse(
    readFileSync(join(root, "node_modules/electron/package.json"), "utf8"),
  ).version,
  out,
  overwrite: true,
  prune: false,
  asar: {
    unpack: "**/*.node",
    unpackDir: "node_modules/@napi-rs/image-win32-x64-msvc",
  },
});
for (const path of paths) {
  const exePath=join(path,'GankSoft.exe');
  writeFileSync(exePath,await stampWindowsVersion(readFileSync(exePath),pkg.version));
  for (const name of readdirSync(path))
    if (name.startsWith(".GankSoft.exe.")) unlinkSync(join(path, name));
  const provenance = JSON.parse(
    readFileSync(join(root, "vendor/windows-x64/provenance.json"), "utf8"),
  );
  for (const [name, expected] of Object.entries(provenance.files)) {
    const bytes = readFileSync(join(root, "vendor/windows-x64", name));
    if (createHash("sha256").update(bytes).digest("hex") !== expected)
      throw Error("MSVC runtime hash mismatch");
    writeFileSync(join(path, name), bytes);
    // Windows DLL search also checks the loaded addon's own directory.
    const addonDir = join(
      path,
      "resources/app.asar.unpacked/node_modules/@napi-rs/image-win32-x64-msvc",
    );
    mkdirSync(addonDir, { recursive: true });
    writeFileSync(join(addonDir, name), bytes);
  }
  cpSync(join(root, "LICENSES"), join(path, "LICENSES"), { recursive: true });
  cpSync(join(root, "examples"), join(path, "examples"), { recursive: true });
  writeFileSync(
    join(path, "使用说明.txt"),
    [
      "GankSoft " + pkg.version + " — Windows 10 / 11 x64",
      "",
      "请先完整解压ZIP，再双击 GankSoft.exe。无需安装 Node.js。",
      "请保留同目录的 DLL、resources、locales 等全部文件，不要单独移动EXE。",
      "沿用 v0.6.x 的 v060 数据空间；升级前建议完整备份，请勿删除原数据目录。",
      "此包不包含任何用户学习数据。",
      "",
      "Windows 10和Windows 11实机验收状态以该版本配套签核报告为准。",
      "应用EXE未进行开发者数字签名。",
    ].join("\r\n"),
    "utf8",
  );
  console.log("WINDOWS_OUTPUT=" + path);
}
