# Totion

Aplicação web para candidatos organizarem vagas e acompanharem cada candidatura em um quadro visual, com uma experiência inspirada no Notion e focada no processo de busca por emprego.

## Situação Do Projeto

O projeto possui sua primeira fatia vertical implementada. A aplicação exibe o quadro responsivo com os três status, permite cadastrar candidaturas por um formulário validado, excluir com confirmação e persiste os registros no IndexedDB do navegador.

Edição, drag-and-drop e importação ainda não foram implementados.

O repositório contém um CSV exportado do quadro usado atualmente no Notion. Ele servirá como referência de dados e, em uma etapa posterior, como origem para uma funcionalidade de importação.

## Objetivo

Centralizar as informações essenciais de cada vaga e permitir que o candidato visualize rapidamente o andamento de suas candidaturas, sem misturar esse fluxo com os recursos genéricos de uma ferramenta de notas.

## Escopo Do MVP

### Quadro De Candidaturas

O quadro terá três colunas fixas:

1. Aplicada
2. Em andamento
3. Encerrada

Cada coluna exibirá a quantidade de candidaturas no status correspondente.

O usuário poderá:

- Criar, visualizar, editar e excluir uma candidatura.
- Arrastar uma candidatura entre colunas para alterar seu status.
- Reordenar candidaturas dentro da mesma coluna.
- Abrir o link da vaga em uma nova aba.
- Usar o quadro em telas desktop e mobile.

### Dados Da Candidatura

Cada candidatura terá:

- Nome da vaga.
- Status.
- Data da aplicação.
- Link da vaga.
- Anotações livres.

Nome, status e data da aplicação são obrigatórios. O link e as anotações são opcionais. Quando informado, o link deve ser uma URL válida com protocolo `http` ou `https`.

### Drag-And-Drop

- Soltar um card em outra coluna atualiza seu status imediatamente.
- Soltar um card em outra posição da mesma coluna atualiza sua ordem.
- A nova posição e o novo status devem ser persistidos juntos.
- Durante o arraste, o card de origem, o destino e a posição de inserção devem ter retorno visual claro.
- Teclado e controles de toque devem oferecer uma alternativa funcional ao uso do mouse.
- Se uma atualização falhar, a interface deve restaurar a posição anterior e informar o erro.

## Regras De Negócio

- Os únicos status do MVP são `applied`, `in_progress` e `closed`.
- Toda candidatura pertence a exatamente um status.
- A ordem dos cards é independente em cada status e deve sobreviver ao recarregamento da página.
- A data da aplicação representa um dia no calendário, não um instante; ela deve ser persistida no formato `YYYY-MM-DD` para evitar mudanças causadas por fuso horário.
- Excluir uma candidatura exige confirmação.
- Campos de texto devem ser normalizados nas extremidades, sem remover quebras ou espaços intencionais no conteúdo das anotações.
- Links externos devem abrir com proteção contra acesso à página de origem.
- Um card deve continuar editável depois de movido ou reordenado.

## Persistência Inicial

O MVP será local-first e não terá backend, conta de usuário ou sincronização. Os dados serão armazenados no IndexedDB do navegador.

Essa decisão permite validar a experiência principal antes de assumir custos de infraestrutura. Até que exista exportação ou sincronização, limpar os dados do navegador pode remover todas as candidaturas.

## Tecnologias

- React com TypeScript.
- Vite para desenvolvimento e build.
- Tailwind CSS com tokens semânticos definidos em CSS.
- Dexie para acesso tipado ao IndexedDB e migrations.
- React Hook Form para formulários.
- Zod para validação e contratos.
- Vitest e React Testing Library para testes unitários e de componentes.
- Biome para lint e formatação.
- npm como gerenciador de pacotes.

Integrações previstas para as próximas etapas:

- `@dnd-kit` para drag-and-drop acessível.
- Playwright para os fluxos críticos no navegador.

Bibliotecas adicionais só devem ser incluídas quando houver uma necessidade concreta. Estado global de interface não deve ser adicionado enquanto estado local e composição de componentes forem suficientes.

## Estrutura Atual

```text
src/
  app/                    # Composição e teste do fluxo principal
  features/
    applications/         # Quadro, cards, formulário, validação e regras
  database/
    migrations/           # Versões do banco local
    repositories/         # Leitura e persistência no IndexedDB
  shared/
    utils/                # Funções puras e utilitários
  styles/                 # Tokens e estilos globais
  test/                   # Configuração do ambiente de testes
```

