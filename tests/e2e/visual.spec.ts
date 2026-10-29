import { test, expect } from "@playwright/test";
test.use({ video: { mode: process.env.LOGOS_RECORD_VIDEO === "1" ? "on" : "off", size: { width: 1366, height: 768 } } });
test("visual review of organic scene, intermediate propagation and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await page.waitForTimeout(1400);
  await expect(page.locator(".orb-core")).toHaveCount(7);
  await page.screenshot({ path: "test-results/organic-desktop.png" });
  await page.locator('[data-id="atom-b"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/organic-inspector.png" });
  await page.getByRole("button", { name: "Cerrar inspector" }).click();
  await page
    .getByRole("slider", { name: "Tiempo de reproducción" })
    .fill("15600");
  await page.screenshot({ path: "test-results/organic-propagation.png" });
  await page
    .getByRole("slider", { name: "Tiempo de reproducción" })
    .fill("21600");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/organic-1920.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/organic-mobile.png" });
  expect(errors).toEqual([]);
});

test("record a continuous demonstration including branch growth and return pulses", async ({
  page,
}) => {
  test.setTimeout(35000);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "Animar demo" }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test-results/organic-growing.png" });
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "3", {
    timeout: 12000,
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "test-results/organic-witness.png" });
  await expect(page.locator(".timeline")).toHaveAttribute(
    "data-playing",
    "false",
    { timeout: 17000 },
  );
  await expect(page.locator(".organic-node.state-true")).toHaveCount(7);
  await page.screenshot({ path: "test-results/organic-completed.png" });
});
