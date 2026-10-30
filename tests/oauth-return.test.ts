import { test } from "node:test";
import assert from "node:assert/strict";
import { oauthReturnPath } from "../src/lib/oauth-return";
test("a code returned to the Site URL is forwarded to the fixed callback route", () => {
  assert.equal(
    oauthReturnPath({ code: "test-only-code" }),
    "/auth/callback?code=test-only-code",
  );
});
test("query values cannot inject redirect targets or extra callback parameters", () => {
  const path = oauthReturnPath({ code: "abc&next=https://attacker.example" })!;
  const url = new URL(path, "http://127.0.0.1:3000");
  assert.equal(url.pathname, "/auth/callback");
  assert.equal(url.searchParams.get("next"), null);
  assert.equal(
    url.searchParams.get("code"),
    "abc&next=https://attacker.example",
  );
});
test("normal landing, malformed code and OAuth denial do not produce redirect loops", () => {
  assert.equal(oauthReturnPath({}), null);
  assert.equal(oauthReturnPath({ code: ["a", "b"] }), null);
  assert.equal(oauthReturnPath({ code: "x".repeat(2049) }), null);
  assert.equal(oauthReturnPath({ error: "access_denied" }), "/?notice=auth");
  assert.equal(oauthReturnPath({ code: "  " }), null);
});
