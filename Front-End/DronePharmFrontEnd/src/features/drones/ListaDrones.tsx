import {
  memo,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { listDrones } from "@/api/drones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { cn } from "@/lib/utils";
import type { DroneResponse, StatusDroneEnum } from "@/types/api";

import { BateriaIndicador } from "./BateriaIndicador";
import { getStatusBadgeConfig } from "./droneUi";
import DroneEditorDrawer from "./DroneEditorDrawer";
import { useDronesStore } from "./store/useDronesStore";

const PAGE_SIZE = 10;
const QUERY_STALE_TIME = 15_000;
const NOVO_DRONE_ROUTE_PATH = "/drones/novo";
const PAGE_CLASS_NAME = "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)]";
const TOPBAR_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-panel)]";
const TOPBAR_CONTENT_CLASS_NAME =
  "mx-auto flex h-14 w-full max-w-[1080px] items-center justify-between gap-4 px-6";
const CONTENT_CLASS_NAME =
  "mx-auto flex w-full max-w-[1080px] flex-col gap-6 px-6 py-8";
const SECTION_HEADER_CLASS_NAME = "flex items-end justify-between gap-4";
const TITLE_CLASS_NAME = "text-xl font-semibold text-[var(--text-primary)]";
const DESCRIPTION_CLASS_NAME = "text-sm text-[var(--text-secondary)]";
const FILTERS_CLASS_NAME =
  "grid gap-4 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 md:grid-cols-[260px_1fr]";
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
const EMPTY_STATE_MESSAGE = "Nenhum drone cadastrado";
const LOAD_ERROR_MESSAGE = "Não foi possível carregar os drones.";

type StatusFilterValue = "todos" | StatusDroneEnum;

interface DroneRowProps {
  drone: DroneResponse;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return LOAD_ERROR_MESSAGE;
}

function formatNumber(value: number, suffix: string): string {
  return `${value.toFixed(1)} ${suffix}`;
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

function DroneRowComponent({ drone }: DroneRowProps): ReactElement {
  const statusBadgeConfig = getStatusBadgeConfig(drone.status);

  return (
    <tr className="transition-colors duration-150 hover:bg-[var(--surface-overlay)]">
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>{drone.id}</td>
      <td className={BODY_CELL_CLASS_NAME}>{drone.nome}</td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatNumber(drone.autonomia_max_km, "km")}
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatNumber(drone.capacidade_max_kg, "kg")}
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatNumber(drone.velocidade_ms, "m/s")}
      </td>
      <td className={BODY_CELL_CLASS_NAME}>
        <BateriaIndicador bateriaPct={drone.bateria_pct ?? null} />
      </td>
      <td className={BODY_CELL_CLASS_NAME}>
        <Badge className={cn("rounded-[var(--radius-sm)] px-2 py-0.5", statusBadgeConfig.className)}>
          {statusBadgeConfig.label}
        </Badge>
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, "text-right")}>
        <Button asChild variant="outline" size="sm">
          <Link to={`/drones/${drone.id}/editar`}>Editar</Link>
        </Button>
      </td>
    </tr>
  );
}

const DroneRow = memo(
  DroneRowComponent,
  (previousProps, nextProps) =>
    previousProps.drone.id === nextProps.drone.id &&
    previousProps.drone.status === nextProps.drone.status &&
    previousProps.drone.bateria_pct === nextProps.drone.bateria_pct
);

export function ListaDrones(): ReactElement {
  const navigate = useNavigate();
  const { droneId } = useParams<{ droneId?: string }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const drones = useDronesStore((state) => state.drones);
  const setDrones = useDronesStore((state) => state.setDrones);
  const dronesQuery = useQuery({
    queryKey: ["drones"],
    queryFn: () => listDrones(),
    staleTime: QUERY_STALE_TIME,
  });

  useEffect(() => {
    if (dronesQuery.data === undefined) {
      return;
    }

    setDrones(dronesQuery.data.drones);
  }, [dronesQuery.data, setDrones]);

  const filteredDrones = useMemo(() => {
    if (statusFilter === "todos") {
      return drones;
    }

    return drones.filter((drone) => drone.status === statusFilter);
  }, [drones, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDrones.length / PAGE_SIZE));
  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredDrones.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredDrones]);

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>): void {
    setCurrentPage(1);
    setStatusFilter(event.target.value as StatusFilterValue);
  }

  function handleCloseDrawer(): void {
    navigate("/drones", { replace: true });
  }

  if (dronesQuery.isLoading) {
    return <FormSkeleton className="min-h-[calc(100dvh-56px)]" />;
  }

  if (dronesQuery.isError) {
    return (
      <section className={PAGE_CLASS_NAME}>
        <div className={CONTENT_CLASS_NAME}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--surface-card)] p-6">
            <h1 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
              Falha ao carregar drones
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {getErrorMessage(dronesQuery.error)}
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
          <Button asChild>
            <Link to={NOVO_DRONE_ROUTE_PATH}>Novo Drone</Link>
          </Button>
        </div>
      </div>

      <div className={CONTENT_CLASS_NAME}>
        <header className={SECTION_HEADER_CLASS_NAME}>
          <div className="flex flex-col gap-1">
            <h1 className={TITLE_CLASS_NAME}>Drones</h1>
            <p className={DESCRIPTION_CLASS_NAME}>
              {filteredDrones.length} registro(s) encontrado(s)
            </p>
          </div>
        </header>

        <section className={FILTERS_CLASS_NAME}>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className={FILTER_SELECT_CLASS_NAME}
            >
              <option value="todos">Todos</option>
              <option value="aguardando">Aguardando</option>
              <option value="em_voo">Em voo</option>
              <option value="retornando">Retornando</option>
              <option value="carregando">Carregando</option>
              <option value="manutencao">Manutenção</option>
              <option value="emergencia">Emergência</option>
            </select>
            {renderSelectChevron()}
          </div>
        </section>

        <section className={TABLE_WRAPPER_CLASS_NAME}>
          {filteredDrones.length === 0 ? (
            <div className={EMPTY_STATE_CLASS_NAME}>
              <p className="text-sm text-[var(--text-muted)]">
                {EMPTY_STATE_MESSAGE}
              </p>
              <Button asChild>
                <Link to={NOVO_DRONE_ROUTE_PATH}>Novo Drone</Link>
              </Button>
            </div>
          ) : (
            <>
              <table className={TABLE_CLASS_NAME}>
                <thead>
                  <tr>
                    <th className={HEAD_CELL_CLASS_NAME}>ID</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Modelo</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Autonomia</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Carga máx.</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Velocidade</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Bateria</th>
                    <th className={HEAD_CELL_CLASS_NAME}>Status</th>
                    <th className={cn(HEAD_CELL_CLASS_NAME, "text-right")}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageItems.map((drone) => (
                    <DroneRow key={drone.id} drone={drone} />
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

      {droneId !== undefined ? (
        <DroneEditorDrawer droneId={droneId} onClose={handleCloseDrawer} />
      ) : null}
    </section>
  );
}

export default ListaDrones;
