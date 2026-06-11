# DronePharm — Prompts de Formulários (Fase 4)

> Cada prompt pressupõe que o **PROMPT 00** já foi enviado na conversa atual.
> Execute na ordem. Aguarde a entrega de cada um antes de enviar o próximo.


### PROMPT F-0.01 — Estado Atual do projeto

```
Entenda o estado atual do projeto

1. Estado Atual da Implementação
Fase 1 (Componentização): Os componentes principais de telemetria (TelemetryGrid), mapa (MapCanvas) e controle (StatusControl) já estão funcionais no diretório src/features/monitoring/.

Fase 2 (Unificação do App.tsx): O arquivo src/App.tsx foi refatorado para deixar de ser um boilerplate do Vite e agora atua como o Orchestrator da aplicação utilizando react-router-dom.

Fase 3 (Navegação): Foi implementado um MainLayout que contém a barra de navegação superior (baseada no design do preview_forms.html). Os botões para acessar as páginas de formulários já existem na interface principal e apontam para as rotas definidas abaixo.

2. Arquitetura de Rotas (React Router Dom)
O roteamento foi configurado para suportar deep-linking e separação de estados:

/ ou /monitoramento/:pedidoId?: Renderiza o dashboard de monitoramento em tempo real.

/pedidos/novo: Rota para o formulário de cadastro de novos pedidos (Alvo da implementação).

/pedidos: Rota para listagem geral de pedidos (Alvo da implementação).

/drones/novo: Rota para registro de novas unidades da frota (Alvo da implementação).

/drones: Rota para gestão de status da frota (Alvo da implementação).

Ainda não implemente código, espere a instrução.
```

---

---

### PROMPT F-01 — Infraestrutura de Formulários

```
Crie quatro componentes base em src/components/ui/. Nenhum formulário de feature
deve ser criado agora — apenas a infraestrutura compartilhada.

FormInput.tsx
  Encapsula o padrão label → input → erro de um único campo.
  Suporta sufixo de unidade exibido dentro do input à direita (ex: kg, °, m/s).
  Exibe hint opcional abaixo do campo quando não há erro.
  Aplica estilo de erro quando FieldError for passado.
  Acessibilidade obrigatória: aria-invalid, aria-describedby e role="alert"
  na mensagem de erro. Label sempre via htmlFor — nunca só placeholder.
  Referência visual: classe .field e .input-wrap do preview_forms.html.

FormSelect.tsx
  Mesma estrutura do FormInput, renderiza <select>.
  Recebe array de opções { value, label }.
  Usa Controller do react-hook-form — não register direto.
  Seta customizada via SVG inline conforme preview_forms.html.

RadioGroup.tsx
  Usa <fieldset> + <legend> — obrigatório para acessibilidade de grupos.
  Cada opção suporta label principal e descrição secundária menor.
  Item selecionado recebe borda var(--accent) e fundo var(--accent-ghost).
  Usa Controller do react-hook-form.

FormSkeleton.tsx
  Skeleton de carregamento para páginas de formulário.
  Usa o componente Skeleton do Shadcn/UI.
  Compõe: bloco de topbar + três cards com campos simulados.
  Será usado como fallback de Suspense em todas as rotas de gestão.

Regras visuais que valem para os quatro componentes e para todos os prompts
seguintes desta fase:
- Cores exclusivamente via variáveis de tokens.css — zero valores hardcoded.
- Fundo de input: var(--surface-input). Foco: var(--accent). Erro: var(--status-danger).
- Dados numéricos e IDs exibidos em tela: var(--font-data).
- Asterisco de campo obrigatório em var(--status-danger) — nunca texto "obrigatório".
- Emojis proibidos em qualquer elemento da interface.
- Toasts sempre via import { toast } from 'sonner'.
```

---

### PROMPT F-02 — Tipos e API de Farmácias

