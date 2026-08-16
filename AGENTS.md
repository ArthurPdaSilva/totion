# Totion - Contexto Do Projeto

## Visão Geral

Totion é uma aplicação web local-first para candidatos acompanharem vagas em um quadro visual. A experiência é inspirada na organização e no drag-and-drop do Notion, mas o produto é específico para o processo de candidatura.

Toda interface, mensagem de validação e texto apresentado ao usuário deve estar em português brasileiro. Nomes técnicos, identificadores e código devem estar em inglês.

A primeira fatia vertical de criação, listagem, edição, exclusão e drag-and-drop está implementada. A faixa principal também contém listas estáticas de portais e anotações, busca universal e tema escuro persistido. A aplicação exporta e restaura backups locais próprios com gravação transacional.

## Fonte De Verdade

- `README.md` define objetivo, escopo, comportamento e roadmap do produto.
- `AGENTS.md` define regras técnicas e de colaboração.
- `opencode.json` configura os agentes especializados do OpenCode e carrega as instruções do projeto; ele não substitui este documento.
- O código e as migrations implementadas definem o estado técnico atual.

Quando documentação e implementação divergirem, confirme se houve uma decisão posterior antes de alterar regras de negócio. Atualize a documentação junto com toda mudança aprovada de escopo ou arquitetura.

## Escopo Do MVP

### Quadro

- Exibir Portais de Vagas, Aplicada, Em andamento, Encerrada e Anotações, nesta ordem.
- Manter Aplicada, Em andamento e Encerrada como os únicos status e as únicas colunas arrastáveis.
- Exibir a contagem de cards em cada coluna.
- Criar, visualizar, editar e excluir candidaturas.
- Mover cards entre colunas por drag-and-drop.
- Reordenar cards dentro da mesma coluna.
- Persistir status e ordem após cada movimento válido.
- Manter o fluxo funcional com mouse, toque e teclado.

### Candidatura

Cada item possui:

- Nome obrigatório.
- Status obrigatório.
- Data de aplicação obrigatória.
- Link opcional da vaga.
- Anotações opcionais.

### Recursos Estáticos

- Portais de Vagas possuem nome e URL HTTP(S) obrigatórios.
- Anotações independentes possuem somente conteúdo obrigatório.
- Portais e anotações permitem criar, editar e excluir, mas nunca são draggable ou droppable.
- A busca universal filtra candidaturas, portais e anotações sem diferenciar caixa ou acentos.
- O drag-and-drop fica desabilitado enquanto houver um filtro de busca ativo.

## Regras Críticas De Negócio

### Status

Os valores persistidos são:

- `applied`: Aplicada.
- `in_progress`: Em andamento.
- `closed`: Encerrada.

Não adicionar novos status, status personalizados ou transições especiais sem uma decisão de produto. O status salvo deve ser derivado da coluna de destino, nunca do texto visível da interface.

### Ordenação E Drag-And-Drop

- Cada candidatura pertence a um único status e ocupa uma posição nesse status.
- Mover entre colunas altera status e posição em uma única transação.
- Reordenar na mesma coluna altera a posição sem mudar o status.
- Alterar o status pelo formulário move o card para o fim da coluna de destino e normaliza a origem na mesma transação.
- Não use o índice renderizado como identidade do card.
- O estado visual pode ser otimista, mas uma falha de persistência deve restaurar a ordem anterior e produzir uma mensagem acessível.
- Sensores de mouse, toque e teclado devem ser configurados explicitamente.
- O card não deve iniciar um arraste quando o usuário interagir com link, menu, botão ou campo editável.
- O overlay de arraste não deve duplicar identificadores HTML nem aceitar interação.
- Colunas vazias devem continuar sendo destinos válidos.
- Colunas renderizam inicialmente cinco cards e carregam novos lotes de cinco ao se aproximarem do fim; contagem, ordenação e persistência continuam considerando a lista completa.
- O card ativo deve permanecer montado quando um movimento atravessar o limite do lote visível.

A estratégia de `position` deve permitir inserções e reordenações consistentes. Se a implementação usar posições fracionárias, inclua normalização determinística quando o espaço entre valores se tornar insuficiente. Se usar índices inteiros, regrave a coluna afetada em uma única transação.

### Datas

- `applied_at` é uma data civil no formato `YYYY-MM-DD`.
- Não converta a data da aplicação para UTC nem a crie com parsing ambíguo de `Date`.
- Instantes técnicos, como `created_at` e `updated_at`, devem usar ISO 8601 em UTC.
- Formate a data civil para `pt-BR` somente na apresentação.

### Links

- Aceitar somente URLs absolutas com protocolo `http` ou `https`.
- Links externos devem usar `target="_blank"` e `rel="noopener noreferrer"`.
- Não renderizar conteúdo fornecido pelo usuário como HTML.
- Não buscar metadados ou conteúdo da URL no MVP.

