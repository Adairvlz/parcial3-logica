import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const scrub = async (page: Page, time: number) =>
  page
    .getByRole("slider", { name: "Tiempo de reproducción" })
    .fill(String(time));

test("immersive tree is the entry, routes and history remain functional", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".orb-core")).toHaveCount(7);
  await expect(page.locator(".luminous-edge")).toHaveCount(6);
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /No solo evalúes/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explorar el laboratorio" }).click();
  await expect(page).toHaveURL(/#\/laboratory$/);
  await page.getByRole("link", { name: "Formula Editor" }).click();
  await expect(
    page.getByRole("textbox", { name: "Fórmula lógica" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("selection highlights only the ancestor route and inspector shows the true witness", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  await page.locator('[data-id="atom-b"]').click();
  await expect(page.locator(".inspector-formula")).toHaveText("P(b,c)");
  await expect(page.locator(".explanation")).toContainText("(b,c)");
  await expect(page.locator(".edge-active")).toHaveCount(2);
  await expect(page.locator(".on-path")).toHaveCount(3);
  await expect(page.locator(".decisive")).toContainText("y = c");
  await page.getByRole("button", { name: "∀x", exact: true }).click();
  await expect(page.locator(".inspector-formula")).toHaveText("∀x ∃y P(x,y)");
  await page.getByRole("button", { name: "Cerrar inspector" }).click();
  await expect(page.locator(".inspector")).toHaveCount(0);
});

test("formula cursor, symbols, navigation persistence and no stale demo results", async ({
  page,
}) => {
  await page.goto("/#/editor");
  const input = page.getByRole("textbox", { name: "Fórmula lógica" });
  await input.fill("P(x) & Q(x)");
  await input.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 6));
  await page.getByRole("button", { name: "Insertar ∧" }).click();
  await expect(input).toHaveValue("P(x) ∧ Q(x)");
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((el: HTMLTextAreaElement) => el.selectionStart),
  ).toBe(6);
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await expect(page.locator(".result-beacon")).toContainText("Sin evaluar");
  await expect(
    page.getByRole("button", { name: "Reproducir", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await page.getByRole("link", { name: "Formula Editor" }).click();
  await expect(input).toHaveValue("P(x) ∧ Q(x)");
  await page.getByRole("button", { name: "Restaurar ejemplo" }).click();
  await expect(page.locator(".orb-core")).toHaveCount(7);
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
});

test("play, pause, speed, restart, previous, next and rapid seeks are deterministic", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "0");
  await expect(page.locator(".result-beacon")).not.toContainText("Verdadero");
  await page
    .getByRole("combobox", { name: "Velocidad de reproducción" })
    .selectOption("2");
  await page.getByRole("button", { name: "Reproducir", exact: true }).click();
  await expect(page.locator(".timeline")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  const paused = await page
    .getByRole("slider", { name: "Tiempo de reproducción" })
    .inputValue();
  await page.waitForTimeout(300);
  expect(
    await page
      .getByRole("slider", { name: "Tiempo de reproducción" })
      .inputValue(),
  ).toBe(paused);
  await page
    .getByRole("button", { name: "Paso siguiente", exact: true })
    .click();
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "1");
  await page
    .getByRole("button", { name: "Paso anterior", exact: true })
    .click();
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "0");
  for (const time of [21000, 1000, 13000, 7000, 0, 21600, 8000])
    await scrub(page, time);
  await expect(
    page.locator('[data-id="exists-a"] .organic-node'),
  ).toHaveAttribute("data-state", "true");
  await expect(
    page.locator('[data-id="exists-b"] .organic-node'),
  ).toHaveAttribute("data-state", "pending");
  await expect(page.locator('[data-id="root"] .organic-node')).toHaveAttribute(
    "data-state",
    "running",
  );
  await expect(page.locator(".timeline")).toHaveAttribute(
    "data-playing",
    "false",
  );
});

test("edges grow visibly, reverse pulses propagate only after atomic verification, pause freezes them", async ({
  page,
}) => {
  await page.goto("/");
  await scrub(page, 2700);
  const growth = Number(
    await page
      .locator('[data-id="root-exists-a"] .luminous-edge')
      .getAttribute("data-growth"),
  );
  expect(growth).toBeGreaterThan(0);
  expect(growth).toBeLessThan(1);
  await expect(
    page.locator('.edge-pulse[data-direction="to-child"]').first(),
  ).toBeVisible();
  await scrub(page, 7200);
  await expect(
    page.locator('[data-id="atom-a"] .organic-node'),
  ).toHaveAttribute("data-state", "true");
  await expect(
    page.locator('[data-id="exists-a"] .organic-node'),
  ).toHaveAttribute("data-state", "running");
  const pulse = page
    .locator('[data-id="exists-a-atom-a"] .edge-pulse circle')
    .last();
  const x = await pulse.getAttribute("cx");
  await page.waitForTimeout(250);
  expect(await pulse.getAttribute("cx")).toBe(x);
  await scrub(page, 15600);
  await expect(
    page.locator('.edge-pulse[data-direction="to-parent"]'),
  ).toHaveCount(3);
  await expect(page.locator(".result-beacon")).not.toContainText("Verdadero");
  await scrub(page, 18200);
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
});