```
Adicione as interfaces de Farmácia em src/types/api.ts e crie src/api/farmacias.ts.
Nenhum componente React nesta etapa.

Interfaces a adicionar em src/types/api.ts (bloco após "─── Drones ───"):
  FarmaciaCreate   — campos de criação: nome, cidade, lat, lng, telefone?, ativa
  FarmaciaUpdate   — todos os campos opcionais
  FarmaciaResponse — inclui id e criado_em além dos campos de create
  FarmaciaListResponse — { total, farmacias }

Verifique o openapi.json antes de definir os campos. Ele é a fonte da verdade.

Funções a criar em src/api/farmacias.ts (usa apiFetch de src/api/client.ts):
  listFarmacias()                         → GET  /api/v1/farmacias/
  getFarmacia(id)                         → GET  /api/v1/farmacias/{id}
  criarFarmacia(body)                     → POST /api/v1/farmacias/
  atualizarFarmacia(id, body)             → PATCH /api/v1/farmacias/{id}
  desativarFarmacia(id)                   → PATCH /api/v1/farmacias/{id}/desativar

Retorno tipado explícito em todas. Sem try/catch interno — o caller trata os erros.
```

---

### PROMPT F-03 — Schema e Store de Farmácias

```
Crie o schema Zod e o store Zustand do módulo de Farmácias.
Nenhum componente React nesta etapa.

src/features/farmacias/farmaciaSchema.ts
  Valida: nome (3–120 chars), cidade (2–80 chars), latitude (-90 a 90),
  longitude (-180 a 180), telefone (opcional, max 20 chars), ativa (boolean).
  Todas as mensagens de erro em português e descritivas.
  Exporte o schema e o tipo inferido FarmaciaFormData.

src/features/farmacias/store/useFarmaciasStore.ts
  Zustand v5 com tipagem explícita via create<T>.
  Estado: farmacias: FarmaciaResponse[]
  Actions: setFarmacias (substitui a lista), adicionar, atualizar (por id), remover (por id).
  Este store será consumido por FormPedido para popular o select de origem —
  sem fazer nova requisição se já estiver populado.
  Exports nomeados — sem default export.
```

---

### PROMPT F-04 — FormFarmacia

```
Crie src/features/farmacias/FormFarmacia.tsx.

O componente funciona em dois modos detectados via useParams:
  Criação: rota /farmacias/nova  — sem parâmetro id
  Edição:  rota /farmacias/:id/editar — busca os dados com TanStack Query
           e pré-popula o formulário via reset() após o fetch.
Título, breadcrumb e texto do botão de submit refletem o modo ativo.

Layout (max-width 760px, replicar preview_forms.html):
  Topbar com breadcrumb à esquerda e botões Cancelar / Salvar à direita.
  Card "Identificação": campo Nome em largura total; Cidade e Telefone em grid 2 colunas.
  Card "Localização de Origem": Latitude e Longitude em grid 2 colunas,
    sufixo ° em ambos, step 0.0001, hint sobre coordenadas decimais WGS84.
  Card "Configurações": Switch Shadcn "Farmácia ativa" via Controller,
    padrão true em criação, seguido de divider e botões de submit.

Comportamento do submit:
  Chamar criarFarmacia ou atualizarFarmacia conforme o modo.
  Atualizar o store (adicionar ou atualizar) antes do navigate.
  Erros HTTP do backend: mapear detail[].loc para setError no campo correspondente.
  Erros sem campo identificável: setError('root') exibido acima dos botões com role="alert".
  Toast de sucesso com mensagem distinta para criação e edição.
```

---

### PROMPT F-05 — ListaFarmacias

```
Crie src/features/farmacias/ListaFarmacias.tsx.

Carrega os dados com TanStack Query (queryKey ['farmacias'], staleTime 30s).
Após o fetch, popula useFarmaciasStore via setFarmacias — garante que FormPedido
tenha as opções disponíveis sem nova requisição.

Layout (max-width 1080px):
  Topbar com breadcrumb e botão "Nova Farmácia" à direita.
  Section header com total de registros.
  Barra de filtros: input de busca (filtra nome e cidade) + select Ativa/Inativa.
  Tabela + paginação (10 por página).

Colunas da tabela:
  ID (var(--font-data)), Nome, Cidade, Coordenadas (4 casas decimais, var(--font-data)),
  Telefone (— quando nulo), Status (badge), Ações.

Badge de status:
  Ativa   → var(--status-ok-bg) / var(--status-ok)
  Inativa → var(--status-neutral-bg) / var(--status-neutral)

Coluna Ações:
  "Editar" navega para /farmacias/:id/editar.
  "Desativar" abre Dialog de confirmação antes de chamar desativarFarmacia.
  Quando ativa===false: substituir "Desativar" por "Reativar" que chama
  atualizarFarmacia({ ativa: true }) e atualiza o store.

Estado vazio: texto "Nenhuma farmácia cadastrada" + botão para /farmacias/nova.

Performance:
  FarmaciaRow em React.memo — rerendiza apenas se id, ativa ou nome mudarem.
  Filtros calculados em useMemo.

Registrar as rotas /farmacias, /farmacias/nova e /farmacias/:id/editar com
React.lazy + Suspense usando FormSkeleton como fallback.
Adicionar link "Farmácias" no MainLayout entre Pedidos e Drones.
```

