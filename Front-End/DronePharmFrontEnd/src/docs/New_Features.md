# Guia de Prompts — Sistema de Monitoramento de Drones

Este documento descreve os prompts de desenvolvimento organizados por área funcional para evolução do sistema de entregas por drone. Os prompts foram validados contra o contrato da API (`openapi.json` v2.1.0).

---

## 1. Monitoramento e Fluxo de Pedidos

### 1.1 — Formulário Multi-Destino e Rastreamento Sequencial

**Objetivo:** Atualizar a interface para suportar criação em lote de pedidos e rastreamento de rotas com múltiplos waypoints.

**Escopo:**

- **Frontend (Formulário):** Refatorar o formulário de criação de pedidos para permitir adição dinâmica de múltiplos pedidos em lote usando `Field Array` (React Hook Form). Cada linha do array corresponde a um `PedidoCreate` independente — o backend aceita um destino por pedido (`coordenada: { latitude, longitude }`), e a rota multi-waypoint é gerada automaticamente pelo algoritmo de roteirização após o `POST /api/v1/rotas/calcular`.

  > ⚠️ **Correção de escopo:** o `PedidoCreate` aceita um único destino. Múltiplos pontos de entrega são waypoints de uma rota calculada, não campos do formulário de criação de pedido.

- **Frontend (Monitoramento):** Atualizar `useDroneTracking.ts` e o componente de mapa para processar o array `waypoints[]` retornado em `RotaResponse`. Exibir marcadores numerados usando o campo `seq` de cada `WaypointResponse` (`seq`, `latitude`, `longitude`, `altitude`, `label`). Para o carregamento inicial do mapa, preferir `GET /api/v1/mapa/snapshot`, que retorna depósito, pedidos ativos, rotas e frota em uma única chamada.

- **Backend (Lógica de Voo):** Garantir que o loop de telemetria (`manager.broadcast`) percorra todos os waypoints da rota carregada do banco, enviando status de cada entrega via WebSocket para o canal de pedidos.

---

### 1.2 — Validação de Constraints (Métricas Backend vs. Frontend)

**Objetivo:** Garantir que as métricas exibidas no monitoramento sejam tecnicamente precisas conforme os limites definidos no schema `TelemetriaCreate`.

**Escopo:**

- **Backend:** Os limites confirmados pelo schema são: `altitude_m ≥ 0`, `velocidade_ms ≥ 0`, `bateria_pct` entre `0.0` e `1.0`, `vento_ms ≥ 0`, `direcao_vento` entre `0` e `360`.

- **Frontend:** Atualizar `useTelemetryStore.ts` para validar o payload recebido via WebSocket contra esses limites. O campo `bateria_pct` trafega como decimal (`0.0–1.0`) — multiplicar por `100` antes de exibir percentual ao usuário e antes de comparar com thresholds de alerta (ex: crítico abaixo de `0.2`, equivalente a 20%).

  > ⚠️ **Atenção:** não usar `bateria_pct > 20` como threshold — o valor correto é `bateria_pct < 0.20`.

- **Testes:** Implementar testes unitários com Vitest para garantir que `TelemetryGrid.tsx` exiba alertas visuais (cor vermelha ou ícones de aviso) em níveis críticos de bateria ou altitude fora dos parâmetros.

---

## 2. Pedidos e Regras de Negócio - 

### 2.1 — Padronização de Decimais

**Objetivo:** Corrigir a precisão de casas decimais em todo o fluxo de pedidos.

**Escopo:**

- **Backend:** Utilizar `Numeric` ou `Decimal` nos modelos Pydantic e esquemas SQLAlchemy — 2 casas para valores financeiros/peso e 6 casas para coordenadas geográficas, para evitar erros de arredondamento de ponto flutuante.

- **Frontend:** Aplicar máscaras de entrada e usar `parseFloat().toFixed(n)` antes de enviar dados para a API. Atenção ao formato do payload: coordenadas devem ser enviadas como objeto aninhado `coordenada: { latitude, longitude }`, conforme o schema `PedidoCreate` — não como campos no topo do payload.

  > ⚠️ **Atenção:** o `PedidoResponse` retorna `latitude` e `longitude` tanto na raiz quanto dentro de `coordenada{}`. Para consistência com o campo de entrada, usar sempre `coordenada` nas leituras também.


----> Esta funcionando tudo de forma correta

---

### 2.2 — Correção da Janela de Entrega Manual 

**Objetivo:** Resolver o erro no backend que ocorre quando a janela de entrega é definida manualmente.

**Escopo:**

- **Backend:** Analisar o código de validação de datas em `rotas.py` ou no modelo de Pedidos para identificar conflito de timezone ou formato de string. O campo `janela_fim` é editável via `PATCH /api/v1/pedidos/{pedido_id}` (schema `PedidoUpdate`) e deve ser enviado como string ISO 8601 com timezone (`date-time`).
- Garantir conversão de todas as entradas manuais para objetos `datetime` com timezone (UTC) antes de cálculos de tempo de voo.
- Adicionar bloco `try/except` no parse de datas para retornar mensagem de erro amigável ao frontend em caso de formato inválido.

  > ℹ️ Quando `janela_fim` não é informada, o backend a calcula automaticamente por prioridade: P1 = 1h, P2 = 4h, P3 = 24h. O fix de timezone deve preservar esse comportamento.



