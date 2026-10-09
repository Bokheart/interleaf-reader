// One visual transaction at a time. Only a completed transition commits a source
// position; cancellation, detached surfaces and drawing failures roll back.
export function createPageTurnTransition(windowRef, duration = 160) {
  let active = null;
  let settled = Promise.resolve(false);
  function cancel() { active?.finish(false); }
  function run({ draw, commit, rollback, valid = () => true, reducedMotion = false }) {
    if (active) return Promise.resolve(false);
    settled = new Promise(resolve => {
      let frame = null;
      let start = null;
      const transaction = { finish(success) {
        if (active !== transaction) return;
        active = null;
        if (frame !== null) windowRef.cancelAnimationFrame(frame);
        let committed = success;
        try { if (success) commit(); else rollback(); }
        catch (_) {
          committed = false;
          if (success) { try { rollback(); } catch (_) { /* still settle the transaction */ } }
        }
        finally { resolve(committed); }
      } };
      active = transaction;
      const tick = time => {
        try {
          if (!valid()) return transaction.finish(false);
          start ??= time;
          const fraction = reducedMotion ? 1 : Math.min(1, (time - start) / duration);
          draw(1 - (1 - fraction) ** 3);
          if (fraction === 1) transaction.finish(true);
          else frame = windowRef.requestAnimationFrame(tick);
        } catch (_) { transaction.finish(false); }
      };
      if (reducedMotion) tick(0);
      else {
        try { frame = windowRef.requestAnimationFrame(tick); }
        catch (_) { transaction.finish(false); }
      }
    });
    return settled;
  }
  return { run, cancel, whenSettled: () => settled, get active() { return Boolean(active); } };
}