---

### PROMPT F-06 — Schema, Store e API de Pedidos

```
Verifique e complete os tipos de Pedido em src/types/api.ts, crie o schema Zod,
o store Zustand e o módulo de API. Nenhum componente React nesta etapa.

Tipos em src/types/api.ts — confirme que existem conforme openapi.json.
Adicione apenas o que estiver faltando, sem reescrever o que já existe:
  PedidoCreate deve incluir farmacia_id como campo obrigatório.

src/api/pedidos.ts — verifique o que já foi criado no PROMPT 3 do README.
Adicione apenas as funções ausentes:
  criarPedido, listPedidos (com filtros opcionais de status, prioridade,
  farmacia_id, limite e offset).

src/features/management/pedidoSchema.ts
  Valida: farmacia_id (inteiro positivo), latitude, longitude, peso_kg (positivo,
  respeitar limite do openapi.json), prioridade (1 | 2 | 3),
  descricao (opcional, max 300 chars), janela_fim (opcional, ISO string).
  Todas as mensagens em português descritivo.
  Exporte o schema e o tipo PedidoFormData.

src/features/management/store/usePedidosStore.ts
  Zustand v5. Estado: pedidos: PedidoResponse[].
  Actions: setPedidos, adicionar, atualizar, remover.
  Exports nomeados.
```

---

### PROMPT F-07 — FormPedido

```
Crie src/features/management/FormPedido.tsx.

O select de Farmácia de origem consome useFarmaciasStore — não faz nova requisição
se o store já estiver populado. Se estiver vazio (acesso direto pela URL),
dispara useQuery com enabled: farmacias.length === 0. Exibe apenas farmácias ativas.

Layout (max-width 760px, replicar preview_forms.html):
  Topbar com breadcrumb Pedidos / Novo Pedido e botões Cancelar / Salvar Pedido.
  Card "Destino": FormSelect de farmácia em largura total; Latitude e Longitude
    em grid 2 colunas com sufixo ° e step 0.0001.
  Card "Carga": Peso (sufixo kg) e Descrição em grid 2 colunas;
    Janela de entrega (datetime-local) em largura total com hint sobre cálculo automático.
  Card "Prioridade": RadioGroup com P1 Urgente (janela 1h), P2 Normal (4h),
    P3 Reabastecimento (24h); divider; botões de submit.

Submit: chamar criarPedido, atualizar store antes do navigate, tratar
HTTPValidationError com setError por campo, exibir errors.root com role="alert".
```

---

### PROMPT F-08 — ListaPedidos

```
Crie src/features/management/ListaPedidos.tsx.

Carrega com TanStack Query (queryKey ['pedidos'], staleTime 10s).
Popula usePedidosStore via setPedidos no useEffect após o fetch.

Layout (max-width 1080px):
  Topbar com botão "Calcular Rotas" (ghost) e "Novo Pedido" (primário) à direita.
  Barra de filtros: busca por ID ou descrição, selects de Status, Prioridade e Farmácia.
  Filtro de Farmácia usa opções do useFarmaciasStore.
  Tabela + paginação (10 por página).

Colunas: ID, Prioridade, Farmácia, Peso, Status, Janela, Criado em, Ações.

Indicador de prioridade: dot colorido + texto.
  P1: var(--status-danger) | P2: var(--status-info) | P3: var(--text-muted)

Badge de status: conforme seção "6. Badges de Status" do design-system.md.

Coluna Ações:
  "Ver" navega para /monitoramento/:pedidoId.
  "Cancelar" visível apenas em status pendente ou calculado — abre Dialog de
  confirmação antes de chamar cancelarPedido, depois remove do store e
  dispara invalidateQueries.

Performance: PedidoRow em React.memo, rerendiza se id ou status mudarem.
Filtros em useMemo.

Registrar /pedidos e /pedidos/novo com React.lazy + Suspense + FormSkeleton.
```

---

### PROMPT F-09 — Schema, Store e FormDrone

