import {
  memo,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronDown,
  Clock3,
  PackageCheck,
  RefreshCw,
  Route as RouteIcon,
  Scale,
} from "lucide-react";

import { listDrones } from "@/api/drones";
import { listFarmacias } from "@/api/farmacias";
import {
  getKpisFarmacias,
  getKpisGerais,
  getKpisTempoReal,
  listHistorico,
} from "@/api/historico";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { cn, formatEta } from "@/lib/utils";
import type {
  DroneResponse,
  FarmaciaResponse,
  HistoricoResponse,
  KpiFarmaciaResponse,
} from "@/types/api";

const QUERY_STALE_TIME = 15_000;
const SUPPORT_QUERY_STALE_TIME = 60_000;
const KPI_REFETCH_INTERVAL_MS = 15_000;
const HISTORICO_LIMITE = 100;
const PERCENT_MAX = 100;
const CHART_HEIGHT = 180;
const CHART_WIDTH = 640;
const CHART_PADDING_X = 28;
const CHART_PADDING_Y = 20;
const MIN_VISIBLE_BAR_PCT = 4;
const DECIMAL_PLACES = 1;
const INTEGER_PLACES = 0;
const PAGE_CLASS_NAME = "min-h-[calc(100dvh-56px)] bg-[var(--surface-base)]";
const TOPBAR_CLASS_NAME =
  "border-b border-[var(--surface-border)] bg-[var(--surface-panel)]";
const TOPBAR_CONTENT_CLASS_NAME =
  "mx-auto flex h-14 w-full max-w-[1180px] items-center justify-between gap-4 px-6";
const CONTENT_CLASS_NAME =
  "mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-6 py-8";
const TITLE_CLASS_NAME = "text-xl font-semibold text-[var(--text-primary)]";
const DESCRIPTION_CLASS_NAME = "text-sm text-[var(--text-secondary)]";
const CARD_CLASS_NAME =
  "rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-card)]";
const METRIC_VALUE_CLASS_NAME =
  "[font-family:var(--font-data)] text-2xl font-semibold text-[var(--text-primary)]";
const METRIC_LABEL_CLASS_NAME =
  "text-xs font-medium uppercase tracking-[0.07em] text-[var(--text-secondary)]";
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
const EMPTY_STATE_CLASS_NAME =
  "flex min-h-[140px] items-center justify-center px-6 py-10 text-center text-sm text-[var(--text-muted)]";
const ERROR_TITLE = "Erro de Conexão";
const ERROR_MESSAGE = "Não foi possível carregar os indicadores.";

type DroneFilterValue = "todos" | string;
type FarmaciaFilterValue = "todas" | `${number}`;

interface MetricCardProps {
  label: string;
  value: string;
  helper: string;
  icon: ReactElement;
}

interface HistoricoRowProps {
  registro: HistoricoResponse;
  farmacia: FarmaciaResponse | undefined;
}

interface ChartPoint {
  label: string;
  totalEntregas: number;
  pontualidadePct: number;
}

function formatNumber(value: number, digits = DECIMAL_PLACES): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: INTEGER_PLACES,
  }).format(value);
}

function formatDateTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function getPontualidadePct(kpi: KpiFarmaciaResponse): number {
  if (kpi.total_entregas === 0) {
    return 0;
  }

  return (kpi.entregas_no_prazo * PERCENT_MAX) / kpi.total_entregas;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return ERROR_MESSAGE;
}

function renderSelectChevron(): ReactElement {
  return (
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-secondary)]"
      aria-hidden="true"
    />
  );
}

function MetricCard({ label, value, helper, icon }: MetricCardProps): ReactElement {
  return (
    <article className={CARD_CLASS_NAME}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className={METRIC_LABEL_CLASS_NAME}>{label}</span>
        <span className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-2 text-[var(--status-info)]">
          {icon}
        </span>
      </div>
      <p className={METRIC_VALUE_CLASS_NAME}>{value}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{helper}</p>
    </article>
  );
}

function buildChartPoints(kpis: KpiFarmaciaResponse[]): ChartPoint[] {
  return kpis.map((kpi) => ({
    label: kpi.farmacia,
    totalEntregas: kpi.total_entregas,
    pontualidadePct: getPontualidadePct(kpi),
  }));
}