Componentes não devem acessar o IndexedDB diretamente. A persistência ficará nos repositories, e as operações que alteram status e ordem serão coordenadas por um serviço de domínio.

## Modelo De Dados

### `applications`

- `id`: identificador único.
- `name`: nome da vaga.
- `status`: `applied`, `in_progress` ou `closed`.
- `appliedAt`: data no formato `YYYY-MM-DD`.
- `jobUrl`: link opcional da vaga.
- `notes`: anotações opcionais.
- `position`: chave usada para ordenar o card dentro do status.
- `createdAt`: instante de criação.
- `updatedAt`: instante da última alteração.

O schema inicial é criado por migration. A posição de uma nova candidatura é calculada e persistida na mesma transação do IndexedDB.

## Direção Visual

- Interface limpa e densa o suficiente para visualizar várias candidaturas.
- Identidade própria; a referência ao Notion é de interação, não de cópia visual.
- Cada status terá cor de apoio distinta, mantendo contraste adequado.
- Cards devem priorizar nome, data e acesso ao link sem exibir anotações longas por completo.
- No mobile, as colunas poderão ser navegadas horizontalmente sem quebrar o drag-and-drop.
- Estados de foco, hover, arraste, vazio, carregamento e erro devem ser explícitos.
- A interface e todas as mensagens apresentadas ao usuário serão em português brasileiro.

## Importação Do Quadro Atual

O arquivo `Candidaturas d53846254da9471c88ab8f81817a9505_all.csv` não deve ser carregado automaticamente nem usado em testes como fixture integral, pois contém dados reais.

A importação será implementada após o CRUD e o quadro estarem estáveis. Ela deverá:

- Exibir uma prévia antes de gravar.
- Mapear `Name`, `Aplicado em`, `Link` e `Status` para o modelo atual.
- Converter datas em inglês para `YYYY-MM-DD`.
- Permitir ao usuário corrigir ou ignorar linhas inválidas.
- Mapear apenas os três status suportados ou solicitar uma decisão para valores desconhecidos.
- Evitar duplicação acidental ao repetir a importação.
- Nunca alterar o arquivo de origem.

## Fora Do Escopo Inicial

- Login e múltiplos usuários.
- Backend e API remota.
- Sincronização entre dispositivos.
- Colunas ou status personalizados.
- Colaboração em tempo real.
- Integrações automáticas com LinkedIn ou portais de vagas.
- Extração automática de dados a partir do link.
- Aplicativo mobile nativo.
- Notificações e lembretes.
- Recursos de inteligência artificial.

Esses itens exigem uma nova decisão de produto antes da implementação.

## Roadmap Inicial

- [x] Definir visão, escopo e regras do MVP.
- [x] Configurar Git e o workflow inicial de integração contínua.
- [x] Criar a base React, TypeScript e Vite.
- [x] Configurar qualidade, testes e integração contínua.
- [x] Criar tokens visuais e layout responsivo do quadro.
- [x] Implementar o banco local e a migration inicial.
- [x] Implementar cadastro e listagem de candidaturas.
- [x] Implementar exclusão com confirmação.
- [ ] Implementar edição de candidaturas.
- [ ] Implementar drag-and-drop entre status e reordenação.
- [ ] Cobrir os fluxos críticos com testes.
- [ ] Implementar importação assistida do CSV existente.
- [ ] Avaliar exportação e backup dos dados locais.

## Como Executar

Requisitos locais:

- Node.js 22.22.2 ou superior.
- npm.

```bash
npm install
npm run dev
```

Verificações de qualidade:

```bash
npm run typecheck
npm run biome:check
npm test
npm run build
```

## Integração Contínua

O workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) é executado em pull requests e em pushes para `main`.

O workflow valida os documentos obrigatórios, exige `package.json`, `package-lock.json` e os scripts `build`, `typecheck`, `biome:check` e `test`, executando:

1. `npm ci`
2. `npm run typecheck`
3. `npm run biome:check`
4. `npm test`
5. `npm run build`

O deploy contínuo ainda não está configurado. O provedor e a estratégia de publicação serão definidos em uma decisão posterior.

## Documentação Para Desenvolvimento

As regras técnicas e orientações para agentes de desenvolvimento estão em [`AGENTS.md`](./AGENTS.md). O arquivo [`opencode.json`](./opencode.json) configura o OpenCode para carregar o contexto do projeto e disponibilizar agentes especializados por área.
