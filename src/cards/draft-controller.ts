import type { z } from "zod";
import { DraftFields, type DraftPreview, type WorkspaceDraftDTO } from "../../shared/protocol/card-draft.ts";
import { mapUnpublishedContent } from "../../shared/cards/mapping.ts";
import type { CardMode } from "../../shared/protocol/unified.ts";
import type { Input } from "../../shared/protocol/registry.ts";

type Fields = z.infer<typeof DraftFields>;
export interface DraftAdapter {
  save(input: Input<"draft.save">, requestId: string): Promise<WorkspaceDraftDTO>;
  previewSwitch(input: Input<"draft.previewSwitch">): Promise<z.infer<typeof DraftPreview>>;
}
/** Single owner of editable fields, CAS revisions and explicit draft-save receipts. */
export class CardDraftController {
  fields: Fields;
  revision: number | null;
  publishedRevision: number;
  state: "clean" | "dirty" | "saving" | "error" | "conflict" = "clean";
  error = "";
  preview: z.infer<typeof DraftPreview> | null = null;
  previewing = false;
  savedHere = false;
  private confirmedModeChange = false;
  private validationError = "";
  private generation = 0;
  private saved = 0;
  private running?: Promise<void>;
  private pending?: { input: Input<"draft.save">; requestId: string; generation: number };
  private suspended = 0;
  private disposed = false;
  private scope: Input<"draft.get">;
  private initial: z.infer<typeof DraftPreview>;
  private adapter: DraftAdapter;
  private notify: () => void;
  constructor(scope: Input<"draft.get">, initial: z.infer<typeof DraftPreview>,
    draft: WorkspaceDraftDTO | null, adapter: DraftAdapter, notify: () => void) {
    this.scope=scope;this.initial=initial;this.adapter=adapter;this.notify=notify;
    this.fields = structuredClone(draft ? {title:draft.title,payload:draft.payload,mediaRefs:draft.mediaRefs} : initial.fields);
    this.revision = draft?.revision ?? null;
    this.publishedRevision = initial.publishedRevision;
  }
  get composing() {return this.suspended > 0;}
  get outcomeUnknown() { return !!this.pending; }
  get canSave() {
    return !this.suspended && !this.preview && !this.previewing && this.state !== "saving" && this.state !== "conflict" &&
      (!!this.pending || this.saved !== this.generation || (this.publishedRevision === 0 && this.revision === null));
  }
  get publishedUnchanged() { return this.publishedRevision > 0 && this.revision === null && this.saved === this.generation; }
  get hasUnsavedChanges() { return !!this.pending || this.saved !== this.generation; }
  change(fields: Fields) {
    if (this.disposed || this.previewing || this.preview) return;
    const candidate=structuredClone(fields);
    if (JSON.stringify(candidate) === JSON.stringify(this.fields)) return;
    const checked=DraftFields.safeParse(candidate);
    this.fields=checked.success ? checked.data : candidate;
    this.validationError=checked.success ? "" : checked.error.issues.some(i=>i.path[0]==="title")
      ? "标题最多300个字符，请缩短后重新保存。" : "草稿内容不符合要求，请检查输入后重新保存。";
    this.generation++;
    if(this.state!=="conflict" && this.state!=="saving") {
      this.state=this.validationError?"error":"dirty";
      this.error=this.validationError;
    }
    this.notify();
  }
  suspend() { this.suspended++; }
  resume() { this.suspended=Math.max(0,this.suspended-1); }
  /** Exactly one user-requested snapshot; later edits never drain into implicit saves. */
  async flush(): Promise<void> {
    if (this.running) return this.running;
    if (this.disposed || !this.canSave) return;
    if (!this.pending && this.validationError) {this.state="error";this.error=this.validationError;this.notify();return;}
    const pending=this.pending ?? {input:{...this.scope,expectedPublishedRevision:this.publishedRevision,
      expectedDraftRevision:this.revision,fields:this.snapshot(),confirmModeChange:this.confirmedModeChange},requestId:crypto.randomUUID(),generation:this.generation};
    this.pending=pending;
    this.state="saving";this.error="";this.notify();
    this.running=(async()=>{
      try {
        const result=await this.adapter.save(pending.input,pending.requestId);
        if(result.cardId!==this.scope.cardId || result.basePublishedRevision!==this.publishedRevision || result.revision!==(this.revision??0)+1)
          throw Error("SAVE_RECEIPT_INVALID");
        this.revision=result.revision;this.saved=pending.generation;this.pending=undefined;this.savedHere=true;
        this.state=this.validationError?"error":this.saved===this.generation?"clean":"dirty";
        this.error=this.validationError;
      } catch(e) {
        const err=e as {code?:string;message?:string;outcome?:string};
        this.state=/CONFLICT|EPOCH_CHANGED/.test(err.code??"")?"conflict":"error";
        this.error=this.state==="conflict"?"保存冲突，当前内容已保留，请重新载入前复制备份。":
          err.outcome==="rejected"?"保存失败，当前内容已保留，请重试。":"保存结果未知，请点击保存核对原请求。";
        if(err.outcome==="rejected")this.pending=undefined;
      } finally {if(!this.disposed)this.notify();}
    })();
    try {await this.running;} finally {this.running=undefined;}
  }
  async previewType(targetType: z.infer<typeof CardMode>) {
    if(this.previewing || this.preview || this.pending || this.state==="saving" || this.state==="conflict")return;
    this.previewing=true;this.notify();
    try {
      this.preview=this.publishedRevision===0 ? {...this.initial,targetType,...mapUnpublishedContent(this.fields,targetType)} :
        await this.adapter.previewSwitch({...this.scope,targetType});
    } catch {this.error="无法预览类型切换，当前内容已保留。";}
    finally {this.previewing=false;if(!this.disposed)this.notify();}
  }
  cancelSwitch() {this.preview=null;this.notify();}
  async confirmSwitch() {
    if(!this.preview)return;
    const fields=this.preview.fields;this.preview=null;this.confirmedModeChange=true;this.change(fields);
  }
  acceptPublication(revision:number) {
    if(!Number.isInteger(revision)||revision!==this.publishedRevision+1)throw Error("PUBLISH_RECEIPT_INVALID");
    this.publishedRevision=revision;this.revision=null;this.saved=this.generation;this.state="clean";this.error="";this.savedHere=false;this.notify();
  }
  snapshot() {return structuredClone(this.fields);}
  async close() {return !this.hasUnsavedChanges && this.state!=="saving" && this.state!=="conflict";}
  dispose() {this.disposed=true;return this.hasUnsavedChanges?this.snapshot():null;}
}