### Exclusão

- Solicitar confirmação antes de excluir.
- Remover o registro de forma definitiva no MVP.
- Após confirmação, falhas devem manter ou restaurar o card e informar o usuário.

### Dados Locais

- O IndexedDB é a fonte persistente do MVP.
- O backup próprio usa um arquivo `.totion` em JSON, com formato e versão explícitos.
- A versão atual do backup inclui candidaturas, portais e anotações e mantém leitura da versão anterior.
- A restauração valida todo o arquivo e substitui todas as stores em uma única transação após confirmação explícita.
- Toda evolução de schema deve ser versionada por migration.
- Componentes e hooks de interface não acessam Dexie diretamente.
- Repositories encapsulam consultas e persistência.
- Operações que coordenam mudança de status e ordem ficam em um serviço de domínio.
- Não adicionar backend, autenticação, analytics ou sincronização sem decisão explícita.

## Tecnologias Planejadas

- React e TypeScript.
- Vite.
- Tailwind CSS com configuração CSS-first.
- `@dnd-kit`.
- Dexie e IndexedDB.
- React Hook Form.
- Zod.
- Sonner para notificações transitórias.
- Vitest.
- React Testing Library.
- Playwright.
- Biome.
- npm.

Antes de instalar, confirme versões estáveis e compatíveis. Não fixe na documentação números de versão que não estejam instalados no projeto.

### Gerenciamento De Pacotes

- Usar npm exclusivamente; não usar pnpm ou Yarn.
- Usar `npm install`, `npm uninstall` e `npm run`.
- Manter `package-lock.json` versionado.
- Usar `npm ci` no CI e em instalações reproduzíveis.
- Não instalar uma biblioteca se a plataforma ou uma função pequena e bem testada resolver o problema.

## Arquitetura Atual

```text
src/
  app/                    # Composição e providers
  features/
    applications/
      components/         # Board, column, card e formulário
      hooks/              # Estado e coordenação da interface
      schemas/            # Validação das entradas
      services/           # Regras de movimento e ordenação
      types/              # Tipos específicos da feature
    resources/            # Portais e anotações não arrastáveis
  database/
    migrations/           # Versões do IndexedDB
    repositories/         # Persistência e consultas
  shared/
    utils/                # Funções puras
  styles/                 # Tokens e estilos globais
  test/                   # Configuração do ambiente de testes
```

Evite criar camadas vazias antecipadamente. A estrutura deve crescer conforme existirem responsabilidades reais.

### Separação De Responsabilidades

- Componentes apresentam dados e emitem eventos.
- Hooks coordenam estado temporário da interface.
- Schemas validam limites de entrada.
- Services implementam regras que combinam mais de uma operação.
- Repositories isolam o IndexedDB e retornam tipos de domínio.
- Funções puras calculam a nova ordem sem depender do DOM ou do banco.

Não duplique o estado completo do quadro em múltiplos stores. Se o estado otimista for necessário, mantenha uma única estratégia clara de reconciliação.

## Modelo De Dados Planejado

```ts
type ApplicationStatus = "applied" | "in_progress" | "closed";

type Application = {
  id: string;
  name: string;
  status: ApplicationStatus;
  appliedAt: string;
  jobUrl: string | null;
  notes: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
};

type JobPortal = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceNote = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};
```

O tipo de domínio usa camelCase. A forma persistida pode manter os mesmos nomes; se usar snake_case, a conversão deve ficar no repository e não se espalhar pela interface.

IDs devem ser estáveis e gerados pela aplicação, preferencialmente com `crypto.randomUUID()`. Não derive identidade de nome, URL, posição ou índice.

## Formulários E Validação

- Compartilhar um schema Zod entre criação e edição quando as regras forem iguais.
- Normalizar espaços nas extremidades antes de persistir.
- Não apagar espaços e quebras internos das anotações.
- Associar mensagens de erro aos campos correspondentes.
- Manter os dados preenchidos quando o salvamento falhar.
- Desabilitar submissões repetidas enquanto uma gravação estiver em andamento.
- O formulário deve funcionar sem depender do drag-and-drop.

Limites máximos de texto devem ser decididos e testados antes da implementação; não introduza limites arbitrários silenciosamente.

## Interface E Acessibilidade

