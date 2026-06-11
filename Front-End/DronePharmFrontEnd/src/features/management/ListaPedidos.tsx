import {
  memo,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { listFarmacias } from "@/api/farmacias";
import { cancelarPedido, listPedidos } from "@/api/pedidos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { cn } from "@/lib/utils";
import type {
  FarmaciaResponse,
  PedidoResponse,
  PedidoStatus,
  PrioridadeEnum,
} from "@/types/api";

import { useFarmaciasStore } from "../farmacias/store/useFarmaciasStore";
import { usePedidosStore } from "./store/usePedidosStore";

const PAGE_SIZE = 10;
const QUERY_STALE_TIME = 10_000;
const FARMACIAS_STALE_TIME = 30_000;
const NOVO_PEDIDO_ROUTE_PATH = "/pedidos/novo";
const PAGE_CLASS_NAME = "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)]";
const TOPBAR_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-panel)]";
const TOPBAR_CONTENT_CLASS_NAME =
  "mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between gap-4 px-6";
const CONTENT_CLASS_NAME =
  "mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-6 py-8";
const FILTERS_CLASS_NAME =
  "grid gap-4 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 md:grid-cols-4";
const SECTION_HEADER_CLASS_NAME = "flex items-end justify-between gap-4";
const TITLE_CLASS_NAME = "text-xl font-semibold text-[var(--text-primary)]";
const DESCRIPTION_CLASS_NAME = "text-sm text-[var(--text-secondary)]";
const FILTER_INPUT_CLASS_NAME =
  "h-[38px] w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-3 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)]";
const FILTER_SELECT_CLASS_NAME =
  "h-[38px] w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-input)] px-3 pr-10 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-focus)]";
const TABLE_WRAPPER_CLASS_NAME =
  "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)]";
const TABLE_CLASS_NAME = "w-full border-separate border-spacing-0";
const HEAD_CELL_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-overlay)] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.07em] text-[var(--text-muted)]";
const BODY_CELL_CLASS_NAME =
  "border-b border-[var(--surface-border)] px-4 py-3 text-sm text-[var(--text-primary)]";
const DATA_FONT_CLASS_NAME = "[font-family:var(--font-data)]";
const PAGINATION_CLASS_NAME =
  "flex items-center justify-between border-t border-[var(--surface-border)] bg-[var(--surface-panel)] px-4 py-3";
const EMPTY_STATE_CLASS_NAME =
  "flex min-h-[180px] flex-col items-center justify-center gap-4 px-6 py-10 text-center";
const DIALOG_CONTENT_CLASS_NAME =
  "border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--text-primary)]";
const DIALOG_FOOTER_CLASS_NAME =
  "border-[var(--surface-border)] bg-[var(--surface-panel)]";
const SEARCH_PLACEHOLDER = "Buscar por ID ou descrição";
const EMPTY_STATE_MESSAGE = "Nenhum pedido cadastrado";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar os pedidos.";
const CANCEL_SUCCESS_MESSAGE = "Pedido cancelado com sucesso.";
const CANCEL_ERROR_MESSAGE = "Não foi possível cancelar o pedido.";
const ROTAS_PENDING_MESSAGE = "A tela de roteirização será conectada na próxima etapa.";
const WEIGHT_DECIMAL_PLACES = 2;

type StatusFilterValue = "todos" | PedidoStatus;
type PrioridadeFilterValue = "todas" | `${PrioridadeEnum}`;
type FarmaciaFilterValue = "todas" | `${number}`;

interface PedidoRowProps {
  pedido: PedidoResponse;
  farmacia: FarmaciaResponse | undefined;
  onCancelar: (pedido: PedidoResponse) => Promise<void>;
}

interface StatusBadgeConfig {
  label: string;
  className: string;
  icon?: ReactElement;
}

interface PrioridadeConfig {
  label: string;
  className: string;
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "-";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function formatPeso(pesoKg: number): string {
  return `${pesoKg.toFixed(WEIGHT_DECIMAL_PLACES)} kg`;
}

function getPrioridadeConfig(prioridade: PrioridadeEnum): PrioridadeConfig {
  switch (prioridade) {
    case 1:
      return {
        label: "P1",
        className: "bg-[var(--status-danger)]",
      };
    case 2:
      return {
        label: "P2",
        className: "bg-[var(--status-info)]",
      };
    case 3:
    default:
      return {
        label: "P3",
        className: "bg-[var(--text-muted)]",
      };
  }
}

function getStatusBadgeConfig(status: PedidoStatus): StatusBadgeConfig {
  switch (status) {
    case "pendente":
      return {
        label: "Pendente",
        className:
          "border-transparent bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]",
      };
    case "calculado":
      return {
        label: "Calculado",
        className:
          "border-transparent bg-[var(--status-info-bg)] text-[var(--status-info)]",
      };
    case "despachado":
      return {
        label: "Despachado",
        className:
          "border-transparent bg-[var(--status-info-bg)] text-[var(--status-info)]",
      };
    case "em_voo":
      return {
        label: "Em voo",
        className:
          "border-transparent bg-[var(--status-lock-bg)] text-[var(--status-lock)]",
        icon: <Lock className="size-3" />,
      };
    case "entregue":
      return {
        label: "Entregue",
        className:
          "border-transparent bg-[var(--status-ok-bg)] text-[var(--status-ok)]",
      };
    case "cancelado":
      return {
        label: "Cancelado",
        className:
          "border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
      };
    case "falha":
    default:
      return {
        label: "Falha",
        className:
          "border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
        icon: <AlertTriangle className="size-3" />,
      };
  }
}

function shouldShowCancelAction(status: PedidoStatus): boolean {
  return status === "pendente" || status === "calculado";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return CANCEL_ERROR_MESSAGE;
}

function renderSelectChevron(): ReactElement {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--text-secondary)]">
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

