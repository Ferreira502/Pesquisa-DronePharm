# DronePharm — Guia de Desenvolvimento Frontend

---

## Como usar este guia

1. **Inicie toda conversa nova com o PROMPT 00** — ele é auto-suficiente e ancora tudo
2. Nos prompts seguintes, referencie arquivos já criados pelo caminho — nunca repita código
3. Para ajustes pontuais: envie só o trecho com problema + instrução de uma linha
4. Se a IA alucinar imports: *"Use apenas dependências já declaradas no projeto"*

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | `npm -v` |

---

## Criando o Projeto

### 1. Scaffold com Vite + React + TypeScript

```bash
npm create vite@latest dronepharm-frontend -- --template react-ts
cd dronepharm-frontend
npm install
```

### 2. Instalar Tailwind CSS v4

```bash
npm install tailwindcss @tailwindcss/vite
```

Substitua o conteúdo de `src/index.css`:

```css
@import "tailwindcss";
```

### 3. Configurar alias de path no TypeScript

Em `tsconfig.app.json` e em `tsconfig.json`, adicione dentro de `compilerOptions`:

```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

> ⚠️ Não adicione `"baseUrl"` — depreciado no TypeScript 6.0. O `paths` com caminho relativo explícito funciona sozinho com `moduleResolution: "bundler"`. O bloco em `tsconfig.json` raiz é necessário apenas para o Shadcn CLI localizar o alias; o TypeScript o ignora na compilação real.

Instale o tipo necessário para o alias funcionar no Vite:

```bash
npm install -D @types/node
```

### 4. Inicializar Shadcn/UI

```bash
npx shadcn@latest init
```

O wizard fará as seguintes perguntas — respostas sugeridas:

```
✔ Select a component library » Radix
✔ Which preset would you like to use? » Nova (ou Default)
✔ Which color would you like to use as base color? » Zinc
```

> O Shadcn instala automaticamente `clsx`, `tailwind-merge` e `sonner` como dependências.

Adicione os componentes usados no projeto:

```bash
npx shadcn@latest add button badge card dialog tooltip skeleton slider switch sonner
```

### 5. Instalar dependências do projeto

```bash
# Server state
npm install @tanstack/react-query@^5.99.0 @tanstack/react-query-devtools@^5.99.0

# Client state
npm install zustand@^5.0.12

# Mapa
npm install react-leaflet@^5.0.0 leaflet@^1.9.4
npm install -D @types/leaflet

# Ícones (usado pelo Shadcn e componentes)
npm install lucide-react
```

### 6. Instalar dependências de desenvolvimento e testes

```bash
npm install -D vitest @vitest/coverage-v8
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D jsdom
```

### 7. Configurar variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_API_TOKEN=<valor do REST_WRITE_TOKEN>
```

> ⚠️ O `.env.local` nunca deve ser commitado. Confirme que está no `.gitignore`.
>
> Sobre os tokens do backend:
> - `REST_WRITE_TOKEN` → usado pelo frontend (operações de pedidos). Vai em `VITE_API_TOKEN`.
> - `REST_ADMIN_TOKEN` → apenas se houver tela admin. Avaliar proxy se o sistema for exposto publicamente.
> - `REST_INGEST_TOKEN` → **nunca no frontend**. Exclusivo do hardware (Arduino/drone). Se vazar, qualquer pessoa pode injetar telemetria falsa.

### 8. Configurar Vitest e vite.config.ts — arquivo final

Substitua **todo** o conteúdo de `vite.config.ts`:

```ts
import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
```

> Note o import de `vitest/config` em vez de `vite` — evita conflito de tipos.