```
Crie o schema Zod, o store Zustand e o formulário do módulo de Drones.

Verifique src/api/drones.ts (criado no PROMPT 00 do README). Adicione apenas
as funções ausentes: criarDrone e atualizarDrone.

src/features/drones/droneSchema.ts
  Valida: id com regex /^DP-\d{2,4}$/, modelo (2–80 chars),
  autonomia_km (positivo, max conforme openapi.json), carga_max_kg,
  velocidade_ms. Todos numéricos positivos.
  Validação de unicidade do id via refine consultando useDronesStore —
  mensagem "Este ID já está em uso".
  Exports: schema e tipo DroneFormData.

src/features/drones/store/useDronesStore.ts
  Zustand v5. Estado: drones: DroneResponse[].
  Actions: setDrones, adicionar, atualizar, remover (id é string "DP-01").

src/features/drones/FormDrone.tsx
  Layout (max-width 760px, replicar preview_forms.html):
  Topbar com breadcrumb Drones / Novo Drone e botões Cancelar / Registrar Drone.
  Card "Identificação": ID (var(--font-data) no input, hint sobre firmware) e
    Modelo em grid 2 colunas.
  Card "Especificações Técnicas": Autonomia (km), Carga máxima (kg) e
    Velocidade cruzeiro (m/s) em grid 3 colunas com sufixos; divider; botões de submit.

Submit: criarDrone, store.adicionar antes do navigate, tratar HTTPValidationError.
```

---

### PROMPT F-10 — ListaDrones e Code Splitting

```
Crie src/features/drones/ListaDrones.tsx e finalize o code splitting de todas
as rotas de gestão.

Carrega com TanStack Query (queryKey ['drones'], staleTime 15s).
Popula useDronesStore via setDrones no useEffect.

Layout (max-width 1080px):
  Topbar com botão "Novo Drone" à direita.
  Filtro de status: Todos / aguardando / em_voo / retornando / carregando /
    manutencao / emergencia.
  Tabela + paginação.

Colunas: ID, Modelo, Autonomia, Carga máx., Velocidade, Bateria, Status, Ações.

Coluna Bateria — componente BateriaIndicador extraído fora do componente pai:
  bateria_pct === null exibe "—".
  Converte 0.0–1.0 para percentual internamente.
  Cor dinâmica: < 20% var(--status-danger), < 50% var(--status-warn),
  ≥ 50% var(--status-ok).
  Barra visual proporcional à largura do percentual.
  Acessibilidade: role="meter" com aria-valuenow, aria-valuemin, aria-valuemax.

Badge de status por StatusDroneEnum:
  aguardando → status-ok | em_voo → status-lock | retornando → status-info
  carregando → status-warn | manutencao / emergencia → status-danger

Ações: "Editar" navega para /drones/:id/editar.

DroneRow em React.memo — rerendiza se id, status ou bateria_pct mudarem.
Filtro em useMemo.

Registrar /drones e /drones/novo com React.lazy + Suspense + FormSkeleton.

Code splitting final — confirmar que todas as 7 rotas de gestão usam React.lazy:
  /farmacias, /farmacias/nova, /farmacias/:id/editar
  /pedidos, /pedidos/novo
  /drones, /drones/novo
As rotas de monitoramento não devem ser alteradas.
```

---

## Ordem de Execução

| # | Prompt | Entrega |
|---|--------|---------|
| F-01 | Infraestrutura de Formulários | FormInput, FormSelect, RadioGroup, FormSkeleton |
| F-02 | Tipos e API de Farmácias | interfaces em types/api.ts + api/farmacias.ts |
| F-03 | Schema e Store de Farmácias | farmaciaSchema.ts + useFarmaciasStore.ts |
| F-04 | FormFarmacia | Formulário criação/edição com duplo modo |
| F-05 | ListaFarmacias | Tabela, filtros, rotas e link no MainLayout |
| F-06 | Schema, Store e API de Pedidos | pedidoSchema.ts + usePedidosStore.ts + api/pedidos.ts |
| F-07 | FormPedido | Formulário com select de farmácia do store |
| F-08 | ListaPedidos | Tabela, filtros, badges de status e rotas |
| F-09 | Schema, Store e FormDrone | droneSchema.ts + useDronesStore.ts + FormDrone.tsx |
| F-10 | ListaDrones + Code Splitting | Tabela com BateriaIndicador + lazy de todas as rotas |
