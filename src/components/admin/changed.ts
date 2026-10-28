import { offerUndo } from '../ui/kit';
import { logChange, LogKind } from '../../utils/adminLog';

/**
 * An admin's change made at once, without „დარწმუნებული ხარ?“: a line in the change log, and the undo bar for a few
 * seconds — its „გაუქმება“ puts the change back and logs that too. `bar` is the bar's own short text (the log line by
 * default); `target` = whose it is (a uid or a class id).
 */
export const changed = (kind: LogKind, text: string, target: string, undo: () => Promise<unknown>, bar = text) => {
  logChange(kind, text, target);
  offerUndo(bar, async () => {
    await undo();
    logChange('undo', `გაუქმდა: ${text}`, target);
  });
};
