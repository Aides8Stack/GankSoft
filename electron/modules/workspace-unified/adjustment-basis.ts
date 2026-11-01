import { createHash } from "node:crypto";
import type { Context } from "../../infrastructure/context.ts";
import {
  publishedCard,
  readSchedule,
  currentDue,
  policySnapshot,
} from "../cards-unified/schedule.ts";
import { getCardLinks } from "../knowledge-unified/links.ts";
/** Local bounded fingerprints are not IPC payloads and do not change the wire budget. */
export function basisHash(value: unknown) {
  return createHash("sha256")
    .update(
      JSON.stringify(value, (_key, v) =>
        v && typeof v === "object" && !Array.isArray(v)
          ? Object.fromEntries(
              Object.keys(v)
                .sort()
                .map((k) => [k, v[k]]),
            )
          : v,
      ),
    )
    .digest("hex");
}
export function targetBasis(
  ctx: Context,
  deckId: string,
  cardId: string,
  deck?: ReturnType<typeof import("../review/config-service.ts").reviewConfig>,
  known?: ReturnType<typeof publishedCard>,
) {
  if (known && (known.cardId !== cardId || known.deckId !== deckId))
    throw Error("批量目标身份不一致");
  const card = known ?? publishedCard(ctx, { deckId, cardId }),
    row = ctx.db
      .prepare("SELECT revision FROM learning_cards WHERE id=?")
      .get(cardId)!;
  const schedule = readSchedule(ctx, card);
  return {
    cardId,
    basis: basisHash({
      card,
      revision: row.revision,
      schedule,
      due: currentDue(ctx, card, schedule),
      links: getCardLinks(ctx, { deckId, cardId }, card),
      policy: policySnapshot(ctx, card, deck),
    }),
  };
}
export function treeBasis(
  ctx: Context,
  deckId: string,
  charge: (n: number) => void,
) {
  const h = createHash("sha256");
  for (const n of ctx.db
    .prepare(
      "SELECT id,parent_id,name,version,deleted_at FROM knowledge WHERE module=? ORDER BY id",
    )
    .iterate(deckId)) {
    const s = JSON.stringify(n);
    charge(Buffer.byteLength(s) + 64);
    h.update(s).update("\n");
  }
  return h.digest("hex");
}