function getLinePoints(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const usableWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
  const step = points.length > 1 ? usableWidth / (points.length - 1) : 0;

  return points
    .map((point, index) => {
      const x = CHART_PADDING_X + step * index;
      const y =
        CHART_PADDING_Y +
        usableHeight * (1 - point.pontualidadePct / PERCENT_MAX);

      return `${x},${y}`;
    })
    .join(" ");
}

function FarmaciaCharts({ kpis }: { kpis: KpiFarmaciaResponse[] }): ReactElement {
  const chartPoints = useMemo(() => buildChartPoints(kpis), [kpis]);
  const maxEntregas = Math.max(...chartPoints.map((point) => point.totalEntregas), 1);
  const linePoints = getLinePoints(chartPoints);

  if (chartPoints.length === 0) {
    return <div className={EMPTY_STATE_CLASS_NAME}>Nenhuma entrega por farmácia</div>;
  }

  return (
    <section className={cn(CARD_CLASS_NAME, "flex flex-col gap-6")}>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Desempenho por farmácia
          </h2>
          <p className={DESCRIPTION_CLASS_NAME}>
            Pontualidade e volume de entregas por unidade
          </p>
        </div>
        <Building2 className="size-5 text-[var(--status-info)]" aria-hidden="true" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Pontualidade por farmácia"
          className="h-[220px] w-full rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-panel)]"
        >
          <line
            x1={CHART_PADDING_X}
            y1={CHART_HEIGHT - CHART_PADDING_Y}
            x2={CHART_WIDTH - CHART_PADDING_X}
            y2={CHART_HEIGHT - CHART_PADDING_Y}
            stroke="var(--surface-border)"
          />
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--status-info)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chartPoints.map((point, index) => {
            const usableWidth = CHART_WIDTH - CHART_PADDING_X * 2;
            const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
            const step = chartPoints.length > 1 ? usableWidth / (chartPoints.length - 1) : 0;
            const x = CHART_PADDING_X + step * index;
            const y =
              CHART_PADDING_Y +
              usableHeight * (1 - point.pontualidadePct / PERCENT_MAX);

            return (
              <circle
                key={point.label}
                cx={x}
                cy={y}
                r="4"
                fill="var(--status-info)"
              />
            );
          })}
        </svg>

        <div className="flex flex-col gap-3">
          {chartPoints.map((point) => {
            const widthPct = Math.max(
              MIN_VISIBLE_BAR_PCT,
              (point.totalEntregas * PERCENT_MAX) / maxEntregas,
            );

            return (
              <div key={point.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--text-secondary)]">
                    {point.label}
                  </span>
                  <span className={cn(DATA_FONT_CLASS_NAME, "text-[var(--text-primary)]")}>
                    {point.totalEntregas}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-overlay)]">
                  <div
                    className="h-2 rounded-full bg-[var(--status-info)]"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HistoricoRowComponent({
  registro,
  farmacia,
}: HistoricoRowProps): ReactElement {
  return (
    <tr className="transition-colors duration-150 hover:bg-[var(--surface-overlay)]">
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {registro.pedido_id}
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {registro.rota_id}
      </td>
      <td className={BODY_CELL_CLASS_NAME}>{registro.drone_id}</td>
      <td className={BODY_CELL_CLASS_NAME}>
        {farmacia?.nome ?? `#${registro.farmacia_id}`}
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatNumber(registro.peso_kg)} kg
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatNumber(registro.distancia_km)} km
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {registro.tempo_real_min === null
          ? "-"
          : `${formatNumber(registro.tempo_real_min)} min`}
      </td>
      <td className={BODY_CELL_CLASS_NAME}>
        <span
          className={cn(
            "rounded-[var(--radius-sm)] px-2 py-0.5 text-sm font-medium",
            registro.entregue_no_prazo
              ? "bg-[var(--status-ok-bg)] text-[var(--status-ok)]"
              : "bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
          )}
        >
          {registro.entregue_no_prazo ? "No prazo" : "Atrasada"}
        </span>
      </td>
      <td className={cn(BODY_CELL_CLASS_NAME, DATA_FONT_CLASS_NAME)}>
        {formatDateTime(registro.criado_em)}
      </td>
    </tr>
  );
}

const HistoricoRow = memo(HistoricoRowComponent);

