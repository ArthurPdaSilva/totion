import { expect, type Locator, type Page, test } from "@playwright/test";

async function createApplication(
  page: Page,
  name: string,
  status: "applied" | "in_progress" | "closed" = "applied",
) {
  await page.getByRole("button", { name: "Nova candidatura" }).click();
  await page.getByLabel("Nome da vaga").fill(name);
  await page.getByLabel("Aplicado em").fill("2026-08-16");
  if (status !== "applied") {
    await page.getByLabel("Status").selectOption(status);
  }
  await page.getByRole("button", { name: "Salvar candidatura" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page
    .getByRole("button", { name: "Fechar notificação" })
    .first()
    .click();
}

async function dragApplicationToColumn(
  page: Page,
  moveButton: Locator,
  targetColumn: Locator,
  projectName: string,
) {
  if (projectName === "chromium-mobile") {
    await moveButton.dragTo(targetColumn);
    return;
  }

  await targetColumn.evaluate((element) => {
    element.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
  await expect(moveButton).toBeInViewport();
  await expect(targetColumn).toBeInViewport();
  const sourceBox = await moveButton.boundingBox();
  const targetBox = await targetColumn.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("Não foi possível medir o card e a coluna de destino");
  }

  await dragApplicationToPoint(
    page,
    moveButton,
    targetBox.x + targetBox.width / 2,
    targetBox.y + 120,
  );
}

async function dragApplicationToPoint(
  page: Page,
  moveButton: Locator,
  targetX: number,
  targetY: number,
) {
  const sourceBox = await moveButton.boundingBox();

  if (!sourceBox) {
    throw new Error("Não foi possível medir o card de origem");
  }

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 12, sourceBox.y, {
    steps: 3,
  });
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.mouse.up();
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
  await dragApplicationToColumn(
    page,
    moveButton,
    closedColumn,
    testInfo.project.name,
  );

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

test("move uma candidatura para Em andamento em 1280px com destino ocupado", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "chromium-mobile",
    "Cobertura específica do layout desktop abaixo de 1440px",
  );
  await page.goto("/");
  expect(page.viewportSize()?.width).toBe(1280);

  await createApplication(page, "Produto existente", "in_progress");
  await createApplication(page, "Analista de produto");

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  const progressColumn = page.getByRole("region", { name: "Em andamento" });
  const moveButton = appliedColumn.getByRole("button", {
    name: "Mover candidatura Analista de produto",
  });
  await dragApplicationToColumn(
    page,
    moveButton,
    progressColumn,
    testInfo.project.name,
  );

  await expect(progressColumn.getByText("Analista de produto")).toBeVisible();
  await expect(progressColumn.getByLabel("2 candidaturas")).toBeVisible();
  await expect(appliedColumn.getByLabel("0 candidaturas")).toBeVisible();

  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Em andamento" })
      .getByText("Analista de produto"),
  ).toBeVisible();
});

test("insere o card logo após o primeiro card da coluna de destino", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "chromium-mobile",
    "Cobertura específica do gesto de mouse",
  );
  await page.goto("/");
  await createApplication(page, "Encerrada 1", "closed");
  await createApplication(page, "Encerrada 2", "closed");
  await createApplication(page, "Encerrada 3", "closed");
  await createApplication(page, "Movida de aplicada");

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  const closedColumn = page.getByRole("region", { name: "Encerrada" });
  const moveButton = appliedColumn.getByRole("button", {
    name: "Mover candidatura Movida de aplicada",
  });
  const firstClosedCard = closedColumn.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Encerrada 1" }),
  });
  await firstClosedCard.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await expect(moveButton).toBeInViewport();
  await expect(firstClosedCard).toBeInViewport();
  const targetBox = await firstClosedCard.boundingBox();

  if (!targetBox) {
    throw new Error("Não foi possível medir o primeiro card de destino");
  }

  await dragApplicationToPoint(
    page,
    moveButton,
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height + 4,
  );

  await expect(closedColumn.locator("article h3")).toHaveText([
    "Encerrada 1",
    "Movida de aplicada",
    "Encerrada 2",
    "Encerrada 3",
  ]);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Encerrada" }).locator("article h3"),
  ).toHaveText([
    "Encerrada 1",
    "Movida de aplicada",
    "Encerrada 2",
    "Encerrada 3",
  ]);
});