Crie o arquivo `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

### 9. Configurar scripts no package.json

Adicione ou atualize a seção `scripts` em `package.json`:

```json
{
  "scripts": {
    "dev":      "vite",
    "build":    "tsc -b && vite build",
    "preview":  "vite preview",
    "test":     "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

### 10. Configurar main.tsx — arquivo final completo

Substitua **todo** o conteúdo de `src/main.tsx`:

```tsx
import 'leaflet/dist/leaflet.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/sonner'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: 2 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster richColors position="top-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

> O import do `leaflet.css` deve ser o **primeiro** import do arquivo — antes de qualquer outro CSS.

### 11. Criar os dois arquivos de estilo

```css
━━━ ARQUIVO 1: src/styles/tokens.css ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Variáveis CSS globais com @layer base. Aplicar via :root com classe .dark no html.

/* Superficies */
--surface-base:     #0a0e14;   /* fundo da aplicação inteira */
--surface-panel:    #0f1520;   /* painel lateral, sidebar */
--surface-card:     #151c2a;   /* cards, containers elevados */
--surface-overlay:  #1a2236;   /* hover, tooltips, dropdowns */
--surface-input:    #111827;   /* fundo de inputs e selects */
--surface-border:   #1e2d45;   /* bordas de separação */

/* Texto */
--text-primary:     #e8edf5;   /* títulos, valores principais */
--text-secondary:   #8a9bb8;   /* labels, descrições */
--text-muted:       #4a5878;   /* placeholders, desabilitado */
--text-inverse:     #0a0e14;   /* texto sobre fundos coloridos */

/* Acento principal — verde operacional */
--accent:           #00ff9c;   /* rota no mapa, ícone do drone, foco ativo */
--accent-dim:       #00cc7a;   /* hover do acento */
--accent-ghost:     rgba(0,255,156,0.08);

/* Estados semanticos */
--status-ok:        #22c55e;
--status-ok-bg:     rgba(34,197,94,0.10);
--status-warn:      #f59e0b;
--status-warn-bg:   rgba(245,158,11,0.10);
--status-danger:    #ef4444;
--status-danger-bg: rgba(239,68,68,0.10);
--status-info:      #3b82f6;
--status-info-bg:   rgba(59,130,246,0.10);
--status-lock:      #8b5cf6;
--status-lock-bg:   rgba(139,92,246,0.10);
--status-neutral:   #64748b;
--status-neutral-bg:rgba(100,116,139,0.10);

/* Tipografia */
--font-ui:   'Inter', system-ui, sans-serif;
--font-data: 'JetBrains Mono', 'Fira Code', monospace;

/* Escala de texto */
--text-xs:   0.75rem;
--text-sm:   0.875rem;
--text-base: 1rem;
--text-lg:   1.125rem;
--text-xl:   1.5rem;
--text-2xl:  2rem;

/* Espacamento */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;

/* Bordas */
--radius-sm: 0.375rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;

/* Sombras */
--shadow-card:  0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--surface-border);
--shadow-focus: 0 0 0 2px var(--accent);

/* Transicoes */
--transition-fast: 120ms ease;
--transition-base: 200ms ease;

━━━ ARQUIVO 2: src/styles/design-system.md ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# DronePharm — Design System

## Principio geral
Centro de comando noturno. Fundo escuro profundo (#0a0e14), sem gradientes
decorativos. Informação em primeiro lugar — cada pixel serve a uma metrica ou acao.
O verde (#00ff9c) é exclusivo do drone e da rota ativa; nao usar em UI generica.
Nao usar emojis em nenhuma parte da interface.

---

## 1. Layout — Dashboard (OrderMonitoringDashboard)

- Tela cheia: 100dvh, sem scroll na raiz
- MapCanvas: 70% da largura, flex-shrink 0
- Painel lateral: 30%, min-width 320px, max-width 420px
- Fundo do painel: var(--surface-panel)
- Borda esquerda do painel: 1px solid var(--surface-border)
- Painel: overflow-y auto, scrollbar-width thin

---

## 2. Layout — Paginas de Cadastro

Usado em: CadastroPedido, CadastroDrone, CadastroFarmacia e similares.

Estrutura da pagina:
  - Fundo: var(--surface-base)
  - Topbar: 56px de altura, fundo var(--surface-panel),
    borda inferior 1px solid var(--surface-border)
    Contem: breadcrumb a esquerda + botao de acao principal a direita
  - Conteudo: max-width 760px, centralizado, padding 32px 24px
  - Titulo da pagina: var(--font-ui), 1.25rem, font-weight 600,
    cor var(--text-primary), margin-bottom 4px
  - Subtitulo/descricao: var(--text-sm), cor var(--text-secondary),
    margin-bottom 32px

Estrutura do formulario:
  - Container: var(--surface-card), border-radius var(--radius-lg),
    border 1px solid var(--surface-border), padding 28px
  - Secoes do form separadas por: margin-top 24px + linha 1px solid
    var(--surface-border) + margin-bottom 24px
  - Titulo de secao: var(--text-sm), font-weight 500,
    cor var(--text-secondary), text-transform uppercase,
    letter-spacing 0.07em, margin-bottom 16px

---

## 3. Inputs e Selects

Regra geral — aplicar em todos os inputs, selects e textareas:
  - Fundo: var(--surface-input)
  - Borda: 1px solid var(--surface-border)
  - Border-radius: var(--radius-sm)
  - Cor do texto: var(--text-primary)
  - Placeholder: var(--text-muted)
  - Padding: 0 12px, height 38px (textarea: padding 10px 12px)
  - Fonte: var(--font-ui), var(--text-sm)
  - Transicao: border-color var(--transition-fast)

  Foco:
    - border-color: var(--accent)
    - outline: none
    - box-shadow: var(--shadow-focus)

  Erro de validacao:
    - border-color: var(--status-danger)
    - box-shadow: 0 0 0 2px rgba(239,68,68,0.20)

  Desabilitado:
    - opacity: 0.45
    - cursor: not-allowed
    - background: var(--surface-border)

Label do campo:
  - Fonte: var(--font-ui), var(--text-sm), font-weight 500
  - Cor: var(--text-secondary)
  - margin-bottom: 6px
  - display: block

Mensagem de erro inline (abaixo do input):
  - Fonte: var(--text-xs)
  - Cor: var(--status-danger)
  - margin-top: 4px

Campo obrigatorio:
  - Adicionar asterisco (*) apos o label
  - Cor do asterisco: var(--status-danger)
  - Nao usar texto "obrigatorio"

---

## 4. Tabelas de Listagem (List Pages)

Usado em: ListaPedidos, ListaDrones, HistoricoRotas e similares.

Container da pagina: igual ao layout de cadastro (topbar + max-width 1100px)

Tabela:
  - Width: 100%
  - Border-collapse: separate, border-spacing: 0
  - Background: var(--surface-card)
  - Border: 1px solid var(--surface-border)
  - Border-radius: var(--radius-lg)
  - Overflow: hidden

  Cabecalho (thead):
    - Background: var(--surface-overlay)
    - th: padding 10px 16px, text-align left
    - Fonte: var(--font-ui), var(--text-xs), font-weight 500
    - Cor: var(--text-muted), text-transform uppercase, letter-spacing 0.07em
    - Borda inferior: 1px solid var(--surface-border)

  Linhas (tbody tr):
    - td: padding 12px 16px
    - Fonte: var(--font-ui), var(--text-sm), cor var(--text-primary)
    - Borda inferior: 1px solid var(--surface-border)
    - Ultima linha: sem borda inferior
    - Hover: background var(--surface-overlay), transicao var(--transition-fast)
    - Cursor: pointer se a linha for clicavel

  Coluna de acoes (ultima coluna):
    - Text-align: right
    - Botoes com altura 30px, padding 0 10px
    - Usar variante ghost para acoes secundarias

  Estado vazio da tabela:
    - Linha unica centralizada, altura 120px
    - Texto: var(--text-muted), var(--text-sm)
    - Sem iconografia decorativa

  Paginacao (abaixo da tabela):
    - Fundo: var(--surface-panel)
    - Borda superior: 1px solid var(--surface-border)
    - Padding: 12px 16px
    - Display: flex, justify-content space-between, align-items center
    - Texto de contagem: var(--text-sm), cor var(--text-muted)
    - Botoes Anterior / Proximo: variante ghost, height 32px

---

## 5. Cards de Telemetria (TelemetryGrid)

Estrutura de cada card:
  - Fundo: var(--surface-card)
  - Borda: 1px solid var(--surface-border)
  - Border-radius: var(--radius-md)
  - Padding: var(--space-4)
  - Sombra: var(--shadow-card)

  Label: var(--font-ui), var(--text-sm), var(--text-secondary),
         uppercase, letter-spacing 0.06em

  Valor: var(--font-data), var(--text-xl), var(--text-primary),
         font-variant-numeric tabular-nums

  Unidade: var(--font-ui), var(--text-sm), var(--text-muted),
           margin-left var(--space-1)

  Bateria < 20%:
    - Borda: var(--status-danger)
    - Fundo: var(--status-danger-bg)
    - Icone AlertTriangle (lucide, 14px) antes do label

  Bateria 20–40%:
    - Borda: var(--status-warn)
    - Fundo: var(--status-warn-bg)

  Skeleton: Shadcn Skeleton, valor 32px, label 12px

---

## 6. Badges de Status

  pendente   → var(--status-neutral-bg) / var(--status-neutral)
  calculado  → var(--status-info-bg)    / var(--status-info)
  despachado → var(--status-info-bg)    / var(--status-info)
  em_voo     → var(--status-lock-bg)    / var(--status-lock)
               + icone Lock (lucide, 12px) antes do texto
  entregue   → var(--status-ok-bg)      / var(--status-ok)
  cancelado  → var(--status-danger-bg)  / var(--status-danger)
  falha      → var(--status-danger-bg)  / var(--status-danger)
               + icone AlertTriangle (lucide, 12px) antes do texto

  Forma: border-radius var(--radius-sm), padding 2px 8px
  Fonte: var(--font-ui), var(--text-sm), font-weight 500

---

## 7. Flight Lock (em_voo)

Container de acoes quando status === 'em_voo':
  - Fundo: var(--status-lock-bg)
  - Borda: 1px solid var(--status-lock) com opacity 0.4
  - Border-radius: var(--radius-md)
  - Padding: var(--space-3) var(--space-4)
  - Mensagem: var(--status-lock), var(--text-sm)
  - Icone Lock (lucide, 14px) antes da mensagem

  Botoes dentro do lock:
    - opacity: 0.35
    - cursor: not-allowed
    - pointer-events: none
    - NAO usar apenas atributo disabled

---

## 8. Botoes

  Primario: bg var(--accent), text var(--text-inverse), font-weight 600
    hover: bg var(--accent-dim)

  Secundario/Ghost: bg transparent, text var(--text-secondary),
    borda 1px solid var(--surface-border)
    hover: bg var(--surface-overlay), text var(--text-primary)

  Destrutivo: bg var(--status-danger-bg), text var(--status-danger),
    borda 1px solid rgba(239,68,68,0.35)
    hover: bg rgba(239,68,68,0.18)

  Desabilitado: opacity 0.35, cursor not-allowed, pointer-events none

  Tamanho padrao: height 36px, padding 0 16px, var(--text-sm)
  Tamanho pequeno: height 30px, padding 0 10px, var(--text-xs)
  Transicao: var(--transition-fast)

---

## 9. ReplayTimeline

  Container: var(--surface-overlay), var(--radius-lg),
    1px solid var(--surface-border), padding var(--space-4)

  Switch ativo: track com var(--accent)
  Label: var(--text-secondary), var(--text-sm)

  Slider:
    - Track: var(--surface-border)
    - Range preenchido: var(--accent)
    - Thumb: var(--accent), 14px x 14px

  Botoes de velocidade:
    - Inativo: bg var(--surface-border), text var(--text-muted)
    - Ativo: bg var(--accent-ghost), text var(--accent),
      borda 1px solid rgba(0,255,156,0.30)
    - Fonte: var(--font-data), var(--text-sm)

  Timestamp: var(--font-data), var(--text-xs), var(--text-muted)

---

## 10. Mapa (MapCanvas)

  TileLayer: CartoDB Dark Matter
  Rota: stroke var(--accent) = #00ff9c, weight 3, opacity 0.9
  Icone do drone: SVG triangular, fill var(--accent), 24x24px
  Circle de destino: stroke var(--status-warn), fill transparent, radius 15m
  Marker de destino: fill var(--status-warn)

---

## 11. Toasts (sonner)

  Erro (422, falha):   toast.error()
  Sucesso:             toast.success()
  Informacao (lock):   toast.info()
  Posicao: top-right, richColors true

---

## 12. Topbar de paginas internas

  Altura: 56px
  Fundo: var(--surface-panel)
  Borda inferior: 1px solid var(--surface-border)
  Padding horizontal: 24px
  Display: flex, align-items center, justify-content space-between

  Breadcrumb (esquerda):
    - Separador: "/" em var(--text-muted)
    - Item atual: var(--text-primary), font-weight 500
    - Itens anteriores: var(--text-secondary), clicaveis, hover var(--text-primary)
    - Fonte: var(--text-sm)

  Acoes (direita):
    - Botao primario de criacao: height 34px
    - Se houver filtros: botao ghost de mesmo tamanho a esquerda do primario

---

## 13. Regras absolutas

1. Numeros de telemetria e dados tabelados: sempre var(--font-data)
2. O verde #00ff9c é exclusivo do drone/rota — nao usar em botoes ou badges
3. Nao usar emojis em nenhum elemento da interface
4. Estados desabilitados: opacity 0.35 + cursor not-allowed + pointer-events none
   NAO usar apenas o atributo HTML disabled sem estilizacao
5. Nao usar box-shadow decorativas — apenas var(--shadow-card) e var(--shadow-focus)
6. Cores sempre via variaveis CSS — nunca hardcoded nos componentes
7. Bordas de separacao sempre var(--surface-border) — nunca classes gray-* do Tailwind
8. Transicoes: apenas var(--transition-fast) ou var(--transition-base)
9. Nao usar icones como decoracao — apenas quando carregam significado operacional
10. Inputs sempre com label explicito acima — nunca apenas placeholder

```


---

## Scripts disponíveis

```bash
npm run dev        # Servidor de desenvolvimento (http://localhost:5173)
npm run build      # Build de produção (output em /dist)
npm run preview    # Prévia do build de produção
npm run test       # Vitest em modo watch
npm run coverage   # Vitest com relatório de cobertura
```

---

## Resumo de versões

| Pacote | Versão | Observação |
|---|---|---|
| react / react-dom | ^19.0.0 | |
| typescript | ^5.7.0 | |
| vite | ^6.0.0 | |
| tailwindcss | ^4.1.0 | |
| @tailwindcss/vite | ^4.1.0 | |
| shadcn/ui | latest (via CLI) | |
| clsx | auto | instalado pelo shadcn init |
| tailwind-merge | auto | instalado pelo shadcn init |
| sonner | auto | instalado pelo shadcn add sonner |
| @tanstack/react-query | ^5.99.0 | |
| zustand | ^5.0.12 | |
| react-leaflet | ^5.0.0 | |
| leaflet | ^1.9.4 | |
| lucide-react | ^0.400.0 | |
| vitest | ^3.0.0 | |
| react-hook-form | ^7.73.1 | |
| "zod":  | ^4.3.6"| |
| react-router-dom| ^7.14.2 | |
| @hookform/resolvers": | ^5.2.2 | |

---

## PROMPT 00 — Contextualização (cole para iniciar qualquer conversa)

```
Atue como Dev Frontend Sênior especializado em Contract-Driven Development.

Projeto: DronePharm — sistema de monitoramento de entregas de medicamentos via drones.
O openapi.json arquivo contido em src\docs\openapi.json é a fonte da verdade. Toda tipagem e toda chamada de API derivam
exclusivamente dele. Não invente campos, não assuma payloads, não alucine rotas.

━━━ STACK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

UI:           React 19 + TypeScript 5 + Tailwind v4 + Shadcn/UI (tema dark via classe)
Server State: TanStack Query v5 (@tanstack/react-query ^5.99)
Client State: Zustand v5 (^5.0.12)
Mapa:         React-Leaflet v5 (^5.0.0) + Leaflet 1.9.4
HTTP:         fetch nativo com wrapper tipado (src/api/client.ts)
Testes:       Vitest v3 + React Testing Library v16
Build:        Vite v6 — vite.config.ts usa import de 'vitest/config', não 'vite'
Toasts:       sonner — sempre import { toast } from 'sonner'

━━━ REGRAS GLOBAIS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. strict: true no tsconfig — proibido any, as any, @ts-ignore
2. Toda interface deriva dos tipos abaixo — nunca improvise campos
3. Funções com responsabilidade única (máx ~40 linhas)
4. Constantes nomeadas — proibido magic numbers/strings inline
5. Sem comentários óbvios — o nome do símbolo deve se explicar
6. Erros tratados explicitamente — nunca ignore o catch
7. Sem barrel exports (index.ts) — apenas exports nomeados diretos

━━━ ESTRUTURA DE PASTAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/
├── api/
│   ├── client.ts              # fetch wrapper + error handling + auth header
│   ├── pedidos.ts             # getPedido, getPedidoAtivo, listPedidos, cancelarPedido, entregarPedido
│   ├── rotas.ts               # calcularRotas, getHistoricoRotas, concluirRota, abortarRota
│   ├── telemetria.ts          # postTelemetria, getUltimaTelemetria
│   └── drones.ts              # listDrones, getDrone
├── types/
│   └── api.ts                 # TODAS as interfaces — geradas do contrato
├── features/
│   └── monitoring/
│       ├── components/
│       │   ├── MapCanvas.tsx
│       │   ├── TelemetryGrid.tsx
│       │   ├── StatusControl.tsx
│       │   └── ReplayTimeline.tsx
│       ├── hooks/
│       │   ├── useOrderStream.ts  # WebSocket /ws/telemetria/{drone_id}
│       │   └── useReplayEngine.ts
│       └── store/
│           └── useTelemetryStore.ts
└── lib/
    └── utils.ts               # cn(), formatEta(), calcBearing(), lerp()

━━━ TIPOS (src/types/api.ts) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Enums ───────────────────────────────────────────────────────────────────

export type PedidoStatus =
  | 'pendente' | 'calculado' | 'despachado'
  | 'em_voo'   | 'entregue'  | 'cancelado' | 'falha';

export type PrioridadeEnum = 1 | 2 | 3; // 1=Urgente 2=Normal 3=Reabastec

export type StatusDroneEnum =
  | 'aguardando' | 'em_voo' | 'retornando'
  | 'carregando' | 'manutencao' | 'emergencia';

// ─── Coordenada ──────────────────────────────────────────────────────────────

export interface CoordenadaSchema {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat] — INVERTIDO em relação ao Leaflet
}

// ─── Pedidos ─────────────────────────────────────────────────────────────────

export interface PedidoCreate {
  latitude: number;
  longitude: number;
  peso_kg: number;
  prioridade: PrioridadeEnum;
  descricao?: string | null;
  farmacia_id: number;
  janela_fim?: string | null; // ISO 8601; auto-calculado por prioridade se omitido
}

export interface PedidoUpdate {
  descricao?: string | null;
  janela_fim?: string | null;
}

export interface PedidoResponse {
  id: number;
  latitude: number;
  longitude: number;
  peso_kg: number;
  prioridade: PrioridadeEnum;
  descricao: string | null;
  farmacia_id: number;
  rota_id: number | null;
  status: PedidoStatus;
  janela_fim: string | null;
  criado_em: string;
  entregue_em: string | null;
  despachado_em: string | null;
  estimativa_entrega_em: string | null;
  coordenada: CoordenadaSchema; // readOnly
}

export interface PedidoListResponse {
  total: number;
  pedidos: PedidoResponse[];
  offset: number;
  has_more: boolean;
}

// ─── Pedido Ativo (tracking enriquecido) ─────────────────────────────────────

export interface PosicaoAtualResponse {
  latitude: number | null;
  longitude: number | null;
  altitude_m: number | null;
  atualizado_em: string | null;
}

export interface PedidoResumoTrackingResponse {
  prioridade: PrioridadeEnum;
  descricao?: string | null;
  farmacia_id: number;
  janela_fim?: string | null;
}

export interface PedidoAtivoResponse {
  pedido_id: number;
  status: PedidoStatus;
  pedido: PedidoResumoTrackingResponse;
  rota: RotaResponse | null;
  drone: DroneResponse | null;
  posicao_atual: PosicaoAtualResponse | null;
  eta_segundos: number | null;
  tempo_decorrido_s: number | null;
  criado_em: string;
  despachado_em: string | null;
  estimativa_entrega_em: string | null;
}

// ─── Rotas ───────────────────────────────────────────────────────────────────

export interface WaypointResponse {
  seq: number;
  latitude: number;
  longitude: number;
  altitude: number;
  label: string;
}

export interface RotaResponse {
  id: number;
  drone_id: string;
  pedido_ids: number[];
  waypoints: WaypointResponse[];
  distancia_km: number;
  tempo_min: number;
  energia_wh: number;
  carga_kg: number;
  custo: number;
  viavel: boolean;
  geracoes_ga: number;
  status: string;
  criada_em: string;
  concluida_em: string | null;
}

export interface RoteirizarRequest {
  drone_id: string;
  pedido_ids?: number[] | null; // null = todos os pendentes
  forcar_recalc?: boolean;
  vento_ms?: number | null;
}

export interface RoteirizarResponse {
  sucesso: boolean;
  rotas: RotaResponse[];
  total_voos: number;
  distancia_total_km: number;
  tempo_total_min: number;
  energia_total_wh: number;
  mensagem: string;
  calculado_em: string;
}

export interface KpiRotaResponse {
  rota_id: number;
  drone_id: string;
  distancia_real_km: number;
  tempo_real_min: number;
  desvio_distancia_pct: number;
  desvio_tempo_pct: number;
  pedidos_entregues: number;
  energia_consumida_wh: number;
  concluida_em: string;
}

// ─── Telemetria ──────────────────────────────────────────────────────────────

export interface TelemetriaCreate {
  drone_id: string;
  latitude: number;
  longitude: number;
  altitude_m?: number;    // default 0
  velocidade_ms?: number; // default 0
  bateria_pct: number;    // 0.0 – 1.0
  vento_ms?: number;      // default 0
  direcao_vento?: number; // 0–360, default 0
  status?: string;        // default "em_voo"
  timestamp?: string | null;
}

export interface TelemetriaResponse {
  id: number;
  drone_id: string;
  latitude: number;
  longitude: number;
  altitude_m: number;
  velocidade_ms: number;
  bateria_pct: number; // 0.0 – 1.0
  vento_ms: number;
  direcao_vento: number;
  status: string;
  criado_em: string;
}

// ─── Drones ──────────────────────────────────────────────────────────────────

export interface DroneResponse {
  id: string;
  modelo: string;
  autonomia_km: number;
  carga_max_kg: number;
  velocidade_ms: number;
  status: StatusDroneEnum;
  bateria_pct: number | null; // 0.0 – 1.0
  criado_em: string;
}

export interface DroneListResponse {
  total: number;
  drones: DroneResponse[];
}

// ─── Mapa ────────────────────────────────────────────────────────────────────

export interface MapaRotasResponse {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    properties: { rota_id: number; drone_id: string; status: string; pedido_ids: number[] };
  }>;
  total: number;
  gerado_em: string;
}

// ─── Erros & WebSocket ───────────────────────────────────────────────────────

export interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationErrorDetail[];
}