----> quando eu coloquei o prompt deu erro de erro NetworkError when attempting to fetch resource, entao eu corrigi esse erro, se qualquer coisa der erro pode
ser essa correção aqui


---

## 3. Aba de KPIs e Histórico

### 3.1 — Dashboard de KPIs

**Objetivo:** Implementar a aba de KPIs consumindo os endpoints analíticos já existentes no backend.

**Escopo:**

- **Frontend — Métricas globais:** Consumir `GET /api/v1/historico/kpis` (schema `KpiGeralResponse`) para cards de destaque com: `total_entregas`, `taxa_pontualidade_pct`, `tempo_medio_min`, `distancia_media_km` e `peso_total_entregue_kg`.

- **Frontend — Estado operacional em tempo real:** Consumir `GET /api/v1/historico/kpis/tempo-real` (schema `KpiTempoRealResponse`) para exibir `total_ativos`, `pedidos_em_voo`, `concluidos`, `pontualidade_pct` e `eta_medio_seg`.

- **Frontend — Listagem de histórico:** Implementar tabela com `GET /api/v1/historico/` listando entregas realizadas. Adicionar filtros por `drone_id` e `farmacia_id`, parâmetros de query já suportados pelo backend.

- **Frontend — Gráficos por farmácia:** Usar `GET /api/v1/historico/kpis/farmacias` com bibliotecas como Recharts ou Chart.js para plotar evolução de pontualidade e volume de entregas por unidade.

- **UI/UX:** Tratar estados de "Carregando" e "Erro de Conexão" de forma elegante, mantendo consistência visual com o restante do dashboard. Os status possíveis são: `pendente | calculado | despachado | em_voo | entregue | cancelado | falha`.

  > ⚠️ **Correção crítica:** o endpoint `GET /api/v1/pedidos/estatisticas` mencionado em versões anteriores deste documento **não existe** na API. Todos os dados de KPI devem vir exclusivamente de `/api/v1/historico/`.

  > ℹ️ **Limitação:** a média de consumo de bateria por entrega não está disponível diretamente no endpoint de histórico. Para calculá-la, é necessário cruzar dados de `GET /api/v1/telemetria/{drone_id}/historico` com os registros de entrega — o que aumenta a complexidade da implementação.


----> O KPIs, foi implementado e esta tudo funcionando, no monitoramento as vezes da erro 404, testa ai
para ver se o seu da o mesmo tipo de problema   

---

## 4. UI/UX e Visualização do Mapa

### 4.1 — Alinhamento Visual (Preview Dashboard/Forms)

**Objetivo:** Refatorar o estilo CSS/Tailwind para corresponder fielmente aos arquivos de preview.

**Escopo:**

- Definir no `tailwind.config.ts` a paleta de cores exata (hexadecimais) dos previews para as variáveis `primary`, `secondary` e `accent`.
- Padronizar `border-radius` e `shadows` de todos os cards e botões para manter consistência visual entre a tela de monitoramento e a tela de criação de pedidos.
- Garantir que os labels de status exibidos na UI mapeiem exatamente os valores retornados pela API: `pendente | calculado | despachado | em_voo | entregue | cancelado | falha`. Evitar labels customizadas sem mapeamento explícito.

---

### 4.2 — Otimização de Experiência no Mapa (Leaflet)

**Objetivo:** Melhorar a visualização do `MapCanvas.tsx`.

**Escopo:**

- Implementar `map.fitBounds()` para ajuste automático de zoom ao iniciar o monitoramento, exibindo a farmácia e todos os pontos de entrega simultaneamente. Usar `GET /api/v1/mapa/rotas` (GeoJSON com LineString + Points por waypoint) como fonte de dados para o cálculo dos bounds.
- Adicionar legenda flutuante ou tooltips nos marcadores do drone e destinos com status atual, usando o campo `label` de `WaypointResponse` (ex: `"Drone 01 — Em deslocamento para Ponto B"`).
- Substituir o ícone padrão do Leaflet por marcador SVG personalizado que mude de cor conforme o drone conclui cada entrega da rota, usando o campo `seq` para identificar a ordem das paradas.

---

## Resumo Geral

| # | Área | Prompt | Status de Validação | Prioridade |
|---|------|--------|---------------------|------------|
| 1.1 | Monitoramento | Multi-destino e rastreamento sequencial | ⚠️ Escopo corrigido | Alta |
| 1.2 | Monitoramento | Validação de constraints | ⚠️ Detalhe de `bateria_pct` | Alta |
| 2.1 | Pedidos | Padronização de decimais | ⚠️ Formato de `coordenada` | Média |
| 2.2 | Pedidos | Correção da janela de entrega | ✅ Coerente | Alta |
| 3.1 | KPIs | Dashboard de KPIs | ❌ Endpoint corrigido | Média |
| 4.1 | UI/UX | Alinhamento visual | ✅ Sem impacto na spec | Baixa |
| 4.2 | UI/UX | Otimização do mapa Leaflet | ✅ Coerente | Média |

---

> **Referência:** validado contra `openapi.json` DronePharm API v2.1.0.
