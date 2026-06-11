import {
  memo,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  atualizarFarmacia,
  desativarFarmacia,
  listFarmacias,
} from "@/api/farmacias";
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
import type { FarmaciaResponse } from "@/types/api";

import { useFarmaciasStore } from "./store/useFarmaciasStore";

const PAGE_SIZE = 10;
const QUERY_STALE_TIME = 30_000;
const CREATE_ROUTE_PATH = "/farmacias/nova";
const PAGE_CLASS_NAME = "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)]";
const TOPBAR_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-panel)]";
const TOPBAR_CONTENT_CLASS_NAME =
  "mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between gap-4 px-6";
const BREADCRUMB_CLASS_NAME = "flex items-center gap-2 text-sm";
const BREADCRUMB_CURRENT_CLASS_NAME = "text-[var(--text-primary)]";
const CONTENT_CLASS_NAME =
  "mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-6 py-8";
const SECTION_HEADER_CLASS_NAME =
  "flex items-end justify-between gap-4";
const TITLE_CLASS_NAME = "text-xl font-semibold text-[var(--text-primary)]";
const DESCRIPTION_CLASS_NAME = "text-sm text-[var(--text-secondary)]";
const FILTERS_CLASS_NAME =
  "grid gap-4 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 md:grid-cols-[minmax(0,1fr)_220px]";
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
const STATUS_ACTIVE_CLASS_NAME =
  "border-transparent bg-[var(--status-ok-bg)] text-[var(--status-ok)]";
const STATUS_INACTIVE_CLASS_NAME =
  "border-transparent bg-[var(--status-neutral-bg)] text-[var(--status-neutral)]";
const STATUS_DEPOSIT_CLASS_NAME =
  "border-transparent bg-[rgba(59,130,246,0.14)] text-[rgb(37,99,235)]";
const DIALOG_CONTENT_CLASS_NAME =
  "border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--text-primary)]";
const DIALOG_FOOTER_CLASS_NAME =
  "border-[var(--surface-border)] bg-[var(--surface-panel)]";
const DEPOSIT_WARNING_MESSAGE =
  "A farmácia-polo não pode ser desativada. Reative outra unidade para assumir o depósito, se necessário.";
const SEARCH_PLACEHOLDER = "Buscar por nome ou cidade";
const EMPTY_STATE_MESSAGE = "Nenhuma farmácia cadastrada";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar as farmácias.";
const DEACTIVATE_SUCCESS_MESSAGE = "Farmácia desativada com sucesso.";
const REACTIVATE_SUCCESS_MESSAGE = "Farmácia reativada com sucesso.";
const UPDATE_ERROR_MESSAGE = "Não foi possível atualizar a farmácia.";

type StatusFilterValue = "todas" | "ativas" | "inativas";

interface FarmaciaRowProps {
  farmacia: FarmaciaResponse;
  onReativar: (farmacia: FarmaciaResponse) => Promise<void>;
  onDesativar: (farmacia: FarmaciaResponse) => Promise<void>;
}

function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function getStatusBadgeClassName(ativa: boolean): string {
  return ativa ? STATUS_ACTIVE_CLASS_NAME : STATUS_INACTIVE_CLASS_NAME;
}

function getStatusLabel(ativa: boolean): string {
  return ativa ? "Ativa" : "Inativa";
}

function getDepositBadgeClassName(deposito: boolean): string | null {
  return deposito ? STATUS_DEPOSIT_CLASS_NAME : null;
}

function getDepositLabel(deposito: boolean): string | null {
  return deposito ? "Depósito" : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return UPDATE_ERROR_MESSAGE;
}

