import { test, expect } from "@playwright/test";

test("contact rings, directional trails and closing wave seek and pause together", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  const scrubber = page.getByRole("slider", { name: "Tiempo de reproducción" });
  await scrubber.fill("1900");
  await expect(page.locator(".pulse-trail").first()).toBeVisible();
  await scrubber.fill("2400");
  const ring = page.locator('[data-id="r.0"] .contact-resonance');
  await expect(ring).toBeVisible();
  const frozen = await ring.getAttribute("style");
  await page.waitForTimeout(180);
  expect(await ring.getAttribute("style")).toBe(frozen);
  await page.screenshot({ path: "test-results/contact-resonance.png" });
  const duration = Number(await scrubber.getAttribute("max"));
  await scrubber.fill(String(Math.floor((duration - 1300) / 10) * 10));
  await expect(page.locator(".closing-wave").first()).toBeVisible();
  await expect(page.locator(".result-beacon")).toHaveAttribute(
    "data-closing",
    "true",
  );
  await page.screenshot({ path: "test-results/closing-wave.png" });
  await scrubber.fill("1900");
  await expect(page.locator(".closing-wave")).toHaveCount(0);
  await expect(page.locator(".result-beacon")).not.toContainText("Verdadero");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.locator(
      ".pulse-trail, .contact-resonance, .closing-wave, .finale-resonance",
    ),
  ).toHaveCount(0);
});
