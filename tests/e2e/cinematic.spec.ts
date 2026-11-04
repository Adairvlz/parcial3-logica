import { test, expect } from "@playwright/test";

test("animating again while playing starts a fresh running clock", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  const animate = page.getByRole("button", { name: "Animar razonamiento" });
  await animate.click();
  await page.waitForTimeout(300);
  await animate.click();
  const slider = page.getByRole("slider", { name: "Tiempo de reproducción" });
  await expect
    .poll(async () => Number(await slider.inputValue()))
    .toBeGreaterThan(500);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const paused = await slider.inputValue();
  await page.waitForTimeout(200);
  expect(await slider.inputValue()).toBe(paused);
});

test("decision navigation, camera recovery and reduced motion preserve the replay", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  const decisions = page.getByRole("combobox", { name: "Ir a una decisión" });
  const first = await decisions.locator("option").nth(1).getAttribute("value");
  await decisions.selectOption(first!);
  await expect(page.locator(".timeline")).toHaveAttribute(
    "data-event",
    "resolve",
  );
  await expect(page.locator(".timeline")).toHaveAttribute("data-node", "r.0");
  await expect(page.locator(".timeline")).toHaveAttribute(
    "data-playing",
    "false",
  );
  await expect(page.locator(".result-beacon")).not.toContainText("Verdadero");
  const follow = page.getByRole("button", { name: "Seguir razonamiento" });
  await follow.click();
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
  await expect(follow).toHaveAttribute("aria-pressed", "false");
  await follow.click();
  await expect(follow).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Movimiento reducido", exact: true })
    .click();
  await expect(page.locator(".reasoning-canvas")).toHaveClass(/motion-reduced/);
  await expect(page.locator(".edge-pulse")).toHaveCount(0);
  await decisions.selectOption({ label: "Conclusión" });
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(decisions).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/cinematic-${width}.png` });
  }
});

test("edges reveal truth colors only after evaluation and rewind to neutral", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  const slider = page.getByRole("slider", { name: "Tiempo de reproducción" });
  const stop = page.locator('[data-id="r.0-r.0.0"] stop[offset="100%"]');
  await slider.fill("3100");
  await expect(stop).toHaveAttribute("stop-color", "#69bfe8");
  await slider.fill("4200");
  await expect(stop).toHaveAttribute("stop-color", "#fb7185");
  await slider.fill("3100");
  await expect(stop).toHaveAttribute("stop-color", "#69bfe8");
});
