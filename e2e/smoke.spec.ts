import { apiContent, expect, expectNoHorizontalScroll, RESUME_URL, test } from "./fixtures";

test("home renders the hero, the live API status and the API's content", async ({ page, guard }) => {
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByTestId("status-bar")).toContainText("api online");
  await expect.poll(() => guard.apiCalls).toContain("GET /api/v1/content");
});

test("work list and a case study", async ({ page }) => {
  await page.goto("/work");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Only in the API's content: proves the swap from the bundled snapshot happened.
  const apiProject = page.getByRole("link", { name: "Served by the API" });
  await expect(apiProject).toBeVisible();
  await expect(page.getByRole("img", { name: "API project screenshot" })).toBeVisible();

  const slug = apiContent.projects[0].slug;
  await page.goto(`/work/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: apiContent.projects[0].name })).toBeVisible();
});

test("about page", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("contact form sends the message and confirms", async ({ page, guard }) => {
  await page.goto("/contact");
  const form = page.getByRole("form", { name: "Contact form" });
  await form.getByLabel("Name").fill("Smoke Test");
  await form.getByLabel("Email").fill("smoke@example.com");
  await form.getByLabel("Message").fill("Hello from the Playwright smoke test, checking the form end to end.");
  await form.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("status")).toContainText("Thanks! Your message is on its way.");
  expect(guard.bodies.get("POST /api/v1/contact")).toMatchObject({
    name: "Smoke Test",
    email: "smoke@example.com",
    message: "Hello from the Playwright smoke test, checking the form end to end.",
  });
});

test("résumé page embeds the PDF from the API's media route", async ({ page, guard }) => {
  await page.goto("/resume");
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible();
  await expect(page.locator("iframe")).toHaveAttribute("src", RESUME_URL);
  await expect.poll(() => guard.apiCalls).toContain(`GET ${new URL(RESUME_URL).pathname}`);
});

test("admin shows the sign-in form and is not indexed", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("unknown pages show the 404 page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});

test("the default build keeps Pitch Me dark", async ({ page, guard }) => {
  await page.goto("/pitch");
  await expect(page.getByText("coming soon").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Pitch me (coming soon)" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Pitch me", exact: true })).toHaveCount(0);
  expect(guard.apiCalls.filter((call) => call.includes("/pitch/"))).toEqual([]);
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  for (const path of ["/", "/work", "/about", "/contact", "/resume", "/pitch", "/admin"]) {
    test(`${path} has no horizontal scroll`, async ({ page, guard }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      // Measure the final layout: after the API's content (or, in the admin, the session check)
      // has arrived and the web fonts have loaded.
      const settled = path === "/admin" ? "GET /api/v1/auth/me" : "GET /api/v1/content";
      await expect.poll(() => guard.apiCalls).toContain(settled);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await expectNoHorizontalScroll(page);
    });
  }
});