// Payload broadcast WS /ws/telemetria/{drone_id}
export type WSTelemetriaPayload = TelemetriaResponse;

━━━ ENDPOINTS DE REFERÊNCIA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Pedidos
POST   /api/v1/pedidos/                     → PedidoResponse
GET    /api/v1/pedidos/                     → PedidoListResponse
GET    /api/v1/pedidos/pendentes            → PedidoListResponse
GET    /api/v1/pedidos/{id}                 → PedidoResponse
PATCH  /api/v1/pedidos/{id}                 → PedidoResponse
GET    /api/v1/pedidos/{id}/ativo           → PedidoAtivoResponse  ← tracking principal
PATCH  /api/v1/pedidos/{id}/cancelar        → {}
PATCH  /api/v1/pedidos/{id}/entregar        → {}

# Roteirização
POST   /api/v1/rotas/calcular               → RoteirizarResponse
GET    /api/v1/rotas/historico              → RotaResponse[]
GET    /api/v1/rotas/{id}                   → RotaResponse
PATCH  /api/v1/rotas/{id}/concluir          → KpiRotaResponse
PATCH  /api/v1/rotas/{id}/abortar           → {}
GET    /api/v1/rotas/{id}/kpis              → KpiRotaResponse

# Telemetria
POST   /api/v1/telemetria                   → TelemetriaResponse
GET    /api/v1/telemetria/{drone_id}/ultima → TelemetriaResponse

