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
  await page
    .getByRole("button", { name: "Fechar notificação" })
    .first()
    .click();
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

test("move pelo teclado para uma coluna vazia e mantém o foco", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "chromium-mobile",
    "Fluxo de teclado desktop",
  );
  await page.goto("/");
  await createApplication(page, "Analista de qualidade");

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  const progressColumn = page.getByRole("region", { name: "Em andamento" });
  const sourceHandle = appliedColumn.getByRole("button", {
    name: "Mover candidatura Analista de qualidade",
  });

  await sourceHandle.press("Space");
  await sourceHandle.press("ArrowRight");

  const destinationHandle = progressColumn.getByRole("button", {
    name: "Mover candidatura Analista de qualidade",
  });
  await expect(destinationHandle).toBeFocused();
  await expect(
    page.getByText("Posição 1 de 1 em Em andamento."),
  ).toBeAttached();
  await destinationHandle.press(" ");
  await expect(page.getByText("Movimento salvo.")).toBeAttached();

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Em andamento" })
      .getByText("Analista de qualidade"),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Aplicada" }).getByLabel("0 candidaturas"),
  ).toBeVisible();
});

test("altera o status pelo formulário e persiste após recarregar", async ({
  page,
}) => {
  await page.goto("/");
  await createApplication(page, "Pessoa desenvolvedora mobile");

  await page
    .getByRole("button", {
      name: "Editar candidatura Pessoa desenvolvedora mobile",
    })
    .click();
  await page.getByLabel("Status").selectOption("closed");
  await page.getByLabel(/Anotações/).fill("Processo encerrado");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const closedColumn = page.getByRole("region", { name: "Encerrada" });
  await expect(
    closedColumn.getByText("Pessoa desenvolvedora mobile"),
  ).toBeVisible();
  await expect(closedColumn.getByLabel("1 candidatura")).toBeVisible();

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Encerrada" })
      .getByText("Pessoa desenvolvedora mobile"),
  ).toBeVisible();
});

test("exclui uma candidatura e mantém a exclusão após recarregar", async ({
  page,
}) => {
  await page.goto("/");
  await createApplication(page, "Candidatura temporária");

  await page
    .getByRole("button", {
      name: "Excluir candidatura Candidatura temporária",
    })
    .click();
  const confirmationDialog = page.getByRole("dialog", {
    name: "Excluir candidatura?",
  });
  await confirmationDialog
    .getByRole("button", { name: "Excluir candidatura" })
    .click();
  await expect(confirmationDialog).toBeHidden();
  await expect(page.getByText("Candidatura temporária")).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Candidatura temporária")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Aplicada" }).getByLabel("0 candidaturas"),
  ).toBeVisible();
});

test("mantém o quadro navegável no desktop e no mobile", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await createApplication(page, "Validação responsiva");
  if (testInfo.project.name === "chromium-mobile") {
    await createApplication(page, "Segunda validação responsiva");
    await createApplication(page, "Terceira validação responsiva");
    await createApplication(page, "Quarta validação responsiva");
  }

  const board = page.getByRole("region", { name: "Quadro de candidaturas" });
  const closedColumn = page.getByRole("region", { name: "Encerrada" });
  await expect(board).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  if (testInfo.project.name === "chromium-mobile") {
    const dimensions = await board.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);

    await board.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect(closedColumn).toBeInViewport();

    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
  } else {
    await expect(
      page.getByRole("region", { name: "Aplicada" }),
    ).toBeInViewport();
    await expect(
      page.getByRole("region", { name: "Em andamento" }),
    ).toBeInViewport();
    await expect(closedColumn).toBeInViewport();
  }
});

test("restaura um backup próprio após revisar as três colunas", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Backup" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar 0 candidaturas" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^totion-backup-\d{4}-\d{2}-\d{2}\.totion$/,
  );
  await page
    .getByLabel("Arquivo Totion")
    .setInputFiles("tests/fixtures/applications-backup.totion");

  await expect(page.getByText("Conteúdo do backup")).toBeVisible();
  await page
    .getByLabel("Entendo que o quadro atual será substituído por este backup.")
    .check();
  await page.getByRole("button", { name: "Restaurar 3 candidaturas" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(
    page
      .getByRole("region", { name: "Aplicada" })
      .getByText("Pessoa Engenheira de Plataforma"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Encerrada" })
      .getByText("Pessoa Desenvolvedora Mobile"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Em andamento" })
      .getByText("Pessoa Analista de Produto"),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText("Pessoa Engenheira de Plataforma")).toBeVisible();
  await expect(page.getByText("Pessoa Analista de Produto")).toBeVisible();
  await expect(page.getByText("Pessoa Desenvolvedora Mobile")).toBeVisible();
});

test("quebra nomes longos sem ultrapassar os limites do card", async ({
  page,
}) => {
  await page.goto("/");
  const longName = `Frontend-${"endereco-sem-espacos-".repeat(12)}`;
  await createApplication(page, longName);

  const card = page
    .getByRole("region", { name: "Aplicada" })
    .getByRole("article");
  const dimensions = await card.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