- Preservar uma identidade visual própria em vez de copiar o Notion.
- Usar os tokens de `src/styles/theme.css` para cores, tipografia, espaçamento, bordas, sombras e camadas.
- Preferir classes Tailwind semânticas e não espalhar cores arbitrárias pelos componentes.
- Manter as classes completas em mapeamentos por status; não construir nomes Tailwind dinamicamente.
- Manter constantes de negócio fora dos arquivos de estilo.
- Garantir contraste conforme WCAG AA.
- Manter foco visível e ordem de tabulação coerente.
- Botões de ícone precisam de nome acessível.
- Modais precisam controlar foco, fechar com `Escape` e devolver foco ao acionador.
- Componentes de feature usam `src/shared/notifications.tsx`; não importam Sonner diretamente.
- Erros de formulários e modais permanecem próximos ao contexto quando um toast ficaria atrás da top layer.
- Não depender apenas de cor para comunicar status ou erro.
- Oferecer áreas de interação adequadas para toque.
- Respeitar `prefers-reduced-motion` nas animações.
- No mobile, permitir navegação horizontal pelas colunas sem bloquear a rolagem vertical da página.
- Preservar os padrões visuais já implementados antes de introduzir novos componentes.
- O tema inicia claro, é alternado por controle acessível e persiste somente a escolha manual no `localStorage`.

## CSV Legado

O CSV na raiz contém dados reais usados na migração inicial e deve ser preservado como entrada histórica do usuário:

- Não modificar, reformatar ou remover o arquivo sem solicitação explícita.
- Não copiar seu conteúdo para fixtures, snapshots, logs ou documentação.
- Criar fixtures sintéticas e pequenas para testes.
- Não reintroduzir dependência desse arquivo no fluxo normal de importação e exportação.
- Não adicionar novamente uma biblioteca de CSV sem uma nova necessidade aprovada.

## Convenções De Código

- Usar named exports; evitar `export default`, exceto quando uma ferramenta exigir.
- Componentes e arquivos de componente em PascalCase.
- Funções, hooks, variáveis e utilitários em camelCase.
- Constantes globais em SCREAMING_SNAKE_CASE somente quando forem realmente constantes de módulo.
- Evitar `any`, type assertions e `@ts-ignore`; modelar entradas e erros.
- Preferir unions discriminadas para estados assíncronos relevantes.
- Manter funções pequenas quando isso melhorar legibilidade, sem criar abstrações de uso único sem valor.
- Adicionar comentários apenas quando explicarem uma decisão não evidente.
- Não deixar `console.log` no código de produção.
- Não incluir segredos, tokens ou dados pessoais no repositório.

## Testes E Qualidade

Toda funcionalidade ou correção deve incluir testes proporcionais ao risco.

Prioridades:

- Validação do formulário.
- Formatação de datas sem deslocamento por fuso horário.
- Cálculo puro de posição e ordem.
- Reordenação dentro da mesma coluna.
- Movimento entre colunas, incluindo coluna vazia.
- Rollback visual quando a persistência falhar.
- Persistência e migrations do repository.
- Validação, round-trip e rollback do backup local.
- Criação, edição e exclusão.
- Drag por teclado e interações acessíveis.
- Layout e fluxo principal em viewport desktop e mobile.

Não teste detalhes internos do `dnd-kit`. Teste o comportamento do domínio em funções puras e cubra o fluxo integrado essencial no Playwright.

Depois de alterações, execute os scripts disponíveis de typecheck, Biome e testes. Quando o projeto ainda não possuir esses scripts, registre essa limitação sem inventar comandos bem-sucedidos.

O workflow `.github/workflows/ci.yml` valida os documentos e arquivos obrigatórios, instala com `npm ci` e executa typecheck, Biome, testes, Playwright e build. Não enfraqueça ou ignore essas etapas para contornar uma falha.

## Fluxo De Trabalho Dos Agentes

Antes de implementar:

1. Ler `README.md`, este arquivo e os arquivos relacionados à feature.
2. Verificar o estado atual do repositório e não presumir que o roadmap está implementado.
3. Identificar regras afetadas, migrations necessárias e riscos de perda de dados.
4. Fazer a menor alteração completa que atenda ao pedido.

Durante a implementação:

1. Preservar alterações existentes que não pertençam à tarefa.
2. Atualizar tipos, validação, persistência e interface de forma coerente.
3. Manter lógica de ordenação independente da biblioteca de UI.
4. Adicionar testes junto da mudança.
5. Atualizar documentação quando comportamento, comando ou decisão mudar.

Antes de concluir:

1. Executar as verificações disponíveis.
2. Revisar acessibilidade, comportamento responsivo e estados de erro.
3. Confirmar que nenhum dado real do CSV entrou em testes ou logs.
4. Informar objetivamente o que mudou e qualquer verificação não executada.

## Fora Do Escopo Inicial

- Backend, API e autenticação.
- Sincronização e colaboração.
- Status personalizados.
- Integrações com portais de emprego.
- Coleta automatizada de conteúdo externo.
- IA, recomendações e geração de texto.
- Aplicativos móveis nativos.
- Métricas e analytics de terceiros.

Não criar infraestrutura preventiva para esses itens.
