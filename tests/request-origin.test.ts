import { test } from "node:test";
import assert from "node:assert/strict";
import { requestOrigin } from "../src/lib/request-origin";
test("dev callbacks and Origin checks preserve the browser loopback address", () => {
  const request = new Request("http://localhost:3000/auth/login", {
    headers: { host: "127.0.0.1:3000" },
  });
  assert.equal(requestOrigin(request, true), "http://127.0.0.1:3000");
});
test("production does not trust arbitrary Host headers", () => {
  const request = new Request("https://letters.example/auth/login", {
    headers: { host: "attacker.example" },
  });
  assert.equal(requestOrigin(request, false), "https://letters.example");
  assert.equal(requestOrigin(request, true), "https://letters.example");
});
test("malformed dev hosts cannot redirect to a different origin", () => {
  const request = new Request("http://localhost:3000/auth/login", {
    headers: { host: "localhost@attacker.example" },
  });
  assert.equal(requestOrigin(request, true), "http://localhost:3000");
});