# Drones
GET    /api/v1/drones/                      → DroneListResponse
GET    /api/v1/drones/{id}                  → DroneResponse
GET    /api/v1/drones/{id}/historico        → TelemetriaResponse[]

# Mapa
GET    /api/v1/mapa/rotas                   → MapaRotasResponse (GeoJSON)

# WebSocket
WS     /ws/telemetria/{drone_id}            → broadcast WSTelemetriaPayload

━━━ NOTAS DE NEGÓCIO CRÍTICAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- bateria_pct é 0.0–1.0. Na UI: (bateria_pct * 100).toFixed(0) + '%'
- velocidade_ms é m/s. Para km/h: velocidade_ms * 3.6
- coordenada.coordinates é [lng, lat] — invertido em relação ao Leaflet ([lat, lng])
- Cancelamento só funciona em 'pendente' ou 'calculado' — 422 em outros status
- Flight Lock: 'em_voo' bloqueia ações manuais — trate o 422 com toast.error()
- PedidoAtivoResponse já consolida rota + drone + GPS + ETA — use como fonte primária
- WebSocket usa drone_id (ex: "DP-01"), não pedido_id
- Toasts: sempre import { toast } from 'sonner' — nunca do componente Shadcn antigo
- Autenticação: Bearer token em todas as requisições REST
  Header: Authorization: Bearer <token>
  Valor: import.meta.env.VITE_API_TOKEN (REST_WRITE_TOKEN do backend)
  REST_INGEST_TOKEN é exclusivo do hardware — nunca usar no frontend

  ━━━ DIRETRIZES TÉCNICAS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. src/styles/design-system.md (Visual e UI)

