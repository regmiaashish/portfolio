/**
 * Runs against the second build, made with VITE_PITCH_ENABLED=true (the flag is read at build
 * time), with the SSE stream answered from a fixture: no agent or model is ever called.
 */
import { expect, test } from "./fixtures";

test("Pitch Me streams a pitch from the agents", async ({ page, guard }) => {
  await page.goto("/pitch");
  await page.getByLabel("Company").fill("Example Corp");
  await page.getByLabel("Role").fill("Backend engineer");
  await page.getByRole("button", { name: "Pitch me" }).click();

  await expect(page.getByRole("log", { name: "Agent log" })).toContainText("Reading about Example Corp");
  await expect(page.getByText("Aashish builds reliable backends for Example Corp.")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Your pitch is ready." })).toBeAttached();
  await expect(page.getByRole("button", { name: "Copy pitch" })).toBeEnabled();
  expect(guard.apiCalls).toContain("GET /api/v1/pitch/stream");
});
