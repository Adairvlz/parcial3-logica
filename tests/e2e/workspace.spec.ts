import { test, expect, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const scrub = async (page: Page, time: number) =>
  page
    .getByRole("slider", { name: "Tiempo de reproducción" })
    .fill(String(time));

test("the evaluator is the entry and the tabs switch views with history", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".semantic-workspace")).toBeVisible();
  await expect(page.locator(".tree-workspace")).toBeHidden();
  await page.getByRole("link", { name: "Árbol", exact: true }).click();
  await expect(page).toHaveURL(/#\/laboratory$/);
  await expect(page.locator(".orb-core")).toHaveCount(10);
  await expect(page.locator(".luminous-edge")).toHaveCount(9);
  await expect(page.locator(".semantic-workspace")).toBeHidden();
  await page.getByRole("link", { name: "Evaluador", exact: true }).click();
  await expect(page.locator(".semantic-workspace")).toBeVisible();
  await page.goBack();
  await expect(page.locator(".tree-workspace")).toBeVisible();
});

test("selection highlights only the ancestor route and inspector shows the true witness", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  await page.locator('[data-id="r.1.2"]').click();
  await expect(page.locator(".inspector-formula")).toHaveText("P(b,c)");
  await expect(page.locator(".explanation")).toContainText("(b, c)");
  await expect(page.locator(".edge-active")).toHaveCount(2);
  await expect(page.locator(".on-path")).toHaveCount(3);
  await expect(page.locator(".decisive")).toContainText("y = c");
  await page.getByRole("button", { name: "∀", exact: true }).click();
  await expect(page.locator(".inspector-formula")).toHaveText("∀x ∃y P(x,y)");
  await page.getByRole("button", { name: "Cerrar inspector" }).click();
  await expect(page.locator(".inspector")).toHaveCount(0);
});

test("formula cursor, symbols and a tree that never outlives its result", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox", { name: "Fórmula lógica" });
  await input.fill("P(x) # Q(x)");
  await input.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 6));
  await page.getByRole("button", { name: "Insertar ∧" }).click();
  await expect(input).toHaveValue("P(x) ∧ Q(x)");
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((el: HTMLTextAreaElement) => el.selectionStart),
  ).toBe(6);
  await page.getByRole("link", { name: "Árbol", exact: true }).click();
  await expect(page.locator(".orb-core")).toHaveCount(0);
  await expect(page.locator(".canvas-empty")).toContainText(
    "Sin evaluación vigente",
  );
  await page.getByRole("link", { name: "Ir al Evaluador" }).click();
  await expect(input).toHaveValue("P(x) ∧ Q(x)");
  await page.getByRole("button", { name: "Restaurar ejemplo" }).click();
  await expect(input).toHaveValue("∀x ∃y P(x,y)");
  await page.getByRole("button", { name: "Evaluar fórmula" }).click();
  await page.getByRole("link", { name: "Árbol", exact: true }).click();
  await expect(page.locator(".orb-core")).toHaveCount(10);
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
});

test("the tree shows the engine's result for any formula, false included", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Fórmula lógica" })
    .fill("∀x ∀y P(x,y)");
  await page.getByRole("button", { name: "Evaluar fórmula" }).click();
  await page.getByRole("button", { name: /Ver razonamiento/ }).click();
  await expect(page).toHaveURL(/#\/laboratory$/);
  // The button starts the replay from the root.
  await expect(page.locator(".timeline")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await expect(page.locator(".result-beacon")).not.toContainText("Falso");
  await scrub(page, 9300);
  await expect(page.locator(".active-formula")).toHaveText("∀x ∀y P(x,y)");
  await expect(page.locator(".orb-core")).toHaveCount(3);
  await expect(page.locator(".organic-node.state-false")).toHaveCount(3);
  await expect(page.locator(".role-counterexample")).toHaveCount(2);
  await expect(page.locator('[data-id="r.0.0"]')).toContainText("CONTRAEJEMPLO");
  await expect(page.locator(".result-beacon")).toContainText("Falso");
  await page.locator('[data-id="r"]').click();
  await expect(page.locator(".decisive")).toContainText("x = a");
  await expect(page.locator(".inspector")).toContainText("Falso");
});

test("the whole tree is drawn, and branches fold and reopen with one click", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  await expect(page.locator(".orb-core")).toHaveCount(10);
  const expander = page.locator('[data-id="r.0"] .orb-expander');
  await expander.click();
  await expect(page.locator(".orb-core")).toHaveCount(8);
  await expect(expander).toHaveText("+2");
  await expander.click();
  await expect(page.locator(".orb-core")).toHaveCount(10);
  await expect(page.locator('[data-id="r.0.0"]')).toContainText("P(a,a)");
  await expect(
    page.locator('[data-id="r.0.0"] .organic-node'),
  ).toHaveAttribute("data-state", "false");
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
  await page.locator('[data-id="r"]').click();
  await expect(page.locator(".decisive")).toContainText("COMPROBACIÓN COMPLETA");
  await expect(page.locator(".decisive")).toContainText("a V · b V · c V");
  await page.getByRole("button", { name: "Colapsar esta rama" }).click();
  await expect(page.locator(".orb-core")).toHaveCount(1);
});