2. docs/react-best-practices.md (Performance e Hooks)

3. docs/openapi.json (Contrato da API e Tipagem)

Todo código gerado deve consultar e seguir rigorosamente as regras de performance em docs/react-best-practices.md e o sistema visual em src/styles/design-system.md

 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ao receber este prompt, NÃO gere nenhum código ainda. Apenas responda confirmando que você leu e compreendeu a stack tecnológica, o sistema de tokens em src/styles/tokens.css, o contrato da API em docs/openapi.json e as diretrizes de performance em docs/react-best-practices.md. Aguarde o meu comando para iniciar o PROMPT 0.5 (Utils)."
```

---

## Prompts de Desenvolvimento

> Cada prompt abaixo pressupõe que o **PROMPT 00** já foi enviado na mesma conversa.

---

### PROMPT 0.1 — Design System & Visual Tokens

```
Siga rigorosamente src/styles/design-system.md para todas as decisões visuais.
Importe as variáveis de src/styles/tokens.css onde necessário.
Não use cores hardcoded — apenas as variáveis CSS definidas no design system.

Adicionar no final de cada prompt.
```

---

### PROMPT 0.2 — Engenharia

```
"Sempre que eu pedir um componente, aplique automaticamente as regras de 'Eliminating waterfalls' e 'Re-render optimization' do arquivo de best practices.

