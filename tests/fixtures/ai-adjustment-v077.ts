import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import yazl from "yazl";
import { freshFixture, publishFresh } from "./fresh-production.ts";
import { createApplicationProtocol } from "../../electron/protocol/gateway.ts";
import { Application } from "../../electron/application.ts";
import { createClient } from "../../shared/protocol/client.ts";
import {
  adjustmentPreviewPlatform,
  readSourceZip,
} from "../../electron/modules/workspace-unified/adjustment-preview.ts";
import { writeAnalysisZip } from "../../electron/modules/workspace-unified/analysis-zip.ts";
import { ACTION_FORMAT } from "../../shared/protocol/ai-adjustments.ts";
export const hash = (s: unknown) =>
  createHash("sha256").update(JSON.stringify(s)).digest("hex");
export const maxAction = (cardId: string, i = 0) => ({
  actionId: "action-" + i,
  type: "card.policy.max_interval.set",
  cardId,
  value: 30,
  reason: "合成分析 " + i,
});
export async function aiFixture(n = 1) {
  const f = await freshFixture(),
    deckId = (
      await f.client.call("workspace.catalog.save", {
        kind: "deck",
        name: "W5执行合成",
        parentId: null,
      })
    ).id,
    first = await publishFresh(f.client, "direct", deckId),
    ids = [first.cardId],
    db = f.ctx.db;
  const c = db
      .prepare("SELECT * FROM learning_cards WHERE id=?")
      .get(first.cardId)!,
    v = JSON.parse(
      String(
        db
          .prepare("SELECT document FROM learning_content_versions WHERE id=?")
          .get(c.current_version_id)!.document,
      ),
    ),
    cy = db
      .prepare("SELECT * FROM learning_study_cycles WHERE id=?")
      .get(c.current_cycle_id)!;
  db.exec("BEGIN");
  try {
    for (let i = 1; i < n; i++) {
      const id = "ai-card-" + i,
        vid = "ai-version-" + i,
        cid = "ai-cycle-" + i;
      ids.push(id);
      db.prepare("INSERT INTO learning_content_versions VALUES(?,?,?,?)").run(
        vid,
        id,
        c.published_type,
        JSON.stringify({ ...v, cardId: id, versionId: vid }),
      );
      db.prepare("INSERT INTO learning_study_cycles VALUES(?,?,?,?,?)").run(
        cid,
        id,
        cy.started_at,
        cy.provenance,
        cy.source_ordinal,
      );
      db.prepare("INSERT INTO learning_cards VALUES(?,?,?,?,?,?,?,?,?)").run(
        id,
        deckId,
        "合成" + i,
        c.published_type,
        vid,
        cid,
        1,
        null,
        null,
      );
      db.prepare("INSERT INTO learning_published_modes VALUES(?,?,?)").run(
        id,
        c.published_type,
        vid,
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  let sourcePath = join(f.root, "source.zip"),
    returnPath = join(f.root, "return.zip");
  const make = () => {
    const platform = adjustmentPreviewPlatform(
        () => f.ctx,
        async (kind) => (kind === "source" ? sourcePath : returnPath),
      ),
      host = createApplicationProtocol(
        new Application(f.ctx),
        undefined,
        platform,
      );
    return createClient((r) => host.execute(r));
  };
  let client = make();
  await client.call("app.capabilities", {});
  return {
    f,
    deckId,
    ids,
    get client() {
      return client;
    },
    async restart() {
      await f.reopen();
      client = make();
      await client.call("app.capabilities", {});
    },
    async prepare(actions: unknown[] = ids.map(maxAction)) {
      sourcePath = join(f.root, randomUUID() + ".zip");
      returnPath = join(f.root, randomUUID() + ".zip");
      await writeAnalysisZip(
        f.ctx,
        {
          deckId,
          jobId: randomUUID(),
          date: { range: "all" },
          includeImages: false,
        },
        sourcePath,
        {
          cancelled: false,
          progress: { phase: "idle", cardCount: 0, eventCount: 0, bytes: 0 },
        },
      );
      const source = await readSourceZip(sourcePath),
        files: Array<[string, Buffer]> = [],
        descriptors = [];
      for (let i = 0; i < actions.length; i += 300) {
        const body = Buffer.from(
            JSON.stringify({ actions: actions.slice(i, i + 300) }),
          ),
          path =
            "adjustments/part-" +
            String(descriptors.length + 1).padStart(4, "0") +
            ".json";
        files.push([path, body]);
        descriptors.push({
          path,
          bytes: body.length,
          sha256: createHash("sha256").update(body).digest("hex"),
          count: Math.min(300, actions.length - i),
        });
      }
      const z = new yazl.ZipFile();
      z.addBuffer(
        Buffer.from(
          JSON.stringify({
            format: ACTION_FORMAT,
            source,
            actionCount: actions.length,
            files: descriptors,
          }),
        ),
        "manifest.json",
      );
      for (const [path, b] of files) z.addBuffer(b, path);
      z.end();
      await pipeline(z.outputStream, createWriteStream(returnPath));
      const preview = await client.call("learning.aiAdjustment.preview.open", {
        deckId,
      });
      if (!preview) throw Error("未获得预览");
      const p = await client.call("learning.aiAdjustment.preview.prepare", {
        deckId,
        token: preview.token,
        source: preview.source,
        selection: { mode: "all-valid", excludedActionIds: [] },
        confirmed: true,
      });
      return {
        deckId,
        source: p.source,
        preparationToken: p.preparationToken,
        confirmed: true as const,
      };
    },
    close: () => f.close(),
  };
}
export function databaseDump(f: Awaited<ReturnType<typeof freshFixture>>) {
  return hash(
    f.ctx.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map(({ name }) => [
        name,
        f.ctx.db.prepare('SELECT * FROM "' + name + '" ORDER BY rowid').all(),
      ]),
  );
}
export function immutableData(f: Awaited<ReturnType<typeof freshFixture>>) {
  return hash(
    [
      "learning_cards",
      "learning_content_versions",
      "learning_review_events",
      "schedule_events",
      "scheduling",
      "knowledge",
    ].map((t) => [
      t,
      f.ctx.db.prepare("SELECT * FROM " + t + " ORDER BY rowid").all(),
    ]),
  );
}
export async function review(a: Awaited<ReturnType<typeof aiFixture>>, cardId=a.ids[0]) {
 const q=await a.client.call('learning.queue.preview',{deckId:a.deckId});
 let s=await a.client.call('learning.session.open',q.due.length+q.relearn.length?{deckId:a.deckId,mode:'scheduled'}:{deckId:a.deckId,cardIds:[cardId],mode:'practice'});
 for(;;){
  s=await a.client.call('learning.session.change',{deckId:a.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:90}});
  await a.client.call('learning.review.submit',{deckId:a.deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:90,practice:false,faults:[],gaps:'',reflection:''});
  s=await a.client.call('learning.session.get',{deckId:a.deckId,sessionId:s.sessionId});if(s.completed)break;
  s=await a.client.call('learning.session.change',{deckId:a.deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'next'});
 }
}