function PedidoRowComponent({
  pedido,
  farmacia,
  onCancelar,
}: PedidoRowProps): ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const prioridadeConfig = getPrioridadeConfig(pedido.prioridade);
  const statusBadgeConfig = getStatusBadgeConfig(pedido.status);

  return (
    <tr className="transition-colors duration-150 hover:bg-[var(--surface-overlay)]">
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>{pedido.id}</td>
      <td className={BODY_CELL_CLASS_NAME}>
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2 rounded-full", prioridadeConfig.className)}
            aria-hidden="true"
          />
          <span>{prioridadeConfig.label}</span>
        </div>
      </td>
      <td className={BODY_CELL_CLASS_NAME}>{farmacia?.nome ?? `#${pedido.farmacia_id}`}</td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatPeso(pedido.peso_kg)}
      </td>
      <td className={BODY_CELL_CLASS_NAME}>
        <Badge className={cn("gap-1 rounded-[var(--radius-sm)] px-2 py-0.5", statusBadgeConfig.className)}>
          {statusBadgeConfig.icon}
          <span>{statusBadgeConfig.label}</span>
        </Badge>
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatDateTime(pedido.janela_fim)}
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatDateTime(pedido.criado_em)}
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, "text-right")}>
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/monitoramento/${pedido.id}`}>Ver</Link>
          </Button>

          {shouldShowCancelAction(pedido.status) ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Cancelar
                </Button>
              </DialogTrigger>

              <DialogContent className={DIALOG_CONTENT_CLASS_NAME}>
                <DialogHeader>
                  <DialogTitle>Cancelar pedido</DialogTitle>
                  <DialogDescription>
                    Confirma o cancelamento do pedido #{pedido.id}?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className={DIALOG_FOOTER_CLASS_NAME}>
                  <DialogClose asChild>
                    <Button variant="outline">Fechar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setIsDialogOpen(false);
                        void onCancelar(pedido);
                      }}
                    >
                      Confirmar
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

const PedidoRow = memo(
  PedidoRowComponent,
  (previousProps, nextProps) =>
    previousProps.pedido.id === nextProps.pedido.id &&
    previousProps.pedido.status === nextProps.pedido.status
);

export function ListaPedidos(): ReactElement {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("todos");
  const [prioridadeFilter, setPrioridadeFilter] =
    useState<PrioridadeFilterValue>("todas");
  const [farmaciaFilter, setFarmaciaFilter] =
    useState<FarmaciaFilterValue>("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const pedidos = usePedidosStore((state) => state.pedidos);
  const setPedidos = usePedidosStore((state) => state.setPedidos);
  const removerPedido = usePedidosStore((state) => state.remover);
  const farmacias = useFarmaciasStore((state) => state.farmacias);
  const setFarmacias = useFarmaciasStore((state) => state.setFarmacias);
  const pedidosQuery = useQuery({
    queryKey: ["pedidos"],
    queryFn: () => listPedidos(),
    staleTime: QUERY_STALE_TIME,
  });
  const farmaciasQuery = useQuery({
    queryKey: ["farmacias"],
    queryFn: listFarmacias,
    staleTime: FARMACIAS_STALE_TIME,
    enabled: farmacias.length === 0,
  });

  useEffect(() => {
    if (pedidosQuery.data === undefined) {
      return;
    }

    setPedidos(pedidosQuery.data.pedidos);
  }, [pedidosQuery.data, setPedidos]);

  useEffect(() => {
    if (farmaciasQuery.data === undefined) {
      return;
    }

    setFarmacias(
      farmaciasQuery.data.farmacias.filter((farmacia) => farmacia.ativa),
    );
  }, [farmaciasQuery.data, setFarmacias]);

  const farmaciasMap = useMemo(
    () => new Map(farmacias.map((farmacia) => [farmacia.id, farmacia])),
    [farmacias]
  );

  const farmaciasFilterOptions = useMemo(
    () =>
      farmacias.map((farmacia) => ({
        value: String(farmacia.id),
        label: farmacia.nome,
      })),
    [farmacias]
  );

  const filteredPedidos = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return pedidos.filter((pedido) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        String(pedido.id).includes(normalizedSearch) ||
        (pedido.descricao ?? "").toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter !== "todos" && pedido.status !== statusFilter) {
        return false;
      }

      if (
        prioridadeFilter !== "todas" &&
        String(pedido.prioridade) !== prioridadeFilter
      ) {
        return false;
      }

      if (
        farmaciaFilter !== "todas" &&
        String(pedido.farmacia_id) !== farmaciaFilter
      ) {
        return false;
      }

      return true;
    });
  }, [farmaciaFilter, pedidos, prioridadeFilter, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPedidos.length / PAGE_SIZE));
  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredPedidos.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredPedidos]);

  async function handleCancelar(pedido: PedidoResponse): Promise<void> {
    try {
      await cancelarPedido(pedido.id);
      removerPedido(pedido.id);
      await queryClient.invalidateQueries({
        queryKey: ["pedidos"],
      });
      toast.success(CANCEL_SUCCESS_MESSAGE);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>): void {
    setStatusFilter(event.target.value as StatusFilterValue);
    setCurrentPage(1);
  }

  function handlePrioridadeChange(event: ChangeEvent<HTMLSelectElement>): void {
    setPrioridadeFilter(event.target.value as PrioridadeFilterValue);
    setCurrentPage(1);
  }

  function handleFarmaciaChange(event: ChangeEvent<HTMLSelectElement>): void {
    setFarmaciaFilter(event.target.value as FarmaciaFilterValue);
    setCurrentPage(1);
  }

  if (pedidosQuery.isLoading) {
    return <FormSkeleton className="min-h-[calc(100dvh-56px)]" />;
  }

  if (pedidosQuery.isError) {
    return (
      <section className={PAGE_CLASS_NAME}>
        <div className={CONTENT_CLASS_NAME}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--surface-card)] p-6">
            <h1 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
              Falha ao carregar pedidos
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {getErrorMessage(pedidosQuery.error) || LOAD_ERROR_MESSAGE}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={TOPBAR_CLASS_NAME}>
        <div className={TOPBAR_CONTENT_CLASS_NAME}>
          <div />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast.info(ROTAS_PENDING_MESSAGE);
              }}
            >
              Calcular Rotas
            </Button>
            <Button asChild>
              <Link to={NOVO_PEDIDO_ROUTE_PATH}>Novo Pedido</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className={CONTENT_CLASS_NAME}>
        <header className={SECTION_HEADER_CLASS_NAME}>
          <div className="flex flex-col gap-1">
            <h1 className={TITLE_CLASS_NAME}>Pedidos</h1>
            <p className={DESCRIPTION_CLASS_NAME}>
              {filteredPedidos.length} registro(s) encontrado(s)
            </p>
          </div>
        </header>

        <section className={FILTERS_CLASS_NAME}>
          <input
            type="search"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={SEARCH_PLACEHOLDER}
            className={FILTER_INPUT_CLASS_NAME}
          />

          <div className="relative">
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className={FILTER_SELECT_CLASS_NAME}
            >
              <option value="todos">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="calculado">Calculado</option>
              <option value="despachado">Despachado</option>
              <option value="em_voo">Em voo</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
              <option value="falha">Falha</option>
            </select>
            {renderSelectChevron()}
          </div>

          <div className="relative">
            <select
              value={prioridadeFilter}
              onChange={handlePrioridadeChange}
              className={FILTER_SELECT_CLASS_NAME}
            >
              <option value="todas">Todas as prioridades</option>
              <option value="1">P1</option>
              <option value="2">P2</option>
              <option value="3">P3</option>
            </select>
            {renderSelectChevron()}
          </div>

          <div className="relative">
            <select
              value={farmaciaFilter}
              onChange={handleFarmaciaChange}
              className={FILTER_SELECT_CLASS_NAME}
            >
              <option value="todas">Todas as farmácias</option>
              {farmaciasFilterOptions.map((farmacia) => (
                <option key={farmacia.value} value={farmacia.value}>
                  {farmacia.label}
                </option>
              ))}
            </select>
            {renderSelectChevron()}
          </div>
        </section>

        <section className={TABLE_WRAPPER_CLASS_NAME}>
          {filteredPedidos.length === 0 ? (
            <div className={EMPTY_STATE_CLASS_NAME}>
              <p className="text-sm text-[var(--text-muted)]">
                {EMPTY_STATE_MESSAGE}
              </p>
              <Button asChild>
                <Link to={NOVO_PEDIDO_ROUTE_PATH}>Novo Pedido</Link>
              </Button>
            </div>
          ) : (
            <>
              <table className={TABLE_CLASS_NAME}>
                <thead>
                  <tr>
                    <th className={HEAD_CELL_CLASS_NAME}>ID</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Prioridade</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Farmácia</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Peso</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Status</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Janela</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Criado em</th>
                    <th className={cn(HEAD_CELL_CLASS_NAME, "text-right")}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.map((pedido) => (
                    <PedidoRow
                      key={pedido.id}
                      pedido={pedido}
                      farmacia={farmaciasMap.get(pedido.farmacia_id)}
                      onCancelar={handleCancelar}
                    />
                  ))}
                </tbody>
              </table>

              <div className={PAGINATION_CLASS_NAME}>
                <p className="text-sm text-[var(--text-muted)]">
                  Página {currentPage} de {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((page) => Math.max(1, page - 1));
                    }}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage((page) => Math.min(totalPages, page + 1));
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}

export default ListaPedidos;