Usar para reforçar as boas práticas.
```

---

### PROMPT 0.5 — Utils

```
Crie src/lib/utils.ts com as quatro funções utilitárias do projeto.

Dependências disponíveis: clsx, tailwind-merge (instaladas pelo Shadcn init).

cn(...inputs: ClassValue[]): string
  Combina clsx + tailwind-merge para merge seguro de classes Tailwind.
  Importe ClassValue de 'clsx'.

formatEta(segundos: number): string
  Converte segundos em string legível.
  Ex: 125 → "2min 5s" | 59 → "59s" | 0 → "0s"

calcBearing(from: [number, number], to: [number, number]): number
  Calcula ângulo em graus (0–360) entre dois pontos [lat, lng].
  Retorna 0 se os pontos forem idênticos.

lerp(a: number, b: number, t: number): number
  Interpolação linear: a + (b - a) * t

Tipagem estrita. Exports nomeados — sem default export.
```

---

### PROMPT 1 — Zustand Store

```
Crie src/features/monitoring/store/useTelemetryStore.ts usando Zustand v5.

Tipos (importar de src/types/api.ts): TelemetriaResponse, WSTelemetriaPayload

Estado:
  currentFrame: TelemetriaResponse | null
  history: TelemetriaResponse[]
  isReplaying: boolean

