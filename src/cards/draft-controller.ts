import type { z } from "zod";
import {
  DraftFields,
  type DraftPreview,
  type WorkspaceDraftDTO,
} from "../../shared/protocol/card-draft.ts";
import type { CardMode } from "../../shared/protocol/unified.ts";
import type { Input } from "../../shared/protocol/registry.ts";

type Fields = z.infer<typeof DraftFields>;
export interface DraftAdapter {
  save(
    input: Input<"draft.save">,
    requestId: string,
  ): Promise<WorkspaceDraftDTO>;
  previewSwitch(
    input: Input<"draft.previewSwitch">,
  ): Promise<z.infer<typeof DraftPreview>>;
  switchType(
    input: Input<"draft.switchType">,
    requestId: string,
  ): Promise<WorkspaceDraftDTO>;
}
export class CardDraftController {
  fields: Fields;
  revision: number | null;
  publishedRevision: number;
  state: "clean" | "dirty" | "saving" | "error" | "conflict" = "clean";
  error = "";
  preview: z.infer<typeof DraftPreview> | null = null;
  previewing = false;
  private validationError = "";
  private generation = 0;
  private saved = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private running?: Promise<void>;
  private pending?: {
    input: Input<"draft.save">;
    requestId: string;
    generation: number;
  };
  private pendingSwitch?: {
    input: Input<"draft.switchType">;
    requestId: string;
  };
  private suspended = 0;
  private disposed = false;
  private scope: Input<"draft.get">;
  private adapter: DraftAdapter;
  private notify: () => void;
  private delay: number;
  constructor(
    scope: Input<"draft.get">,
    initial: z.infer<typeof DraftPreview>,
    draft: WorkspaceDraftDTO | null,
    adapter: DraftAdapter,
    notify: () => void,
    delay = 500,
  ) {
    this.scope = scope;
    this.adapter = adapter;
    this.notify = notify;
    this.delay = delay;
    this.fields = structuredClone(
      draft
        ? {
            title: draft.title,
            payload: draft.payload,
            mediaRefs: draft.mediaRefs,
          }
        : initial.fields,
    );
    this.revision = draft?.revision ?? null;
    this.publishedRevision = initial.publishedRevision;
  }
  change(fields: Fields) {
    if (this.disposed || this.previewing || this.preview || this.pendingSwitch)
      return;
    const candidate = structuredClone(fields);
    const checked = DraftFields.safeParse(candidate);
    // Keep editable input even when it cannot cross the persistence boundary.
    this.fields = checked.success ? checked.data : candidate;
    this.validationError = checked.success ? "" :
      checked.error.issues.some(issue => issue.path[0] === "title")
        ? "标题最多300个字符，请缩短后重新保存。"
        : "草稿内容不符合要求，请检查输入后重新保存。";
    this.generation++;
    // A conflict never becomes silently retryable because the user typed another letter.
    if (this.state !== "conflict") {
      this.state = this.validationError ? "error" : "dirty";
      this.error = this.validationError;
    }
    this.notify();
    clearTimeout(this.timer);
    if (!this.suspended && !this.validationError && this.state !== "conflict")
      this.timer = setTimeout(() => void this.flush(), this.delay);
  }
  suspend() {
    this.suspended++;
    clearTimeout(this.timer);
  }
  resume() {
    this.suspended = Math.max(0, this.suspended - 1);
    if (!this.suspended && this.state === "dirty")
      this.timer = setTimeout(() => void this.flush(), this.delay);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (
      this.disposed ||
      this.suspended ||
      this.preview ||
      this.pendingSwitch ||
      this.state === "conflict"
    )
      return;
    if (this.running) {
      await this.running;
      return;
    }
    this.running = (async () => {
      while (
        !this.disposed &&
        !this.suspended &&
        this.saved < this.generation
      ) {
        // Resolve an earlier unknown request using its original identity, but never
        // allocate a new write for locally invalid input.
        if (!this.pending && this.validationError) {
          this.state = "error";
          this.error = this.validationError;
          this.notify();
          break;
        }
        const pending = this.pending ?? {
          input: {
            ...this.scope,
            expectedPublishedRevision: this.publishedRevision,
            expectedDraftRevision: this.revision,
            fields: structuredClone(this.fields),
          },
          requestId: crypto.randomUUID(),
          generation: this.generation,
        };
        this.pending = pending;
        this.state = "saving";
        this.error = "";
        this.notify();
        try {
          const result = await this.adapter.save(
            pending.input,
            pending.requestId,
          );
          if (result.revision !== (this.revision ?? 0) + 1)
            throw Error("SAVE_RECEIPT_INVALID");
          this.revision = result.revision;
          this.saved = pending.generation;
          this.pending = undefined;
          this.state = this.saved === this.generation ? "clean" : "dirty";
        } catch (e) {
          const err = e as {
            code?: string;
            message?: string;
            outcome?: string;
          };
          this.error = err.message ?? String(e);
          this.state = /CONFLICT|EPOCH_CHANGED/.test(err.code ?? "")
            ? "conflict"
            : "error";
          // Definitively rejected writes may be retried with corrected fields. Unknown
          // outcomes retain the exact request identity even if newer edits are queued.
          if (err.outcome === "rejected") this.pending = undefined;
          break;
        } finally {
          if (!this.disposed) this.notify();
        }
      }
    })();
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }
  async previewType(targetType: z.infer<typeof CardMode>) {
    if (this.previewing || this.pendingSwitch) return;
    await this.flush();
    if (this.saved !== this.generation || this.state === "conflict") return;
    this.previewing = true;
    this.notify();
    try {
      const preview = await this.adapter.previewSwitch({
        ...this.scope,
        targetType,
      });
      if (!this.disposed) {
        this.preview = preview;
        this.error = "";
      }
    } catch (e) {
      this.error = String(e);
      this.state = "error";
    } finally {
      this.previewing = false;
      if (!this.disposed) this.notify();
    }
  }
  cancelSwitch() {
    if (this.pendingSwitch) return;
    this.preview = null;
    this.notify();
  }
  async confirmSwitch() {
    if (!this.preview) return;
    const p = this.preview;
    this.pendingSwitch ??= {
      input: {
        ...this.scope,
        targetType: p.targetType,
        previewToken: p.token,
        expectedPublishedRevision: p.publishedRevision,
        expectedDraftRevision: p.draftRevision,
        confirmDiscard: true,
      },
      requestId: crypto.randomUUID(),
    };
    this.state = "saving";
    this.notify();
    try {
      const result = await this.adapter.switchType(
        this.pendingSwitch.input,
        this.pendingSwitch.requestId,
      );
      if (this.disposed) return;
      this.fields = structuredClone({
        title: result.title,
        payload: result.payload,
        mediaRefs: result.mediaRefs,
      });
      this.revision = result.revision;
      this.publishedRevision = result.basePublishedRevision;
      this.preview = null;
      this.pendingSwitch = undefined;
      this.saved = this.generation;
      this.state = "clean";
      this.error = "";
    } catch (e) {
      const err = e as { outcome?: string; message?: string };
      this.error = err.message ?? String(e);
      this.state = "error";
      if (err.outcome === "rejected") this.pendingSwitch = undefined;
    } finally {
      if (!this.disposed) this.notify();
    }
  }
  acceptPublication(revision: number) {
    if (!Number.isInteger(revision) || revision <= this.publishedRevision)
      throw Error("PUBLISH_RECEIPT_INVALID");
    this.publishedRevision = revision;
    this.revision = null;
    this.state = "clean";
    this.error = "";
    this.saved = this.generation;
    this.notify();
  }
  acceptSavedDraft(result: WorkspaceDraftDTO) {
    if (result.cardId !== this.scope.cardId || result.basePublishedRevision !== this.publishedRevision ||
        result.revision !== (this.revision ?? 0) + 1)
      throw Error("SAVE_RECEIPT_INVALID");
    this.fields = structuredClone({ title: result.title, payload: result.payload, mediaRefs: result.mediaRefs });
    this.revision = result.revision;
    this.saved = this.generation;
    this.state = "clean";
    this.error = "";
    this.notify();
  }
  snapshot() {
    return structuredClone(this.fields);
  }
  get switchOutcomeUnknown() {
    return !!this.pendingSwitch;
  }
  async close() {
    await this.flush();
    return this.state === "clean";
  }
  dispose() {
    clearTimeout(this.timer);
    this.disposed = true;
    return this.saved === this.generation ? null : this.snapshot();
  }
}