test("play, pause, speed, restart, previous, next and rapid seeks are deterministic", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
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
  await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await page
    .getByRole("button", { name: "Paso siguiente", exact: true })
    .click();
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "1");
  await page
    .getByRole("button", { name: "Paso anterior", exact: true })
    .click();
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "0");
  for (const time of [19000, 1000, 13000, 7000, 0, 26000, 10000])
    await scrub(page, time);
  await expect(page.locator('[data-id="r.0"] .organic-node')).toHaveAttribute(
    "data-state",
    "true",
  );
  await expect(page.locator('[data-id="r.1"] .organic-node')).toHaveAttribute(
    "data-state",
    "running",
  );
  await expect(page.locator('[data-id="r"] .organic-node')).toHaveAttribute(
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
  await page.goto("/#/laboratory");
  await scrub(page, 1900);
  const growth = Number(
    await page
      .locator('[data-id="r-r.0"] .luminous-edge')
      .getAttribute("data-growth"),
  );
  expect(growth).toBeGreaterThan(0);
  expect(growth).toBeLessThan(1);
  await expect(
    page.locator('.edge-pulse[data-direction="to-child"]').first(),
  ).toBeVisible();
  await scrub(page, 6500);
  await expect(page.locator('[data-id="r.0.1"] .organic-node')).toHaveAttribute(
    "data-state",
    "true",
  );
  await expect(page.locator('[data-id="r.0"] .organic-node')).toHaveAttribute(
    "data-state",
    "running",
  );
  const pulse = page
    .locator('[data-id="r.0-r.0.1"] .edge-pulse circle')
    .last();
  const x = await pulse.getAttribute("cx");
  await page.waitForTimeout(250);
  expect(await pulse.getAttribute("cx")).toBe(x);
  await scrub(page, 22900);
  await expect(
    page.locator('.edge-pulse[data-direction="to-parent"]'),
  ).toHaveCount(1);
  await expect(page.locator(".result-beacon")).not.toContainText("Verdadero");
  await scrub(page, 24000);
  await expect(page.locator(".result-beacon")).toContainText("Verdadero");
});

test("camera follows, yields to manual zoom and pan, and fits the tree", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  await page.getByRole("button", { name: "Animar razonamiento" }).click();
  await page.waitForTimeout(1100);
  const viewport = page.locator(".react-flow__viewport");
  const start = await viewport.getAttribute("style");
  await scrub(page, 6200);
  await page.waitForTimeout(1100);
  expect(await viewport.getAttribute("style")).not.toBe(start);
  await page.getByRole("button", { name: "Acercar", exact: true }).click();
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
  await scrub(page, 26000);
  for (const id of ["r", "r.0.1", "r.1.2", "r.2.0"]) {
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

test("keyboard node selection and pending inspector do not leak future truth", async ({
  page,
}) => {
  await page.goto("/#/laboratory");
  await page.locator('[data-id="r.2.0"]').focus();
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
    await page.goto("/#/laboratory");
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
    for (const id of ["r", "r.0.1", "r.1.2", "r.2.0"]) {
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

test("a complete playback reaches a justified result and records frame cadence", async ({
  page,
}, testInfo) => {
  test.setTimeout(35000);
  await page.goto("/#/laboratory");
  await page
    .getByRole("combobox", { name: "Velocidad de reproducción" })
    .selectOption("2");
  await page.getByRole("button", { name: "Animar razonamiento" }).click();
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
  await expect(page.locator(".timeline")).toHaveAttribute("data-step", "20", {
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
