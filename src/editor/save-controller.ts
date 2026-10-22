import {
  readDocument,
  type EditorDocument,
} from "../../shared/editor/document.ts";
export type SaveState =
  "clean" | "dirty" | "saving" | "error" | "conflict" | "disposed";
export interface DocumentAdapter {
  save(
    document: EditorDocument,
    expectedRevision: number,
    signal: AbortSignal,
  ): Promise<{ revision: number }>;
}
// Owns save ordering only. Publication and database writes belong to the supplied service.
export class SaveController {
  state: SaveState = "clean";
  error = "";
  revision: number;
  private current: EditorDocument;
  private generation = 0;
  private saved = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private running?: Promise<void>;
  private abort = new AbortController();
  private disposed = false;
  private blocked = false;
  private suspended = false;
  private adapter: DocumentAdapter;
  private notify: () => void;
  private delay: number;
  constructor(
    initial: EditorDocument,
    revision: number,
    adapter: DocumentAdapter,
    notify: () => void,
    delay = 500,
  ) {
    this.adapter = adapter;
    this.notify = notify;
    this.delay = delay;
    this.current = readDocument(initial);
    this.revision = revision;
  }
  change(document: EditorDocument) {
    if (this.disposed) return;
    this.current = readDocument(document);
    this.blocked = false;
    this.generation++;
    this.state = "dirty";
    this.error = "";
    this.notify();
    clearTimeout(this.timer);
    if (!this.suspended)
      this.timer = setTimeout(() => {
        void this.flush();
      }, this.delay);
  }
  suspend() {
    this.suspended = true;
    clearTimeout(this.timer);
  }
  resume() {
    this.suspended = false;
    if (this.state === "dirty")
      this.timer = setTimeout(() => {
        void this.flush();
      }, this.delay);
  }
  invalidate(message: string) {
    if (this.disposed) return;
    clearTimeout(this.timer);
    this.blocked = true;
    this.generation++;
    this.state = "error";
    this.error = message;
    this.notify();
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.disposed || this.blocked || this.suspended) return;
    if (this.running) {
      await this.running;
      if (this.state === "dirty") await this.flush();
      return;
    }
    if (this.saved === this.generation) return;
    const generation = this.generation,
      document = structuredClone(this.current);
    this.state = "saving";
    this.notify();
    this.running = (async () => {
      try {
        const result = await this.adapter.save(
          document,
          this.revision,
          this.abort.signal,
        );
        if (this.disposed) return;
        if (
          !Number.isInteger(result.revision) ||
          result.revision <= this.revision
        )
          throw Error("SAVE_RECEIPT_INVALID");
        this.revision = result.revision;
        this.saved = generation;
        if (!this.blocked) {
          this.state = this.generation === generation ? "clean" : "dirty";
          this.error = "";
        }
      } catch (e) {
        if (this.disposed) return;
        this.error = e instanceof Error ? e.message : String(e);
        this.state = this.error === "REVISION_CONFLICT" ? "conflict" : "error";
      } finally {
        this.running = undefined;
        if (!this.disposed) this.notify();
      }
    })();
    await this.running;
  }
  snapshot() {
    return structuredClone(this.current);
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.abort.abort();
    this.state = "disposed";
  }
}
