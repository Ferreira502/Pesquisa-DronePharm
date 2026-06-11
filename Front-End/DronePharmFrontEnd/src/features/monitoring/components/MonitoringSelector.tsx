import { useEffect, useMemo, type ChangeEvent, type ReactElement } from "react";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { listPedidos } from "@/api/pedidos";
import { Skeleton } from "@/components/ui/skeleton";
import type { HTTPValidationError, PedidoResponse } from "@/types/api";

import {
  getMonitoringBadgeClassName,
  isPedidoSelectable,
} from "../monitoringUtils";

const QUERY_KEY = ["monitoring-pedidos"];
const QUERY_LIMIT = 100;
const PAGE_CLASS_NAME =
  "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)] px-6 py-8";
const CONTENT_CLASS_NAME =
  "mx-auto flex w-full max-w-[760px] flex-col gap-6 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-panel)] p-6";
const TITLE_CLASS_NAME = "text-xl font-semibold text-[var(--text-primary)]";
const DESCRIPTION_CLASS_NAME = "text-sm text-[var(--text-secondary)]";
const SELECT_WRAPPER_CLASS_NAME = "relative";
const SELECT_CLASS_NAME =
  "h-[38px] w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-3 pr-10 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)]";
const GRID_CLASS_NAME = "grid gap-3 md:grid-cols-2";
const CARD_CLASS_NAME =
  "rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]";
const EMPTY_STATE_CLASS_NAME =
  "rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 text-sm text-[var(--text-secondary)]";
const PLACEHOLDER_VALUE = "";

function isValidationError(error: unknown): error is HTTPValidationError {
  return typeof error === "object" && error !== null && "detail" in error;
}

function getErrorMessage(error: unknown): string {
  if (isValidationError(error)) {
    return error.detail?.[0]?.msg ?? "Falha ao carregar pedidos.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Falha ao carregar pedidos.";
}

function getPedidoDescription(pedido: PedidoResponse): string {
  if (pedido.descricao !== null && pedido.descricao.trim().length > 0) {
    return pedido.descricao;
  }

  return "Pedido sem descricao operacional.";
}

function renderChevron(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)]"
    >
      <svg
        width="12"
        height="8"
        viewBox="0 0 12 8"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1 1.5L6 6.5L11 1.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function renderLoadingState(): ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-10 rounded-[var(--radius-sm)]" />
      <div className={GRID_CLASS_NAME}>
        <Skeleton className="h-28 rounded-[var(--radius-md)]" />
        <Skeleton className="h-28 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

function renderPedidoPreviewCard(pedido: PedidoResponse): ReactElement {
  const badgeClassName = getMonitoringBadgeClassName(pedido.status);

  return (
    <article key={pedido.id} className={CARD_CLASS_NAME}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Pedido #{pedido.id}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Farmácia #{pedido.farmacia_id}
          </p>
        </div>
        <span
          className={`badge ${badgeClassName}`}
          translate="no"
        >
          {pedido.status}
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {getPedidoDescription(pedido)}
      </p>
    </article>
  );
}

export function MonitoringSelector(): ReactElement {
  const navigate = useNavigate();
  const pedidosQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listPedidos({ limite: QUERY_LIMIT }),
    staleTime: 10_000,
    refetchInterval: false,
  });
  const selectablePedidos = useMemo(() => {
    return (pedidosQuery.data?.pedidos ?? []).filter((pedido) =>
      isPedidoSelectable(pedido.status),
    );
  }, [pedidosQuery.data?.pedidos]);

  useEffect(() => {
    if (!pedidosQuery.isError) {
      return;
    }

    toast.error(getErrorMessage(pedidosQuery.error));
  }, [pedidosQuery.error, pedidosQuery.isError]);

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const nextPedidoId = Number(event.target.value);

    if (!Number.isInteger(nextPedidoId) || nextPedidoId <= 0) {
      return;
    }

    navigate(`/monitoramento/${nextPedidoId}`);
  }

  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={CONTENT_CLASS_NAME}>
        <header className="flex flex-col gap-2">
          <h1 className={TITLE_CLASS_NAME}>Selecionar Pedido</h1>
          <p className={DESCRIPTION_CLASS_NAME}>
            Escolha um pedido pendente ou calculado para abrir o dashboard de
            monitoramento.
          </p>
        </header>

        {pedidosQuery.isLoading ? renderLoadingState() : null}

        {!pedidosQuery.isLoading ? (
          <div className="flex flex-col gap-4">
            <label
              htmlFor="monitoring-pedido-select"
              className="text-sm font-medium text-[var(--text-secondary)]"
            >
              Pedido disponível
            </label>

            <div className={SELECT_WRAPPER_CLASS_NAME}>
              <select
                id="monitoring-pedido-select"
                name="monitoring-pedido-select"
                aria-label="Selecionar pedido para monitoramento"
                className={SELECT_CLASS_NAME}
                defaultValue={PLACEHOLDER_VALUE}
                onChange={handleChange}
              >
                <option value={PLACEHOLDER_VALUE} disabled>
                  Selecione um pedido para monitorar
                </option>
                {selectablePedidos.map((pedido) => (
                  <option key={pedido.id} value={pedido.id}>
                    Pedido #{pedido.id} · {pedido.status}
                  </option>
                ))}
              </select>
              {renderChevron()}
            </div>

            {selectablePedidos.length === 0 ? (
              <div className={EMPTY_STATE_CLASS_NAME}>
                Nenhum pedido pendente ou calculado está disponível no momento.
              </div>
            ) : (
              <div className={GRID_CLASS_NAME}>
                {selectablePedidos.map(renderPedidoPreviewCard)}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