test("camera follows, yields to manual zoom and pan, and fits the tree", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Animar demo" }).click();
  await expect(
    page.getByRole("button", { name: "Seguimiento automático" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1100);
  const viewport = page.locator(".react-flow__viewport");
  const start = await viewport.getAttribute("style");
  await scrub(page, 6200);
  await page.waitForTimeout(1100);
  expect(await viewport.getAttribute("style")).not.toBe(start);
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Seguimiento automático" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(1100);
  const manual = await viewport.getAttribute("style");
  await scrub(page, 12000);
  await page.waitForTimeout(400);
  expect(await viewport.getAttribute("style")).toBe(manual);
  const box = await page.locator(".react-flow__pane").boundingBox();
  if (!box) throw new Error("Canvas missing");
  await page.mouse.move(box.x + 30, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 240, { steps: 8 });
  await page.mouse.up();
  expect(await viewport.getAttribute("style")).not.toBe(manual);
  await page
    .getByRole("button", { name: "Ajustar árbol", exact: true })
    .click();
  await page.waitForTimeout(1100);
  await scrub(page, 21600);
  for (const id of ["root", "atom-a", "atom-b", "atom-c"]) {
    const node = await page
      .locator(`[data-id="${id}"] .orb-core`)
      .boundingBox();
    expect(
      node &&
        node.x > box.x &&
        node.x + node.width < box.x + box.width &&
        node.y > box.y &&
        node.y + node.height < box.y + box.height,
    ).toBe(true);
  }
});

test("examples modal traps focus, Escape closes, and loading restores the demo", async ({
  page,
}) => {
  await page.goto("/#/editor");
  await page.getByRole("textbox").fill("∃x Q(x)");
  await page.getByRole("button", { name: "Ejemplos", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document.querySelector("dialog")?.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Ejemplos", exact: true }).click();
  await page
    .getByRole("button", { name: "Abrir ejemplo", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/laboratory$/);
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
});

test("keyboard node selection and pending inspector do not leak future truth", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-id="atom-c"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".inspector-formula")).toHaveText("P(c,a)");
  await scrub(page, 6000);
  await expect(page.locator(".inspector")).not.toContainText("Verdadero");
  await expect(page.locator(".decisive")).toHaveCount(0);
  await expect(page.locator(".inspector")).toContainText("Aún no aparece");
});

test("responsive framing, immersive coverage and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/");
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const canvas = await page.getByTestId("reasoning-canvas").boundingBox();
    expect(
      canvas && (canvas.width * canvas.height) / (size.width * size.height),
    ).toBeGreaterThan(0.8);
    for (const id of ["root", "atom-a", "atom-b", "atom-c"]) {
      const node = await page
        .locator(`[data-id="${id}"] .orb-core`)
        .boundingBox();
      expect(
        canvas &&
          node &&
          node.x >= canvas.x &&
          node.x + node.width <= canvas.x + canvas.width,
      ).toBe(true);
    }
    await scrub(page, 15600);
    await expect(page.locator(".edge-pulse")).toHaveCount(0);
    expect(
      await page
        .locator(".nebula")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
  }
  await page
    .getByRole("button", { name: "Modo inmersivo", exact: true })
    .click();
  const area = await page.getByTestId("reasoning-canvas").boundingBox();
  expect(area?.width).toBe(390);
  expect(area?.height).toBe(844);
  await page.getByRole("button", { name: "Salir del modo inmersivo" }).click();
});

test("visual settings, synthetic 40-node scene, and return to mathematical demo", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Configuración visual", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /Reducir movimiento/ }).check();
  await scrub(page, 15600);
  await expect(page.locator(".edge-pulse")).toHaveCount(0);
  await page.getByRole("slider", { name: "Intensidad luminosa" }).fill("0.5");
  expect(
    await page
      .locator(".living-app")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--glow")),
  ).toBe("0.5");
  await page
    .getByRole("button", { name: "Probar 40 nodos sintéticos" })
    .click();
  await page.waitForTimeout(300);
  await expect(page.locator(".orb-core")).toHaveCount(40);
  await expect(page.locator(".luminous-edge")).toHaveCount(39);
  await expect(page.locator(".synthetic-banner")).toContainText(
    "Sin evaluación matemática",
  );
  await expect(page.locator(".result-beacon")).not.toContainText("Verdadero");
  await page.screenshot({ path: "test-results/organic-synthetic-40.png" });
  await page.getByRole("button", { name: "Volver al árbol DEMO" }).click();
  await expect(page.locator(".orb-core")).toHaveCount(7);
  await expect(page.locator(".organic-node.state-true")).toHaveCount(7);
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
});

test("a complete playback reaches a justified result and records frame cadence", async ({
  page,
}, testInfo) => {
  test.setTimeout(35000);
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Velocidad de reproducción" })
    .selectOption("2");
  await page.getByRole("button", { name: "Animar demo" }).click();
  const measurements = await page.evaluate(
    () =>
      new Promise<{ samples: number; medianMs: number; p95Ms: number }>(
        (resolve) => {
          const values: number[] = [];
          const start = performance.now();
          let last = start;
          function sample(now: number) {
            values.push(now - last);
            last = now;
            if (now - start < 3000) requestAnimationFrame(sample);
            else {
              values.sort((a, b) => a - b);
              resolve({
                samples: values.length,
                medianMs: values[Math.floor(values.length * 0.5)],
                p95Ms: values[Math.floor(values.length * 0.95)],
              });
            }
          }
          requestAnimationFrame(sample);
        },
      ),
  );
  const metricsPath = testInfo.outputPath("frame-cadence.json");
  await writeFile(metricsPath, JSON.stringify(measurements, null, 2));
  await testInfo.attach("frame-cadence.json", {
    path: metricsPath,
    contentType: "application/json",
  });
  console.log("Playback frame cadence:", JSON.stringify(measurements));
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "7", {
    timeout: 20000,
  });
  await expect(page.locator(".timeline")).toHaveAttribute(
    "data-playing",
    "false",
    { timeout: 5000 },
  );
  await expect(page.locator(".organic-node.state-true")).toHaveCount(7);
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
});