function FarmaciaRowComponent({
  farmacia,
  onReativar,
  onDesativar,
}: FarmaciaRowProps): ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <tr className="transition-colors duration-150 hover:bg-[var(--surface-overlay)]">
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {farmacia.id}
      </td>
      <td className={BODY_CELL_CLASS_NAME}>{farmacia.nome}</td>
      <td className={BODY_CELL_CLASS_NAME}>{farmacia.cidade}</td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatCoordinates(farmacia.latitude, farmacia.longitude)}
      </td>
      <td className={BODY_CELL_CLASS_NAME}>
        <div className="flex items-center gap-2">
          <Badge className={getStatusBadgeClassName(farmacia.ativa)}>
            {getStatusLabel(farmacia.ativa)}
          </Badge>
          {farmacia.deposito ? (
            <Badge className={getDepositBadgeClassName(farmacia.deposito) ?? undefined}>
              {getDepositLabel(farmacia.deposito)}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, "text-right")}>
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/farmacias/${farmacia.id}/editar`}>Editar</Link>
          </Button>

          {farmacia.ativa && !farmacia.deposito ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Desativar
                </Button>
              </DialogTrigger>

              <DialogContent className={DIALOG_CONTENT_CLASS_NAME}>
                <DialogHeader>
                  <DialogTitle>Desativar farmácia</DialogTitle>
                  <DialogDescription>
                    Confirma a desativação da farmácia {farmacia.nome}?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className={DIALOG_FOOTER_CLASS_NAME}>
                  <DialogClose asChild>
                    <Button variant="outline">Cancelar</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setIsDialogOpen(false);
                        void onDesativar(farmacia);
                      }}
                    >
                      Confirmar
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : farmacia.ativa && farmacia.deposito ? (
            <Button variant="destructive" size="sm" disabled title={DEPOSIT_WARNING_MESSAGE}>
              Desativar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                void onReativar(farmacia);
              }}
            >
              Reativar
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

const FarmaciaRow = memo(
  FarmaciaRowComponent,
  (previousProps, nextProps) =>
    previousProps.farmacia.id === nextProps.farmacia.id &&
    previousProps.farmacia.ativa === nextProps.farmacia.ativa &&
    previousProps.farmacia.nome === nextProps.farmacia.nome
);

export function ListaFarmacias(): ReactElement {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("todas");
  const [currentPage, setCurrentPage] = useState(1);
  const farmacias = useFarmaciasStore((state) => state.farmacias);
  const setFarmacias = useFarmaciasStore((state) => state.setFarmacias);
  const atualizarFarmaciaStore = useFarmaciasStore((state) => state.atualizar);
  const removerFarmaciaStore = useFarmaciasStore((state) => state.remover);
  const farmaciasQuery = useQuery({
    queryKey: ["farmacias"],
    queryFn: listFarmacias,
    staleTime: QUERY_STALE_TIME,
  });

  useEffect(() => {
    if (farmaciasQuery.data === undefined) {
      return;
    }

    setFarmacias(
      farmaciasQuery.data.farmacias.filter((farmacia) => farmacia.ativa),
    );
  }, [farmaciasQuery.data, setFarmacias]);

  async function handleReativar(farmacia: FarmaciaResponse): Promise<void> {
    try {
      const farmaciaAtualizada = await atualizarFarmacia(farmacia.id, {
        ativa: true,
      });

      atualizarFarmaciaStore(farmaciaAtualizada);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmacias"] }),
        queryClient.invalidateQueries({ queryKey: ["farmacias", "deposito"] }),
        queryClient.invalidateQueries({ queryKey: ["mapa", "snapshot"] }),
      ]);
      toast.success(REACTIVATE_SUCCESS_MESSAGE);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDesativar(farmacia: FarmaciaResponse): Promise<void> {
    try {
      await desativarFarmacia(farmacia.id);
      removerFarmaciaStore(farmacia.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmacias"] }),
        queryClient.invalidateQueries({ queryKey: ["farmacias", "deposito"] }),
        queryClient.invalidateQueries({ queryKey: ["mapa", "snapshot"] }),
      ]);
      toast.success(DEACTIVATE_SUCCESS_MESSAGE);
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

  const filteredFarmacias = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return farmacias.filter((farmacia) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        farmacia.nome.toLowerCase().includes(normalizedSearch) ||
        farmacia.cidade.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "ativas") {
        return farmacia.ativa;
      }

      if (statusFilter === "inativas") {
        return !farmacia.ativa;
      }

      return true;
    });
  }, [farmacias, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFarmacias.length / PAGE_SIZE));
  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredFarmacias.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredFarmacias]);

  if (farmaciasQuery.isLoading) {
    return <FormSkeleton className="min-h-[calc(100dvh-56px)]" />;
  }

  if (farmaciasQuery.isError) {
    return (
      <section className={PAGE_CLASS_NAME}>
        <div className={CONTENT_CLASS_NAME}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--surface-card)] p-6">
            <h1 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
              Falha ao carregar farmácias
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {getErrorMessage(farmaciasQuery.error) || LOAD_ERROR_MESSAGE}
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
          <nav aria-label="Breadcrumb" className={BREADCRUMB_CLASS_NAME}>
            <span className={BREADCRUMB_CURRENT_CLASS_NAME}>Farmácias</span>
          </nav>

          <Button asChild>
            <Link to={CREATE_ROUTE_PATH}>Nova Farmácia</Link>
          </Button>
        </div>
      </div>

      <div className={CONTENT_CLASS_NAME}>
        <header className={SECTION_HEADER_CLASS_NAME}>
          <div className="flex flex-col gap-1">
            <h1 className={TITLE_CLASS_NAME}>Farmácias</h1>
            <p className={DESCRIPTION_CLASS_NAME}>
              {filteredFarmacias.length} registro(s) encontrado(s)
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
              <option value="todas">Todas</option>
              <option value="ativas">Ativas</option>
              <option value="inativas">Inativas</option>
            </select>
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
          </div>
        </section>

        <section className={TABLE_WRAPPER_CLASS_NAME}>
          {filteredFarmacias.length === 0 ? (
            <div className={EMPTY_STATE_CLASS_NAME}>
              <p className="text-sm text-[var(--text-muted)]">
                {EMPTY_STATE_MESSAGE}
              </p>
              <Button asChild>
                <Link to={CREATE_ROUTE_PATH}>Nova Farmácia</Link>
              </Button>
            </div>
          ) : (
            <>
              <table className={TABLE_CLASS_NAME}>
                <thead>
                  <tr>
                    <th className={HEAD_CELL_CLASS_NAME}>ID</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Nome</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Cidade</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Coordenadas</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Telefone</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Status</th>
                    <th className={cn(HEAD_CELL_CLASS_NAME, "text-right")}>
                      Operação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.map((farmacia) => (
                    <FarmaciaRow
                      key={farmacia.id}
                      farmacia={farmacia}
                      onReativar={handleReativar}
                      onDesativar={handleDesativar}
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

export default ListaFarmacias;