Ações:
  setFrame(frame: TelemetriaResponse): void
  appendHistory(frame: TelemetriaResponse): void
  setReplaying(value: boolean): void
  reset(): void

Use create<T> com tipagem explícita. Exporte o hook e o tipo StoreState.
```

---

### PROMPT 2 — WebSocket Hook

```
Crie src/features/monitoring/hooks/useOrderStream.ts.

Parâmetro: droneId: string
WebSocket URL: `${import.meta.env.VITE_WS_URL}/ws/telemetria/${droneId}`
Payload: WSTelemetriaPayload (importar de src/types/api.ts)

Comportamento:
- Ao receber mensagem: chama setFrame e appendHistory do useTelemetryStore
- Reconexão automática com backoff exponencial (base 1s, máx 5 tentativas)
- Retorna: { connected: boolean; error: string | null }
- Cleanup completo no unmount (fecha socket, cancela timers)

Sem mock. Esqueleto de produção com tratamento de erro explícito.
```

---

### PROMPT 3 — API Client + Pedidos

```
Crie src/api/client.ts e src/api/pedidos.ts.

client.ts:
  apiFetch<T>(path: string, init?: RequestInit): Promise<T>
  - Base URL: import.meta.env.VITE_API_URL
  - Header obrigatório em toda requisição:
      Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}`
  - Resposta não-ok: lança HTTPValidationError se Content-Type JSON,
    senão Error genérico com status
  Tipos: HTTPValidationError (de src/types/api.ts)

pedidos.ts (usa apiFetch):
  getPedido(id: number): Promise<PedidoResponse>
  getPedidoAtivo(id: number): Promise<PedidoAtivoResponse>
  listPedidos(params?: { status?: PedidoStatus; limite?: number; offset?: number }): Promise<PedidoListResponse>
  cancelarPedido(id: number): Promise<void>
  entregarPedido(id: number): Promise<void>

Tipo de retorno explícito em todas. Sem try/catch interno — o caller decide.

Consulte o docs/openapi.json para garantir que todos os métodos do apiClient e as interfaces em src/types/api.ts estejam 100% alinhados com o contrato do backend
```

---

### PROMPT 4 — TelemetryGrid

```
Crie src/features/monitoring/components/TelemetryGrid.tsx.

Props: etaSegundos: number | null
Fonte adicional: useTelemetryStore (currentFrame, history).
Tipos: TelemetriaResponse (de src/types/api.ts).
Utilitários: formatEta (de src/lib/utils.ts).

6 cards Shadcn/UI em grid 2×3:
  Velocidade (km/h)  → velocidade_ms * 3.6
  Altitude (m)       → altitude_m
  Bateria (%)        → bateria_pct * 100
  ETA                → formatEta(etaSegundos)
  Tempo Decorrido    → diff entre criado_em do primeiro e último frame do history[]
  Vento (m/s)        → vento_ms

Regras visuais:
- bateria_pct < 0.20: borda vermelha + ícone AlertTriangle (lucide-react)
- currentFrame === null: Skeleton Shadcn em todos os cards

Tema dark. Sem lógica inline no JSX — extraia funções nomeadas.
```

---

### PROMPT 5 — MapCanvas

```
Crie src/features/monitoring/components/MapCanvas.tsx.

Props:
  pedidoAtivo: PedidoAtivoResponse
  currentFrame: TelemetriaResponse | null

Tipos: PedidoAtivoResponse, TelemetriaResponse, WaypointResponse (de src/types/api.ts).
Utilitários: calcBearing (de src/lib/utils.ts).

React-Leaflet v5:
1. TileLayer CartoDB Dark Matter:
   "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
2. Polyline dos waypoints (pedidoAtivo.rota?.waypoints)
   cor #00FF9C, weight 3
   ATENÇÃO: WaypointResponse usa {latitude, longitude} — Leaflet espera [lat, lng]
3. Marker no último waypoint + Circle radius=15 cor amarela
4. Marker do drone se currentFrame !== null:
   - Ícone SVG triangular #00FF9C
   - Bearing calculado com calcBearing() entre frame anterior e atual
   - Rotaciona via CSS transform rotate(${bearing}deg)
5. fitBounds nos waypoints ao montar

Extraia waypointToLatLng(w: WaypointResponse): [number, number] como função nomeada.
```

---

### PROMPT 6 — StatusControl

