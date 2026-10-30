import { test } from "node:test";
import assert from "node:assert/strict";
import { subscribeRecovery } from "../src/lib/recovery";
test("missed realtime events recover on online/focus/visible polling and cleanup unsubscribes", () => {
  const win = new EventTarget(),
    doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  let refreshes = 0,
    interval: (() => void) | undefined,
    cleared = false;
  const windowStub = Object.assign(win, {
    setInterval: (callback: () => void) => {
      interval = callback;
      return 1;
    },
    clearInterval: () => {
      cleared = true;
    },
  });
  const cleanup = subscribeRecovery(
    () => refreshes++,
    windowStub as unknown as Window,
    doc as unknown as Document,
  );
  win.dispatchEvent(new Event("online"));
  win.dispatchEvent(new Event("focus"));
  interval?.();
  assert.equal(refreshes, 3);
  doc.visibilityState = "hidden";
  win.dispatchEvent(new Event("online"));
  assert.equal(refreshes, 3);
  doc.visibilityState = "visible";
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(refreshes, 4);
  cleanup();
  win.dispatchEvent(new Event("focus"));
  assert.equal(refreshes, 4);
  assert.ok(cleared);
});
