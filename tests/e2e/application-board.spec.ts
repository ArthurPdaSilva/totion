import { expect, test } from "@playwright/test";

async function createApplication(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.getByRole("button", { name: "Nova candidatura" }).click();
  await page.getByLabel("Nome da vaga").fill(name);
  await page.getByLabel("Aplicado em").fill("2026-08-16");
  await page.getByRole("button", { name: "Salvar candidatura" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("move uma candidatura para uma coluna vazia e persiste após recarregar", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await createApplication(page, "Desenvolvedor Front-end");

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  const closedColumn = page.getByRole("region", { name: "Encerrada" });
  const moveButton = appliedColumn.getByRole("button", {
    name: "Mover candidatura Desenvolvedor Front-end",
  });

  await expect(moveButton).toBeVisible();

  if (testInfo.project.name === "chromium-mobile") {
    await moveButton.dragTo(closedColumn);
  } else {
    const sourceBox = await moveButton.boundingBox();
    const targetBox = await closedColumn.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error("Não foi possível medir o card e a coluna de destino");
    }

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 12, sourceBox.y, {
      steps: 3,
    });
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height - 24,
      { steps: 20 },
    );
    await page.mouse.up();
  }

  const movedHandle = closedColumn.getByRole("button", {
    name: "Mover candidatura Desenvolvedor Front-end",
  });
  await expect(movedHandle).toBeVisible();
  await expect(movedHandle).toBeEnabled();
  await expect(closedColumn.getByLabel("1 candidatura")).toBeVisible();
  await expect(appliedColumn.getByLabel("0 candidaturas")).toBeVisible();

  await page.reload();

  await expect(
    page
      .getByRole("region", { name: "Encerrada" })
      .getByText("Desenvolvedor Front-end"),
  ).toBeVisible();
});

test("reordena candidaturas com o teclado e mantém a ordem", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "chromium-mobile",
    "Fluxo de teclado desktop",
  );
  await page.goto("/");
  await createApplication(page, "Primeira candidatura");
  await createApplication(page, "Segunda candidatura");

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  const firstHandle = appliedColumn.getByRole("button", {
    name: "Mover candidatura Primeira candidatura",
  });
  await firstHandle.press("Space");
  await expect(
    page.getByText("Você iniciou o movimento de Primeira candidatura."),
  ).toBeAttached();
  await firstHandle.press("ArrowDown");
  await expect(appliedColumn.locator("article h3")).toHaveText([
    "Segunda candidatura",
    "Primeira candidatura",
  ]);
  await firstHandle.press(" ");

  await expect(appliedColumn.locator("article h3")).toHaveText([
    "Segunda candidatura",
    "Primeira candidatura",
  ]);
  await expect(page.getByText("Movimento salvo.")).toBeAttached();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Aplicada" }).locator("article h3"),
  ).toHaveText(["Segunda candidatura", "Primeira candidatura"]);
});
