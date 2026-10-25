import { basename } from "node:path";
import { ExchangeToken } from "../../../shared/protocol/card-exchange.ts";
import { DomainError } from "../../../shared/domain-error.ts";
import type { Context } from "../../infrastructure/context.ts";
import {
  preparedCardExport,
  writeCardPackage,
  readCardPackage,
  stageCardPackage,
} from "./exchange.ts";
export interface CardExchangeDialogs {
  save(): Promise<string | null>;
  open(): Promise<string | null>;
}
/** OS paths remain in the main process. Production and isolated Electron use
 * the same coordinator; only the native dialog boundary is substituted. */
export function cardExchangePlatform(
  current: () => Context,
  dialogs: CardExchangeDialogs,
) {
  return {
    "card.exchange.save": async (input: unknown) => {
      const p = ExchangeToken.parse(input),
        ctx = current();
      let writing = false;
      try {
        preparedCardExport(ctx, p);
        const path = await dialogs.save();
        if (path === null) return { saved: false, name: null };
        if (ctx !== current()) throw Error("数据库已变化，请重新预览");
        const doc = preparedCardExport(ctx, p);
        writing = true;
        await writeCardPackage(path, doc);
        return { saved: true, name: basename(path) };
      } catch (e) {
        if (!writing)
          throw new DomainError(
            "CARD_EXPORT_REJECTED",
            e instanceof Error ? e.message : String(e),
          );
        throw e;
      }
    },
    "card.exchange.open": async () => {
      const ctx = current(),
        epoch = String(
          ctx.db
            .prepare("SELECT epoch FROM protocol_meta WHERE singleton=1")
            .get()!.epoch,
        ),
        path = await dialogs.open();
      if (path === null) return null;
      const doc = await readCardPackage(path);
      if (
        ctx !== current() ||
        String(
          ctx.db
            .prepare("SELECT epoch FROM protocol_meta WHERE singleton=1")
            .get()!.epoch,
        ) !== epoch
      )
        throw new DomainError(
          "DATA_EPOCH_CHANGED",
          "数据库已变化，请重新选择文件",
        );
      return stageCardPackage(ctx, doc);
    },
  };
}
