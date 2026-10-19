import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { branchKey } from "../ci/core.mjs";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const [base, title] = process.argv.slice(2);
if (!base || !title)
  throw Error(
    "Usage: node tools/development/init-task.mjs <base-ref-or-SHA> <task-title>",
  );
const branch = git("branch", "--show-current");
if (!branch || ["main", "develop"].includes(branch))
  throw Error("Initialize only on a named task branch");
if (git("status", "--porcelain"))
  throw Error(
    "Preserve existing changes: commit or investigate before initializing",
  );
const baselineSha = git("rev-parse", "--verify", `${base}^{commit}`);
git("merge-base", "--is-ancestor", baselineSha, "HEAD");
const dir = "docs/development",
  meta = join(dir, "TASK.json");
const old = existsSync(meta) ? JSON.parse(readFileSync(meta, "utf8")) : null;
if (old?.branch === branch)
  throw Error("Task already initialized for this branch; resume instead");
const names = [
  "PLAN.md",
  "PROGRESS.md",
  "HANDOFF.md",
  "TEST_REPORT.md",
  "TASK.json",
];
const inherited = names.filter((n) => existsSync(join(dir, n)));
if (inherited.length) {
  const archive = join(
    dir,
    "history",
    `${branchKey(old?.branch ?? "unassigned")}-${git("rev-parse", "--short=12", "HEAD")}-${Date.now()}`,
  );
  mkdirSync(archive, { recursive: true });
  for (const n of inherited) copyFileSync(join(dir, n), join(archive, n));
}
mkdirSync(dir, { recursive: true });
const task = {
  title,
  branch,
  baselineSha,
  initializedFromSha: git("rev-parse", "HEAD"),
  status: "NOT_STARTED",
  acceptance: ["Fill in task-specific acceptance before implementation"],
};
writeFileSync(meta, JSON.stringify(task, null, 2) + "\n");
const intro = `任务：${title}\n分支：${branch}\n基线：${baselineSha}\n\n`;
for (const [name, content] of Object.entries({
  "PLAN.md":
    "状态：NOT_STARTED。先审计模块/API/依赖，填写阶段和具体验收标准，再实施。\n",
  "PROGRESS.md":
    "状态：NOT_STARTED。继承的旧任务不算本任务进度；旧记录已归档。\n",
  "HANDOFF.md":
    "先读 AGENTS.md 与 STANDARDS.md；核实远程、工作区、HEAD、TASK.json 和历史检查点，再继续首个未完成阶段。\n",
  "TEST_REPORT.md":
    "本任务测试：NOT_RUN。逐项记录命令、被测 SHA、环境、日志与 PASS/FAIL/BLOCKED/NOT_RUN。\n",
}))
  writeFileSync(
    join(dir, name),
    `# ${name.slice(0, -3)}\n\n${intro}${content}`,
  );
console.log(
  `Initialized ${branch}; baseline ${baselineSha}; preserved ${inherited.length} inherited files. Review and commit these documents.`,
);