test("move o primeiro card para depois do segundo na mesma coluna", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "chromium-mobile",
    "Cobertura específica do gesto de mouse",
  );
  await page.goto("/");
  await createApplication(page, "Primeira aplicada");
  await createApplication(page, "Segunda aplicada");

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  const moveButton = appliedColumn.getByRole("button", {
    name: "Mover candidatura Primeira aplicada",
  });
  const secondCard = appliedColumn.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Segunda aplicada" }),
  });
  await secondCard.evaluate((element) => {
    element.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await expect(moveButton).toBeInViewport();
  await expect(secondCard).toBeInViewport();
  const targetBox = await secondCard.boundingBox();

  if (!targetBox) {
    throw new Error("Não foi possível medir o segundo card");
  }

  await dragApplicationToPoint(
    page,
    moveButton,
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height * 0.75,
  );

  await expect(appliedColumn.locator("article h3")).toHaveText([
    "Segunda aplicada",
    "Primeira aplicada",
  ]);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Aplicada" }).locator("article h3"),
  ).toHaveText(["Segunda aplicada", "Primeira aplicada"]);
});

test("cancela o movimento quando o card é solto fora das colunas de status", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "chromium-mobile",
    "Cobertura específica do gesto de mouse",
  );
  await page.goto("/");
  await createApplication(page, "Candidatura mantida");

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  const progressColumn = page.getByRole("region", { name: "Em andamento" });
  const portalsColumn = page.getByRole("region", { name: "Portais de Vagas" });
  const moveButton = appliedColumn.getByRole("button", {
    name: "Mover candidatura Candidatura mantida",
  });
  const sourceBox = await moveButton.boundingBox();
  const progressBox = await progressColumn.boundingBox();
  const portalsBox = await portalsColumn.boundingBox();

  if (!sourceBox || !progressBox || !portalsBox) {
    throw new Error("Não foi possível medir o quadro para cancelar o drag");
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
    progressBox.x + progressBox.width / 2,
    progressBox.y + 120,
    { steps: 12 },
  );
  await page.mouse.move(
    portalsBox.x + portalsBox.width / 2,
    portalsBox.y + 120,
    { steps: 12 },
  );
  await page.mouse.up();

  await expect(appliedColumn.getByText("Candidatura mantida")).toBeVisible();
  await expect(appliedColumn.getByLabel("1 candidatura")).toBeVisible();
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
}, testInfo) => {
  await page.goto("/");
  await createApplication(page, "Pessoa desenvolvedora mobile");

  const applicationCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Pessoa desenvolvedora mobile" }),
  });
  if (testInfo.project.name === "chromium-desktop") {
    await applicationCard.hover();
  }
  await applicationCard
    .getByRole("button", {
      name: "Editar candidatura Pessoa desenvolvedora mobile",
    })
    .click();
  await page.getByLabel("Status").selectOption("closed");
  await page
    .getByRole("textbox", { name: "Anotações (opcional)" })
    .fill("Processo encerrado");
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
}, testInfo) => {
  await page.goto("/");
  await createApplication(page, "Candidatura temporária");

  const applicationCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Candidatura temporária" }),
  });
  if (testInfo.project.name === "chromium-desktop") {
    await applicationCard.hover();
  }
  await applicationCard
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
    const dimensions = await board.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect
      .poll(async () =>
        board.evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true);
    await expect(
      page.getByRole("region", { name: "Portais de Vagas" }),
    ).toBeInViewport();
    await expect(
      page.getByRole("region", { name: "Aplicada" }),
    ).toBeInViewport();
    await expect(
      page.getByRole("region", { name: "Em andamento" }),
    ).toBeInViewport();
    await expect(closedColumn).toBeInViewport();
    await expect(
      page.getByRole("region", { name: "Anotações" }),
    ).toBeInViewport();
  }
});

test("restaura um backup próprio após revisar as três colunas", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Backup" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup completo" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^totion-backup-\d{4}-\d{2}-\d{2}\.totion$/,
  );
  await page
    .getByLabel("Arquivo Totion")
    .setInputFiles("tests/fixtures/applications-backup.totion");

  await expect(page.getByText("Conteúdo do backup")).toBeVisible();
  await page
    .getByLabel(
      "Entendo que todos os dados atuais serão substituídos por este backup.",
    )
    .check();
  await page.getByRole("button", { name: "Restaurar backup completo" }).click();
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

