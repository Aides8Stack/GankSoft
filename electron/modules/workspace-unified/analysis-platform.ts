import type { Context } from "../../infrastructure/context.ts";
import {
  ExportAnalysis,
  ExportJob,
  ExportProgress,
} from "../../../shared/protocol/ai-analysis.ts";
import { DomainError } from "../../../shared/domain-error.ts";
import { writeAnalysisZip, type ExportControl } from "./analysis-zip.ts";
import { digest } from "../cards-unified/schedule.ts";
export function analysisFilename(date: Date) {
  return (
    "GankSoft-v0.7.7-" +
    date
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })
      .replaceAll("-", "") +
    "-ai-analysis.zip"
  );
}
/** One active local export, no business rows or durable job/cache table. */
export function analysisExportPlatform(
  current: () => Context,
  save: (name: string) => Promise<string | null>,
) {
  let active: { id: string; control: ExportControl; scope: string } | undefined;
  const completed = new Map<
    string,
    {
      scope: string;
      result: Awaited<ReturnType<typeof writeAnalysisZip>>;
      progress: ExportControl["progress"];
    }
  >();
  return {
    "learning.aiAdjustment.export": async (input: unknown) => {
      const p = ExportAnalysis.parse(input),
        ctx = current(),
        epoch = String(
          ctx.db
            .prepare("SELECT epoch FROM protocol_meta WHERE singleton=1")
            .get()!.epoch,
        ),
        scope = digest({ p, epoch });
      const old = completed.get(p.jobId);
      if (old) {
        if (old.scope !== scope)
          throw new DomainError("IDEMPOTENCY_CONFLICT", "导出任务编号冲突");
        return old.result;
      }
      if (active)
        throw new DomainError(
          "EXPORT_BUSY",
          "已有分析ZIP正在导出，请等待或取消",
        );
      const control: ExportControl = {
        cancelled: false,
        progress: { phase: "choosing", cardCount: 0, eventCount: 0, bytes: 0 },
      };
      active = { id: p.jobId, control, scope };
      try {
        const path = await save(analysisFilename(ctx.now()));
        if (!path || control.cancelled) {
          control.progress.phase = "cancelled";
          return {
            saved: false,
            name: null,
            cardCount: 0,
            eventCount: 0,
            snapshotId: null,
          };
        }
        if (
          ctx !== current() ||
          String(
            ctx.db
              .prepare("SELECT epoch FROM protocol_meta WHERE singleton=1")
              .get()!.epoch,
          ) !== epoch
        )
          throw Error("数据库已变化，请重新导出");
        const result = await writeAnalysisZip(ctx, p, path, control);
        completed.set(p.jobId, {
          scope,
          result,
          progress: { ...control.progress },
        });
        if (completed.size > 8)
          completed.delete(completed.keys().next().value!);
        return result;
      } catch (e) {
        control.progress.phase = control.cancelled ? "cancelled" : "failed";
        if (control.cancelled)
          return {
            saved: false,
            name: null,
            cardCount: 0,
            eventCount: 0,
            snapshotId: null,
          };
        throw new DomainError(
          "AI_EXPORT_REJECTED",
          e instanceof Error ? e.message : String(e),
        );
      } finally {
        active = undefined;
      }
    },
    "learning.aiAdjustment.export.status": async (input: unknown) => {
      const { jobId } = ExportJob.parse(input);
      return ExportProgress.parse(
        active?.id === jobId
          ? active.control.progress
          : (completed.get(jobId)?.progress ?? {
              phase: "idle",
              cardCount: 0,
              eventCount: 0,
              bytes: 0,
            }),
      );
    },
    "learning.aiAdjustment.export.cancel": async (input: unknown) => {
      const { jobId } = ExportJob.parse(input);
      if (active?.id === jobId) {
        active.control.cancelled = true;
        return { cancelled: true };
      }
      return { cancelled: false };
    },
  };
}
