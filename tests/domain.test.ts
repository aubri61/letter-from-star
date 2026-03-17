import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateLetter,
  validatePhoto,
  nextDelivery,
  imageExtension,
  unreadLetters,
} from "../src/lib/domain";
import { previewState } from "../src/lib/preview";
test("letter validation rejects empty/oversize values", () => {
  assert.ok(validateLetter(" ", "hello"));
  assert.ok(validateLetter("hello", " ".repeat(50)));
  assert.ok(validateLetter("a", "b".repeat(3001)));
  assert.equal(validateLetter("오늘의 안부", "잘 지내고 있어."), null);
});
test("photos enforce MIME and byte limits, reject renamed SVG", () => {
  assert.ok(validatePhoto({ size: 1, type: "image/svg+xml" }));
  assert.ok(validatePhoto({ size: 6 * 1024 * 1024, type: "image/png" }));
  assert.equal(validatePhoto({ size: 1024, type: "image/webp" }), null);
  assert.equal(imageExtension(new TextEncoder().encode("<svg>")), null);
  assert.equal(imageExtension(new Uint8Array([255, 216, 255])), "jpg");
});
test("first letter schedules strictly next KST 09:00 including boundary", () => {
  for (const [now, expected] of [
    ["2025-01-15T23:59:59+09:00", "2025-01-16T00:00:00.000Z"],
    ["2025-01-15T08:59:59+09:00", "2025-01-15T00:00:00.000Z"],
    ["2025-01-15T09:00:00+09:00", "2025-01-16T00:00:00.000Z"],
  ])
    assert.equal(nextDelivery(new Date(now)).toISOString(), expected);
});
test("unread status survives serialization and does not count sent letters", () => {
  const state = previewState();
  assert.equal(
    unreadLetters(JSON.parse(JSON.stringify(state)).letters).length,
    1,
  );
  state.letters[0].read_at = new Date().toISOString();
  assert.equal(unreadLetters(state.letters).length, 0);
});