```
Crie src/features/monitoring/components/StatusControl.tsx.

Props:
  status: PedidoStatus
  pedidoId: number
  onCancelar: () => void
  onEntregar: () => void

Tipos: PedidoStatus (de src/types/api.ts).

Máquina de estados visível:
  pendente   → badge cinza "Pendente"
  calculado  → botão "Cancelar Pedido" habilitado
  despachado → badge azul "Despachado"
  em_voo     → FLIGHT LOCK: botões disabled + ícone Lock + tooltip
               "Operação bloqueada durante voo"
               + botão "Confirmar Entrega Manual" (disabled até WS liberar)
  entregue   → badge verde "Entregue ✓"
  cancelado  → badge vermelho "Cancelado"
  falha      → badge laranja "Falha"

"Cancelar Pedido": visível em pendente e calculado.
  → Dialog Shadcn de confirmação antes de chamar onCancelar.

"Confirmar Entrega Manual": visível apenas em em_voo.
  → Dialog Shadcn antes de chamar onEntregar.

Shadcn/UI: Button, Badge, Dialog, Tooltip. Tema dark.
```

---

### PROMPT 7 — ReplayTimeline

```
Crie src/features/monitoring/components/ReplayTimeline.tsx.

Lê do useTelemetryStore: history, isReplaying, setReplaying, setFrame.
Tipos: TelemetriaResponse (de src/types/api.ts).
Utilitários: lerp (de src/lib/utils.ts).

UI (Shadcn/UI):
- Switch "Modo Replay"
- Slider: 0 → history.length - 1
- Botões de velocidade: 0.5× | 1× | 2× | 4×
- Label com criado_em do frame atual formatado (pt-BR)

Lógica:
- useRef para intervalId e índice atual
- Intervalo base: 1000ms / multiplicador
- LERP entre frames consecutivos em latitude, longitude, altitude_m, velocidade_ms
  usando lerp() de src/lib/utils.ts:
    t = (Date.now() - Date.parse(frame[i].criado_em))
      / (Date.parse(frame[i+1].criado_em) - Date.parse(frame[i].criado_em))
- Ao atingir último frame: clearInterval + setReplaying(false)
- Ao desativar Switch: clearInterval, mantém posição atual

Sem useEffect aninhado. Use useRef + setInterval limpo no callback do Switch.
```

---

### PROMPT 8 — Dashboard Principal

```
Crie src/features/monitoring/OrderMonitoringDashboard.tsx.

Props: pedidoId: number

TanStack Query v5:
  queryKey: ['pedido-ativo', pedidoId]
  queryFn: getPedidoAtivo(pedidoId) de src/api/pedidos.ts
  staleTime: 10_000
  refetchInterval: false

Monta useOrderStream(pedidoAtivo.drone?.id ?? '') quando drone?.id disponível.

Layout 100vh sem scroll:
  [MapCanvas 70%] | [Painel lateral 30%]

Painel lateral (flex col, gap-4, overflow-y-auto):
  1. Header: "Pedido #${id}" + Badge de status
  2. TelemetryGrid (etaSegundos={pedidoAtivo.eta_segundos})
  3. StatusControl
  4. ReplayTimeline

Callbacks:
  onCancelar → cancelarPedido(pedidoId) → invalidateQueries(['pedido-ativo', pedidoId])
  onEntregar → entregarPedido(pedidoId) → invalidateQueries(['pedido-ativo', pedidoId])
  Erro 422: import { toast } from 'sonner' → toast.error(err.detail[0].msg)

Loading: Skeleton tela cheia. Error: mensagem + botão refetch.
Sem lógica de negócio inline — apenas composição e orquestração.
```

---

### PROMPT 9 — Testes

```
Escreva testes para StatusControl.tsx com Vitest + React Testing Library.

Tipos: PedidoStatus (de src/types/api.ts).

Factory:
  const makeProps = (status: PedidoStatus) => ({
    status,
    pedidoId: 1,
    onCancelar: vi.fn(),
    onEntregar: vi.fn(),
  })

Casos obrigatórios:
1. status='em_voo' → todos os botões com atributo disabled
2. status='pendente' → botão "Cancelar Pedido" visível e habilitado
3. status='calculado' → "Cancelar Pedido" → Dialog → confirmar → onCancelar chamado 1×
4. status='calculado' → "Cancelar Pedido" → Dialog → cancelar → onCancelar NÃO chamado
5. status='entregue' → Badge "Entregue ✓" visível, sem botões de ação
6. status='em_voo' → botão "Confirmar Entrega Manual" presente mas disabled

Sem snapshots. Queries semânticas: getByRole, getByText, queryByRole.
```

---

## Ordem de Execução

| # | Prompt | Entrega |
|---|--------|---------|
| 00 | Contextualização | Âncora de toda conversa — sempre primeiro |
| 0.5 | Utils | cn, formatEta, calcBearing, lerp |
| 1 | Zustand Store | Estado volátil de telemetria |
| 2 | WebSocket Hook | Stream em tempo real + reconexão |
| 3 | API Client + Pedidos | Camada HTTP tipada + auth header |
| 4 | TelemetryGrid | Cards de métricas com alertas |
| 5 | MapCanvas | Mapa Leaflet v5 + drone animado |
| 6 | StatusControl | Flight Lock + máquina de estados |
| 7 | ReplayTimeline | LERP + controles de velocidade |
| 8 | Dashboard | Composição final + TanStack Query |
| 9 | Testes | Casos críticos do StatusControl |
