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