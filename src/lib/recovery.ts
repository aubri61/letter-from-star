/** Re-fetch on reconnect/focus and periodically so missed Realtime events self-heal. */
export function subscribeRecovery(
  refresh: () => void,
  win: Pick<
    Window,
    "addEventListener" | "removeEventListener" | "setInterval" | "clearInterval"
  > = window,
  doc: Pick<
    Document,
    "addEventListener" | "removeEventListener" | "visibilityState"
  > = document,
) {
  const recover = () => {
    if (doc.visibilityState === "visible") refresh();
  };
  doc.addEventListener("visibilitychange", recover);
  win.addEventListener("focus", recover);
  win.addEventListener("online", recover);
  const poll = win.setInterval(recover, 60000);
  return () => {
    win.clearInterval(poll);
    doc.removeEventListener("visibilitychange", recover);
    win.removeEventListener("focus", recover);
    win.removeEventListener("online", recover);
  };
}
