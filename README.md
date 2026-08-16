# Totion

Aplicação web para candidatos organizarem vagas e acompanharem cada candidatura em um quadro visual, com uma experiência inspirada no Notion e focada no processo de busca por emprego.

## Situação Do Projeto

O projeto possui sua primeira fatia vertical implementada. A aplicação exibe uma faixa responsiva com portais de vagas, os três status das candidaturas e anotações livres. Candidaturas podem ser movidas e reordenadas; portais e anotações possuem listas estáticas próprias. Todos os dados são persistidos no IndexedDB do navegador.

A aplicação também exporta e restaura backups próprios e versionados do quadro. O CSV histórico permanece no repositório apenas como registro da migração inicial e não é necessário para usar a aplicação. A versão pública está hospedada na Vercel em [totion-nu.vercel.app](https://totion-nu.vercel.app/).

## Objetivo

Centralizar as informações essenciais de cada vaga e permitir que o candidato visualize rapidamente o andamento de suas candidaturas, sem misturar esse fluxo com os recursos genéricos de uma ferramenta de notas.

## Escopo Do MVP

### Quadro De Candidaturas

O quadro terá cinco listas visuais fixas, nesta ordem:

1. Portais de Vagas
2. Aplicada
3. Em andamento
4. Encerrada
5. Anotações

Somente Aplicada, Em andamento e Encerrada representam status e aceitam drag-and-drop. Portais de Vagas e Anotações exibem itens não arrastáveis.

O usuário poderá:

- Criar, visualizar, editar e excluir uma candidatura.
- Arrastar uma candidatura entre colunas para alterar seu status.
- Reordenar candidaturas dentro da mesma coluna.
- Renderizar inicialmente cinco cards por coluna e carregar os próximos lotes conforme a rolagem se aproxima do fim.
- Abrir o link da vaga em uma nova aba.
- Usar o quadro em telas desktop e mobile.
- Cadastrar, editar, abrir e excluir links de portais de vagas.
- Cadastrar, editar e excluir anotações independentes com conteúdo livre.
- Buscar sem distinção de caixa ou acentos em todas as listas.
- Alternar entre tema claro e escuro, persistindo a preferência local.

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
- Portais possuem nome e URL HTTP(S) obrigatórios e nunca são arrastáveis.
- Anotações independentes possuem conteúdo obrigatório e nunca são arrastáveis.
- Durante uma busca, o drag fica pausado para não reordenar apenas um subconjunto filtrado.

## Persistência Inicial

O MVP será local-first e não terá backend, conta de usuário ou sincronização. Os dados serão armazenados no IndexedDB do navegador.

Essa decisão permite validar a experiência principal antes de assumir custos de infraestrutura. Como limpar os dados do navegador pode remover todas as candidaturas, o usuário pode exportar um backup local antes dessa operação e restaurá-lo depois.

## Tecnologias

- React com TypeScript.
- Vite para desenvolvimento e build.
- Tailwind CSS com tokens semânticos definidos em CSS.
- `@dnd-kit` para drag-and-drop acessível.
- Dexie para acesso tipado ao IndexedDB e migrations.
- React Hook Form para formulários.
- Zod para validação e contratos.
- Sonner encapsulado para notificações transitórias.
- Vitest e React Testing Library para testes unitários e de componentes.
- Playwright para os fluxos críticos no navegador em desktop e mobile.
- Biome para lint e formatação.
- npm como gerenciador de pacotes.

Bibliotecas adicionais só devem ser incluídas quando houver uma necessidade concreta. Estado global de interface não deve ser adicionado enquanto estado local e composição de componentes forem suficientes.

## Estrutura Atual

```text
src/
  app/                    # Composição e teste do fluxo principal
  features/
    applications/         # Quadro, cards, formulário, validação e regras
    resources/            # Portais, anotações, formulários e listas estáticas
  database/
    migrations/           # Versões do banco local
    repositories/         # Leitura e persistência no IndexedDB
  shared/
    notifications.tsx     # API e apresentação das notificações
    utils/                # Funções puras e utilitários
  styles/                 # Tokens e estilos globais
  test/                   # Configuração do ambiente de testes
assets/
  favicon.ico             # Ícone da aplicação
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

O schema inicial é criado por migration. Criação, mudança de status e reordenação calculam e persistem as posições afetadas em transações do IndexedDB.

### `jobPortals`

- `id`: identificador único.
- `name`: nome obrigatório do portal.
- `url`: URL absoluta HTTP(S).
- `createdAt` e `updatedAt`: instantes técnicos em UTC.

### `notes`

- `id`: identificador único.
- `content`: texto livre obrigatório.
- `createdAt` e `updatedAt`: instantes técnicos em UTC.

## Direção Visual

- Interface limpa e densa o suficiente para visualizar várias candidaturas.
- Identidade própria; a referência ao Notion é de interação, não de cópia visual.
- Cada status terá cor de apoio distinta, mantendo contraste adequado.
- Cards devem priorizar nome, data e acesso ao link sem exibir anotações longas por completo.
- No desktop, as cinco colunas dividem a largura disponível sem rolagem horizontal.
- Em telas menores, as colunas podem ser navegadas horizontalmente sem quebrar o drag-and-drop.
- Colunas longas devem manter apenas lotes progressivos de cards montados para reduzir o custo do drag-and-drop.
- Estados de foco, hover, arraste, vazio, carregamento e erro devem ser explícitos.
- A interface e todas as mensagens apresentadas ao usuário serão em português brasileiro.
- O tema inicia claro e a escolha manual pelo tema escuro é persistida no navegador.

## Backup Do Quadro

O menu **Backup** exporta um arquivo `.totion` em JSON com versão explícita. A versão atual inclui candidaturas, portais e anotações, além dos IDs estáveis e da posição dos cards nas três colunas de status. Backups da versão anterior, que continham apenas candidaturas, continuam aceitos.

Ao restaurar um backup, a aplicação:

- Valida formato, versão, campos, URLs, datas, IDs e posições antes de gravar.
- Exibe a quantidade de itens nas cinco listas.
- Exige confirmação explícita de que todos os dados atuais serão substituídos.
- Substitui candidaturas, portais e anotações em uma única transação do IndexedDB.
- Mantém o quadro anterior integralmente se a persistência falhar.

O arquivo CSV com dados reais usado na migração inicial não é carregado pela aplicação, não é necessário para o backup e não é copiado para testes ou documentação.

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
- [x] Implementar visualização e edição de candidaturas.
- [x] Implementar drag-and-drop entre status e reordenação.
- [x] Cobrir os fluxos críticos com testes.
- [x] Concluir a migração assistida do CSV existente.
- [x] Implementar exportação e restauração de backup dos dados locais.
- [x] Implementar portais de vagas e anotações independentes.
- [x] Implementar busca universal e tema escuro persistido.
- [x] Publicar a aplicação na Vercel.

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
npm run test:e2e
npm run build
```

## Integração Contínua

O workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) é executado em pull requests e em pushes para `main`.

O workflow valida os documentos obrigatórios, exige `package.json`, `package-lock.json` e os scripts `build`, `typecheck`, `biome:check` e `test`, executando:

1. `npm ci`
2. `npm run typecheck`
3. `npm run biome:check`
4. `npm test`
5. `npm run test:e2e`
6. `npm run build`

## Publicação

A aplicação está publicada na Vercel:

- **Produção:** [https://totion-nu.vercel.app/](https://totion-nu.vercel.app/)
- **Branch de produção:** `main`
- **Preview deployments:** gerados pela integração da Vercel para as demais branches e pull requests.

O workflow de integração contínua permanece responsável por validar typecheck, Biome, testes, Playwright e build. A Vercel realiza a hospedagem e a publicação da aplicação estática.

Como o Totion é local-first, os dados permanecem no IndexedDB e são isolados por origem. Dados criados em preview deployments não são compartilhados com o domínio de produção.

## Documentação Para Desenvolvimento

As regras técnicas e orientações para agentes de desenvolvimento estão em [`AGENTS.md`](./AGENTS.md). O arquivo [`opencode.json`](./opencode.json) configura o OpenCode para carregar o contexto do projeto e disponibilizar agentes especializados por área.