test("carrega mais cards e inicia o drag sem reordenar em ciclo", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Backup" }).click();
  const applications = Array.from({ length: 7 }, (_, position) => ({
    id: `application-${position + 1}`,
    name: `Vaga virtualizada ${position + 1}`,
    status: "applied",
    appliedAt: "2026-08-16",
    jobUrl: null,
    notes: null,
    position,
    createdAt: "2026-08-16T12:00:00.000Z",
    updatedAt: "2026-08-16T12:00:00.000Z",
  }));
  await page.getByLabel("Arquivo Totion").setInputFiles({
    name: "candidaturas-virtualizadas.totion",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "totion",
        version: 1,
        exportedAt: "2026-08-16T15:00:00.000Z",
        applications,
      }),
    ),
  });
  await page
    .getByLabel(
      "Entendo que todos os dados atuais serão substituídos por este backup.",
    )
    .check();
  await page.getByRole("button", { name: "Restaurar backup completo" }).click();

  const appliedColumn = page.getByRole("region", { name: "Aplicada" });
  await expect(appliedColumn.getByRole("article")).toHaveCount(5);
  await expect(appliedColumn.getByText("Mostrando 5 de 7")).toBeAttached();
  await appliedColumn.getByText("Mostrando 5 de 7").scrollIntoViewIfNeeded();

  await expect(appliedColumn.getByRole("article")).toHaveCount(7);
  await expect(appliedColumn.getByText("Vaga virtualizada 7")).toBeVisible();

  if (testInfo.project.name === "chromium-desktop") {
    const firstMoveButton = appliedColumn.getByRole("button", {
      name: "Mover candidatura Vaga virtualizada 1",
    });
    await firstMoveButton.scrollIntoViewIfNeeded();
    const sourceBox = await firstMoveButton.boundingBox();

    if (!sourceBox) {
      throw new Error("Não foi possível medir o card para iniciar o drag");
    }

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 12, sourceBox.y, {
      steps: 3,
    });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Toda oportunidade merece um próximo passo.",
      }),
    ).toBeVisible();
    await expect(appliedColumn.locator("article h3")).toHaveText(
      applications.map((application) => application.name),
    );

    await page.keyboard.press("Escape");
    await page.mouse.up();
  }
});

test("gerencia recursos, busca em todas as listas e persiste o tema", async ({
  page,
}) => {
  await page.goto("/");
  const portalsColumn = page.getByRole("region", { name: "Portais de Vagas" });
  await portalsColumn.getByRole("button", { name: "Adicionar portal" }).click();
  await page.getByLabel("Nome do portal").fill("LinkedIn Jobs");
  await page.getByLabel("Link do portal").fill("https://www.linkedin.com/jobs");
  await page.getByRole("button", { name: "Salvar portal" }).click();
  await expect(portalsColumn.getByText("LinkedIn Jobs")).toBeVisible();
  await expect(portalsColumn.getByRole("link")).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await expect(
    portalsColumn.getByRole("button", { name: /Mover/ }),
  ).toHaveCount(0);

  const notesColumn = page.getByRole("region", { name: "Anotações" });
  await notesColumn.getByRole("button", { name: "Nova anotação" }).click();
  await page.getByLabel("Título (opcional)").fill("Revisar currículo");
  await page.getByLabel("Conteúdo").fill("Antes da entrevista");
  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await expect(notesColumn.getByText("Revisar currículo")).toBeVisible();

  await page
    .getByRole("searchbox", { name: "Buscar em todo o Totion" })
    .fill("curriculo");
  await expect(
    page.getByText("1 resultado encontrado.", { exact: false }),
  ).toBeVisible();
  await expect(notesColumn.getByText("Revisar currículo")).toBeVisible();
  await expect(portalsColumn.getByText("LinkedIn Jobs")).toHaveCount(0);

  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: "Ativar tema claro" }),
  ).toBeVisible();
  await expect(page.getByText("LinkedIn Jobs")).toBeAttached();
  await expect(page.getByText("Revisar currículo")).toBeAttached();
});

test("quebra nomes longos sem ultrapassar os limites do card", async ({
  page,
}, testInfo) => {
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
  const cardBox = await card.boundingBox();
  const titleBox = await card.getByRole("heading", { level: 3 }).boundingBox();
  const actionButtons = card.getByRole("button");
  const actionBoxes = await actionButtons.evaluateAll((buttons) =>
    buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      return { bottom: bounds.bottom, right: bounds.right };
    }),
  );
  const actions = card.locator(".application-card-actions");

  if (!cardBox || !titleBox) {
    throw new Error("Não foi possível medir o card de candidatura");
  }

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(titleBox.y).toBeLessThan(
    Math.max(...actionBoxes.map(({ bottom }) => bottom)),
  );
  expect(
    Math.max(...actionBoxes.map(({ right }) => right)),
  ).toBeLessThanOrEqual(cardBox.x + cardBox.width);
  if (testInfo.project.name === "chromium-desktop") {
    await expect(actions).toHaveCSS("opacity", "0");
    await card.hover();
  }
  await expect(actions).toHaveCSS("opacity", "1");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
