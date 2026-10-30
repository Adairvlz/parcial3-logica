import { test, expect, type Page } from "@playwright/test";
const formula = (page: Page) =>
  page.getByRole("textbox", { name: "Fórmula lógica", exact: true });
const evaluate = (page: Page) =>
  page.getByRole("button", { name: "Evaluar fórmula", exact: true }).click();

test("evaluates the original example with real evidence and isolates the demo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Evaluar", exact: true }).click();
  await expect(page).toHaveURL(/#\/evaluate$/);
  await expect(page.locator(".semantic-workspace")).toBeVisible();
  await expect(page.locator(".demo-workspace")).toBeHidden();
  await evaluate(page);
  await expect(page.locator(".engine-truth")).toContainText("Verdadero");
  await expect(page.locator(".engine-truth")).toContainText("MOTOR REAL");
  await expect(page.locator(".evidence-body").first()).toContainText(
    "Casos comprobados: 3",
  );
  await page.locator(".evidence-body .evidence-toggle").first().click();
  await expect(page.locator(".evidence-finding").first()).toContainText(
    "Testigo: y = b",
  );
  await page
    .getByRole("button", { name: "Volver al árbol DEMO", exact: true })
    .click();
  await expect(page.locator(".demo-workspace")).toBeVisible();
  await expect(page.locator(".semantic-workspace")).toBeHidden();
});

test("false is distinct from invalid and edits immediately clear results", async ({
  page,
}) => {
  await page.goto("/#/evaluate");
  await formula(page).fill("∃x P(x,x)");
  await evaluate(page);
  await expect(page.locator(".engine-truth")).toContainText("Falso");
  await expect(page.locator(".engine-explanation")).toContainText(
    "no existe testigo",
  );
  await page
    .getByRole("textbox", { name: "Interpretación del símbolo 1" })
    .fill("");
  await expect(page.locator(".engine-truth")).toHaveCount(0);
  await evaluate(page);
  await expect(
    page.getByRole("heading", { name: "Entrada inválida" }),
  ).toBeVisible();
  await expect(page.locator(".diagnostics")).toContainText(
    "relación sea no vacía",
  );
  await expect(page.locator(".engine-truth")).toHaveCount(0);
});

test("detects free variables, requests assignments and preserves scope", async ({
  page,
}) => {
  await page.goto("/#/evaluate");
  await formula(page).fill("P(x,y)");
  await evaluate(page);
  await expect(
    page.getByRole("heading", { name: "Fórmula abierta" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Asignación de x" })
    .selectOption("a");
  await page
    .getByRole("combobox", { name: "Asignación de y" })
    .selectOption("b");
  await evaluate(page);
  await expect(page.locator(".engine-truth")).toContainText("Verdadero");
  await page
    .getByRole("combobox", { name: "Asignación de y" })
    .selectOption("a");
  await expect(page.locator(".engine-truth")).toHaveCount(0);
  await evaluate(page);
  await expect(page.locator(".engine-truth")).toContainText("Falso");
  await formula(page).fill("∀x ∃y P(x,y)");
  await evaluate(page);
  await expect(
    page.getByRole("combobox", { name: "Asignación de x" }),
  ).toHaveCount(0);
  await expect(page.locator(".engine-truth")).toContainText("Verdadero");
});

test("configures functions and constants, rejects incomplete and contradictory tables", async ({
  page,
}) => {
  await page.goto("/#/evaluate");
  await page.getByRole("button", { name: "Añadir símbolo" }).click();
  await page
    .getByRole("combobox", { name: "Tipo del símbolo 2" })
    .selectOption("function");
  await page.getByRole("textbox", { name: "Nombre del símbolo 2" }).fill("f");
  await page
    .getByRole("textbox", { name: "Interpretación del símbolo 2" })
    .fill("(a) -> b\n(b) -> c\n(c) -> a");
  await page.getByRole("button", { name: "Añadir símbolo" }).click();
  await page
    .getByRole("combobox", { name: "Tipo del símbolo 3" })
    .selectOption("function");
  await page.getByRole("textbox", { name: "Nombre del símbolo 3" }).fill("c");
  await page
    .getByRole("spinbutton", { name: "Aridad del símbolo 3" })
    .fill("0");
  await page
    .getByRole("textbox", { name: "Interpretación del símbolo 3" })
    .fill("() -> a");
  await formula(page).fill("P(c, f(c))");
  await evaluate(page);
  await expect(page.locator(".engine-truth")).toContainText("Verdadero");
  await page
    .getByRole("textbox", { name: "Interpretación del símbolo 2" })
    .fill("(a) -> b");
  await evaluate(page);
  await expect(page.locator(".diagnostics")).toContainText("debe ser total");
  await page
    .getByRole("textbox", { name: "Interpretación del símbolo 2" })
    .fill("(a) -> b\n(a) -> c\n(b) -> c\n(c) -> a");
  await evaluate(page);
  await expect(page.locator(".diagnostics")).toContainText("duplicada");
});

test("syntax diagnostics select the offending source and inputs survive navigation", async ({
  page,
}) => {
  await page.goto("/#/evaluate");
  await formula(page).fill("P(x,y) & P(y,x)");
  await evaluate(page);
  await page.getByRole("button", { name: /Seleccionar posición/ }).click();
  await expect(formula(page)).toBeFocused();
  expect(
    await formula(page).evaluate((el: HTMLTextAreaElement) =>
      el.value.slice(el.selectionStart, el.selectionEnd),
    ),
  ).toBe("&");
  await page.getByRole("textbox", { name: "Dominio finito" }).fill("a, b");
  await page
    .getByRole("button", { name: "Volver al árbol DEMO", exact: true })
    .click();
  await page.getByRole("button", { name: "Evaluar", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Dominio finito" }),
  ).toHaveValue("a, b");
  await expect(formula(page)).toHaveValue("P(x,y) & P(y,x)");
});

test("semantic workspace remains usable at desktop and mobile sizes without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const size of [
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/#/evaluate");
    await evaluate(page);
    await expect(page.locator(".engine-truth")).toContainText("Verdadero");
    expect(
      await page
        .locator(".semantic-workspace")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/semantic-${size.width}.png`,
      fullPage: true,
    });
    await page.locator(".engine-truth").scrollIntoViewIfNeeded();
    await expect(page.locator(".engine-truth")).toBeInViewport();
    await page.screenshot({
      path: `test-results/semantic-result-${size.width}.png`,
    });
  }
  expect(errors).toEqual([]);
});
