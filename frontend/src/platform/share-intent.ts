// Native Android share-sheet reader. This Expo build cannot register intent
// filters without a config plugin / dev client; we therefore ship a strict
// abstraction with a no-op reader. Any later native port drops in a real
// implementation of readPendingShare() returning ImportSource(s).
import type { ImportSource } from "../importer/import-pipeline";

export interface IShareIntentReader {
  readPendingShare(): Promise<ImportSource[]>;
}
class NoopShareIntentReader implements IShareIntentReader {
  async readPendingShare(): Promise<ImportSource[]> {
    return [];
  }
}
export const shareIntentReader: IShareIntentReader = new NoopShareIntentReader();
