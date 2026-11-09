import { test, expect } from "@playwright/test";

test("sound is opt-in, follows playback and can be silenced without changing the tree", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Observe the real audio graph without replacing synthesis or the browser clock.
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createOscillator;
    const originalGain = AudioContext.prototype.createGain;
    (window as any).audioStarts = 0;
    (window as any).audioGains = [];
    AudioContext.prototype.createGain = function () {
      const gain = originalGain.call(this);
      (window as any).audioGains.push(gain);
      return gain;
    };
    AudioContext.prototype.createOscillator = function () {
      (window as any).audioStarts++;
      return original.call(this);
    };
  });
  await page.goto("/#/laboratory");
  expect(await page.evaluate(() => (window as any).audioStarts)).toBe(0);
  await page
    .getByRole("button", { name: "Activar sonido", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Silenciar sonido" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("slider", { name: "Volumen del sonido" }).fill("20");
  await page.getByRole("button", { name: "Animar razonamiento" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).audioStarts), {
      timeout: 7000,
    })
    .toBeGreaterThan(2);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const count = await page.evaluate(() => (window as any).audioStarts);
  await page
    .getByRole("slider", { name: "Tiempo de reproducción" })
    .fill("18000");
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as any).audioGains[0].gain.value),
  ).toBeLessThan(0.001);
  expect(await page.evaluate(() => (window as any).audioStarts)).toBe(count);
  await page.getByRole("button", { name: "Silenciar sonido" }).click();
  await page.getByRole("button", { name: "Reproducir", exact: true }).click();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).audioStarts)).toBe(count);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await page
    .getByRole("button", { name: "Activar sonido", exact: true })
    .click();
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByRole("slider", { name: "Volumen del sonido" }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `test-results/sound-${width}.png` });
  }
  await page.getByRole("button", { name: "Reproducir", exact: true }).click();
  await page.getByRole("link", { name: "Evaluador", exact: true }).click();
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => (window as any).audioGains[0].gain.value),
  ).toBeLessThan(0.001);
  await page
    .getByRole("textbox", { name: "Fórmula lógica", exact: true })
    .fill("∀x P(x,x)");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).audioGains[0].context.state),
    )
    .toBe("closed");
  expect(errors).toEqual([]);
});

test("the synthesized chime has a soft onset, audible body and silent release", async ({
  page,
}) => {
  await page.goto("/");
  const levels = await page.evaluate(async () => {
    const modulePath = "/src/audio/soundscape.ts";
    const { chime } = await import(modulePath);
    const context = new OfflineAudioContext(1, 44100, 44100);
    chime(context, context.destination, 659.25);
    const data = (await context.startRendering()).getChannelData(0);
    const peak = (start: number, end: number) => {
      let max = 0;
      for (let i = start; i < end; i++) max = Math.max(max, Math.abs(data[i]));
      return max;
    };
    return { start: data[0], body: peak(400, 10000), tail: peak(33000, 44000) };
  });
  expect(levels.start).toBe(0);
  expect(levels.body).toBeGreaterThan(0.05);
  expect(levels.body).toBeLessThan(0.2);
  expect(levels.tail).toBe(0);
});
