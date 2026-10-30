import { test, expect } from "@playwright/test";
import { previewState } from "../../src/lib/preview";
test("Gemini and Groq versions open independently without the removed notice", async ({
  page,
}) => {
  const state = previewState();
  const groq = state.letters.find((l) => l.direction === "FROM_CAT")!;
  groq.reply_to_letter_id = "sample-sent";
  groq.ai_provider = "groq";
  state.letters.unshift({
    ...groq,
    id: "sample-gemini",
    title: "집사야, 앞발로 썼어!",
    ai_provider: "gemini",
  });
  await page.addInitScript(
    (data) =>
      localStorage.setItem("little-star-preview-v1", JSON.stringify(data)),
    state,
  );
  await page.goto("/preview/letters/sample-letter");
  const versions = page.getByRole("navigation", {
    name: "같은 편지에 온 답장",
  });
  await expect(
    versions.getByRole("link", { name: "Groq 답장" }),
  ).toHaveAttribute("aria-current", "page");
  await versions.getByRole("link", { name: "Gemini 답장" }).click();
  await expect(
    page.getByRole("heading", { name: "집사야, 앞발로 썼어!" }),
  ).toBeVisible();
  await expect(
    versions.getByRole("link", { name: "Gemini 답장" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/AI가 상상한|실제 고양이가/)).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/screenshots/${test.info().project.name}-reply-versions.png`,
    fullPage: true,
  });
});
test("instant reply requires the account session and same-origin requests", async ({
  page,
  request,
}) => {
  const blocked = await request.post("/api/letters/reply", {
    data: { letterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
  });
  expect(blocked.status()).toBe(403);
  const anonymous = await request.post("/api/letters/reply", {
    headers: { Origin: "http://127.0.0.1:3000" },
    data: { letterId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
  });
  expect([401, 503]).toContain(anonymous.status());
  await page.goto("/preview/letters/sample-sent");
  await expect(
    page.getByRole("heading", { name: "별아, 오늘도 네 생각이 났어" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "바로 답장 받기" }),
  ).toHaveCount(0);
});
test("landing and protected routes never expose account data", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "멀리 있어도",
  );
  await page.screenshot({
    path: `test-results/screenshots/${test.info().project.name}-landing.png`,
    fullPage: true,
  });
  const protectedPage = await request.get("/postoffice", { maxRedirects: 0 });
  expect(protectedPage.status()).toBe(307);
  expect(protectedPage.headers().location).toMatch(/notice=setup|auth\/login/);
  const response = await request.get("/api/state");
  expect([401, 503]).toContain(response.status());
  const blocked = await request.post("/api/letters", {
    data: { title: "test", content: "test" },
  });
  expect(blocked.status()).toBe(403);
});
test("mailbox reading persists after reload and across tabs", async ({
  page,
  context,
}) => {
  await page.goto("/preview");
  await expect(page.getByText("새 편지가 있어요")).toBeVisible();
  await page.screenshot({
    path: `test-results/screenshots/${test.info().project.name}-home.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "새 편지 열어보기" }).click();
  await expect(
    page.getByRole("heading", { name: "오늘은 햇살 한 줌을 보낼게" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("little-star-preview-v1") || "{}")
            .letters?.[0]?.read_at,
      ),
    )
    .toBeTruthy();
  await page.reload();
  await page.goto("/preview");
  await expect(page.getByText("새 편지가 있어요")).toHaveCount(0);
  const other = await context.newPage();
  await other.goto("/preview");
  await expect(other.getByText("새 편지가 있어요")).toHaveCount(0);
});
test("compose, send, archive, read on desktop and mobile without overflow", async ({
  page,
}) => {
  await page.goto("/preview/compose");
  await page
    .getByLabel("편지 제목", { exact: true })
    .fill("오늘의 작은 이야기");
  await page
    .getByLabel("편지 내용", { exact: true })
    .fill("창가의 햇살을 보니 함께했던 오후가 떠올랐어. 오늘도 고마워.");
  await page.getByRole("button", { name: "마음 담아 보내기" }).click();
  await expect(page).toHaveURL(/preview\/archive/);
  await page.getByRole("tab", { name: "고양이에게 보낸 편지" }).click();
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "오늘의 작은 이야기" }) })
    .click();
  await expect(
    page.getByRole("heading", { name: "오늘의 작은 이야기" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("upload validation, primary selection, removal and profile save", async ({
  page,
}) => {
  await page.goto("/preview/cat");
  const upload = page.getByLabel("고양이 사진 추가");
  await upload.setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "JPG" }),
  ).toContainText("JPG");
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    c.getContext("2d")!.fillRect(0, 0, 20, 20);
    return c.toDataURL("image/png").split(",")[1];
  });
  const buffer = Buffer.from(png, "base64");
  await upload.setInputFiles([
    { name: "cat.png", mimeType: "image/png", buffer },
    { name: "other.png", mimeType: "image/png", buffer },
  ]);
  await expect(page.getByRole("button", { name: "사진 2 제거" })).toBeVisible();
  await page.getByRole("button", { name: "대표로 선택" }).click();
  await expect(
    page.getByRole("button", { name: "✦ 대표 사진" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "사진 1 제거" }).click();
  await page.getByRole("textbox", { name: "고양이 이름" }).fill("달이");
  await page.getByRole("button", { name: "우리의 추억 간직하기" }).click();
  await expect(page).toHaveURL(/preview$/);
  await expect(
    page.getByRole("heading", { name: "달이에게", exact: true }),
  ).toBeVisible();
});

test("OAuth Site URL fallback redirects without rendering its code and favicon exists", async ({
  request,
}) => {
  const callback = await request.get("/?code=test-only-oauth-code", {
    maxRedirects: 0,
  });
  expect(callback.status()).toBe(307);
  expect(callback.headers().location).toBe(
    "/auth/callback?code=test-only-oauth-code",
  );
  const landing = await request.get("/");
  expect(landing.status()).toBe(200);
  const icon = await request.get("/favicon.ico");
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image");
});