export function KpiDashboard(): ReactElement {
  const [droneFilter, setDroneFilter] = useState<DroneFilterValue>("todos");
  const [farmaciaFilter, setFarmaciaFilter] =
    useState<FarmaciaFilterValue>("todas");

  const selectedDroneId = droneFilter === "todos" ? undefined : droneFilter;
  const selectedFarmaciaId =
    farmaciaFilter === "todas" ? undefined : Number(farmaciaFilter);

  const kpisGeraisQuery = useQuery({
    queryKey: ["historico", "kpis"],
    queryFn: getKpisGerais,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: KPI_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const kpisTempoRealQuery = useQuery({
    queryKey: ["historico", "kpis", "tempo-real"],
    queryFn: getKpisTempoReal,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: KPI_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const kpisFarmaciasQuery = useQuery({
    queryKey: ["historico", "kpis", "farmacias"],
    queryFn: getKpisFarmacias,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: KPI_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const historicoQuery = useQuery({
    queryKey: ["historico", selectedDroneId, selectedFarmaciaId],
    queryFn: () =>
      listHistorico({
        drone_id: selectedDroneId,
        farmacia_id: selectedFarmaciaId,
        limite: HISTORICO_LIMITE,
      }),
    staleTime: QUERY_STALE_TIME,
    refetchInterval: KPI_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const dronesQuery = useQuery({
    queryKey: ["drones"],
    queryFn: () => listDrones(),
    staleTime: SUPPORT_QUERY_STALE_TIME,
  });
  const farmaciasQuery = useQuery({
    queryKey: ["farmacias"],
    queryFn: listFarmacias,
    staleTime: SUPPORT_QUERY_STALE_TIME,
  });
  const farmacias = useMemo(
    () => farmaciasQuery.data?.farmacias ?? [],
    [farmaciasQuery.data],
  );
  const drones = useMemo(() => dronesQuery.data?.drones ?? [], [dronesQuery.data]);
  const kpisFarmacias = useMemo(
    () => kpisFarmaciasQuery.data?.farmacias ?? [],
    [kpisFarmaciasQuery.data],
  );
  const historico = useMemo(
    () => historicoQuery.data?.historico ?? [],
    [historicoQuery.data],
  );
  const farmaciasAtivas = useMemo(
    () => farmacias.filter((farmacia) => farmacia.ativa),
    [farmacias],
  );
  const kpisFarmaciasAtivas = useMemo(
    () =>
      kpisFarmacias.filter((kpi) =>
        farmaciasAtivas.some((farmacia) => farmacia.id === kpi.farmacia_id),
      ),
    [farmaciasAtivas, kpisFarmacias],
  );
  const farmaciasMap = useMemo(
    () => new Map(farmaciasAtivas.map((farmacia) => [farmacia.id, farmacia])),
    [farmaciasAtivas],
  );

  const isLoading =
    kpisGeraisQuery.isLoading ||
    kpisTempoRealQuery.isLoading ||
    kpisFarmaciasQuery.isLoading ||
    historicoQuery.isLoading;
  const error =
    kpisGeraisQuery.error ??
    kpisTempoRealQuery.error ??
    kpisFarmaciasQuery.error ??
    historicoQuery.error;

  function handleDroneChange(event: ChangeEvent<HTMLSelectElement>): void {
    setDroneFilter(event.target.value);
  }

  function handleFarmaciaChange(event: ChangeEvent<HTMLSelectElement>): void {
    setFarmaciaFilter(event.target.value as FarmaciaFilterValue);
  }

  if (isLoading) {
    return <FormSkeleton className="min-h-[calc(100dvh-56px)]" />;
  }

  if (error !== null) {
    return (
      <section className={PAGE_CLASS_NAME}>
        <div className={CONTENT_CLASS_NAME}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--status-danger)] bg-[var(--surface-card)] p-6">
            <div className="mb-3 flex items-center gap-2 text-[var(--status-danger)]">
              <AlertTriangle className="size-5" aria-hidden="true" />
              <h1 className="text-lg font-semibold">{ERROR_TITLE}</h1>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {getErrorMessage(error)}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const kpisGerais = kpisGeraisQuery.data;
  const kpisTempoReal = kpisTempoRealQuery.data;

  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={TOPBAR_CLASS_NAME}>
        <div className={TOPBAR_CONTENT_CLASS_NAME}>
          <div>
            <h1 className={TITLE_CLASS_NAME}>KPIs</h1>
            <p className={DESCRIPTION_CLASS_NAME}>
              Histórico e operação atual
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void kpisGeraisQuery.refetch();
              void kpisTempoRealQuery.refetch();
              void kpisFarmaciasQuery.refetch();
              void historicoQuery.refetch();
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className={CONTENT_CLASS_NAME}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Entregas"
            value={formatInteger(kpisGerais?.total_entregas ?? 0)}
            helper={`${formatInteger(kpisGerais?.entregas_no_prazo ?? 0)} no prazo`}
            icon={<PackageCheck className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Pontualidade"
            value={`${formatNumber(kpisGerais?.taxa_pontualidade_pct ?? 0)}%`}
            helper="Taxa consolidada"
            icon={<Activity className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Tempo médio"
            value={`${formatNumber(kpisGerais?.tempo_medio_min ?? 0)} min`}
            helper="Por entrega"
            icon={<Clock3 className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Distância média"
            value={`${formatNumber(kpisGerais?.distancia_media_km ?? 0)} km`}
            helper="Por entrega"
            icon={<RouteIcon className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Peso entregue"
            value={`${formatNumber(kpisGerais?.peso_total_entregue_kg ?? 0)} kg`}
            helper="Acumulado"
            icon={<Scale className="size-4" aria-hidden="true" />}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard
            label="Ativos"
            value={formatInteger(kpisTempoReal?.total_ativos ?? 0)}
            helper="Pedidos operacionais"
            icon={<Activity className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Em voo"
            value={formatInteger(kpisTempoReal?.pedidos_em_voo ?? 0)}
            helper="Pedidos em missão"
            icon={<RouteIcon className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Concluídos"
            value={formatInteger(kpisTempoReal?.concluidos ?? 0)}
            helper="Pedidos entregues"
            icon={<PackageCheck className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Pontualidade"
            value={`${formatNumber(kpisTempoReal?.pontualidade_pct ?? 0)}%`}
            helper="Base histórica"
            icon={<Activity className="size-4" aria-hidden="true" />}
          />
          <MetricCard
            label="ETA médio"
            value={formatEta(kpisTempoReal?.eta_medio_seg ?? 0)}
            helper="Pedidos em rota"
            icon={<Clock3 className="size-4" aria-hidden="true" />}
          />
        </div>

        <FarmaciaCharts kpis={kpisFarmaciasAtivas} />

        <section className={cn(CARD_CLASS_NAME, "flex flex-col gap-5")}>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Histórico de entregas
              </h2>
              <p className={DESCRIPTION_CLASS_NAME}>
                {historico.length} registro(s) encontrado(s)
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative min-w-48">
                <select
                  value={droneFilter}
                  onChange={handleDroneChange}
                  className={FILTER_SELECT_CLASS_NAME}
                >
                  <option value="todos">Todos os drones</option>
                  {drones.map((drone: DroneResponse) => (
                    <option key={drone.id} value={drone.id}>
                      {drone.id}
                    </option>
                  ))}
                </select>
                {renderSelectChevron()}
              </div>

              <div className="relative min-w-48">
                <select
                  value={farmaciaFilter}
                  onChange={handleFarmaciaChange}
                  className={FILTER_SELECT_CLASS_NAME}
                >
                  <option value="todas">Todas as farmácias</option>
                  {farmaciasAtivas.map((farmacia) => (
                    <option key={farmacia.id} value={String(farmacia.id)}>
                      {farmacia.nome}
                    </option>
                  ))}
                </select>
                {renderSelectChevron()}
              </div>
            </div>
          </header>

          <div className={TABLE_WRAPPER_CLASS_NAME}>
            {historico.length === 0 ? (
              <div className={EMPTY_STATE_CLASS_NAME}>Nenhuma entrega registrada</div>
            ) : (
              <div className="overflow-x-auto">
                <table className={TABLE_CLASS_NAME}>
                  <thead>
                    <tr>
                      <th className={HEAD_CELL_CLASS_NAME}>Pedido</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Rota</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Drone</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Farmácia</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Peso</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Distância</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Tempo</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Prazo</th>
                      <th className={HEAD_CELL_CLASS_NAME}>Registrado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((registro) => (
                      <HistoricoRow
                        key={registro.id}
                        registro={registro}
                        farmacia={farmaciasMap.get(registro.farmacia_id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export default KpiDashboard;
