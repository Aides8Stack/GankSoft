import { services } from "../services";
/** Catalog UI entry points share this typed facade; dialogs never access SQL or files. */
export const catalogManagement = {
  exportDeck: (id: string, cardIds?: string[]) =>
    services.deck.export({ id, cardIds }),
  removeDeck: (id: string) => services.deck.action({ id, action: "delete" }),
  openCollection: () => services.collection.open(),
  describeCollection: (fileToken: string) =>
    services.collection.describe(fileToken),
  importCollection: (
    fileToken: string,
    name: string,
    folderId: string | null,
  ) => services.collection.import(fileToken, name, folderId),
};
