import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactElement,
} from "react";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { ApiError } from "@/api/client";
import { getDepositoFarmacia } from "@/api/farmacias";
import { listDrones } from "@/api/drones";
import { getMapaSnapshot } from "@/api/mapa";
import { cancelarPedido, entregarPedido, getPedido, getPedidoAtivo } from "@/api/pedidos";
import { abortarRota, calcularRotas, despacharRota, getRota, simularRotaAgora } from "@/api/rotas";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  HTTPValidationError,
  PedidoStatus,
  SimulacaoStatusResponse,
  SimulacaoVisualStatus,
} from "@/types/api";

import { MapCanvas } from "./components/MapCanvas";
import { ReplayTimeline } from "./components/ReplayTimeline";
import { SimulationProgressPanel } from "./components/SimulationProgressPanel";
import { StatusControl } from "./components/StatusControl";
import { TelemetryGrid } from "./components/TelemetryGrid";
import { usePedidoStream } from "./hooks/usePedidoStream";
import { useDroneTracking } from "./hooks/useDroneTracking";
import {
  buildDroneMonitoramento,
  buildMonitoringGeoJsonSnapshot,
  buildMonitoringSnapshot,
  getMonitoringBadgeClassName,
  isSignalLost,
  routePointsFromWaypoints,
} from "./monitoringUtils";
import { useTelemetryStore } from "./store/useTelemetryStore";

const QUERY_STALE_TIME = 10_000;
const ACTIVE_MONITORING_REFETCH_MS = 5_000;
const ACTIVE_MONITORING_REFETCH_WHILE_STREAMING_MS = 15_000;
const DASHBOARD_CLASS_NAME =
  "flex h-[calc(100dvh-56px)] overflow-hidden bg-[var(--surface-base)]";
const MAP_PANEL_CLASS_NAME = "w-[70%] shrink-0";
const SIDEBAR_CLASS_NAME =
  "flex w-[30%] min-w-[320px] max-w-[420px] shrink-0 flex-col overflow-y-auto border-l border-[var(--surface-border)] bg-[var(--surface-panel)]";
const SECTION_CLASS_NAME =
  "border-b border-[var(--surface-border)] px-5 py-[14px]";
const SECTION_TITLE_CLASS_NAME =
  "mb-[10px] text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";
const FULLSCREEN_STATE_CLASS_NAME =
  "flex h-[calc(100dvh-56px)] items-center justify-center bg-[var(--surface-base)] p-6";
const ERROR_STATE_CARD_CLASS_NAME =
  "flex max-w-md flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-panel)] p-6 text-center";
const COMPLETION_BANNER_CLASS_NAME =
  "mb-3 animate-pulse rounded-[var(--radius-md)] border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] px-4 py-3 text-sm font-medium text-[var(--status-success,#10b981)]";
const DEPOT_WARNING_CLASS_NAME =
  "mb-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-sm text-[var(--text-secondary)]";
const COMPLETION_BANNER_DURATION_MS = 4_000;
const ROUTE_PEDIDO_ITEM_CLASS_NAME =
  "flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2";

interface RoutePedidoStatusItem {
  pedidoId: number;
  status: PedidoStatus | null;
}

interface RefreshQueriesOptions {
  includePedidoAtivo?: boolean;
  includeHistoricoKpis?: boolean;
}

interface MonitoringUiState {
  statusOverride: PedidoStatus | null;
  completionBannerVisible: boolean;
}

type MonitoringUiAction =
  | { type: "reset" }
  | { type: "mark_em_voo" }
  | { type: "set_status_override"; status: PedidoStatus | null }
  | { type: "show_completion_banner" }
  | { type: "hide_completion_banner" };

type SimulationStatusAction =
  | { type: "reset" }
  | { type: "set_status"; status: SimulacaoStatusResponse };

function isPedidoStatus(value: string | null | undefined): value is PedidoStatus {
  return (
    value === "pendente" ||
    value === "calculado" ||
    value === "despachado" ||
    value === "em_voo" ||
    value === "entregue" ||
    value === "cancelado" ||
    value === "falha"
  );
}

interface OrderMonitoringDashboardProps {
  pedidoId: number;
}

type PedidoQueryData = Awaited<ReturnType<typeof getPedido>>;
type PedidoAtivoQueryData = Awaited<ReturnType<typeof getPedidoAtivo>>;

function isValidationError(error: unknown): error is HTTPValidationError {
  return typeof error === "object" && error !== null && "detail" in error;
}

function getValidationErrorMessage(error: unknown): string | null {
  if (!isValidationError(error)) {
    return null;
  }

  return error.detail?.[0]?.msg ?? null;
}

function getErrorMessage(error: unknown): string {
  const validationMessage = getValidationErrorMessage(error);

  if (validationMessage !== null) {
    return validationMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível carregar o pedido.";
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function monitoringUiReducer(
  state: MonitoringUiState,
  action: MonitoringUiAction,
): MonitoringUiState {
  switch (action.type) {
    case "reset":
      return {
        statusOverride: null,
        completionBannerVisible: false,
      };
    case "mark_em_voo":
      return {
        ...state,
        statusOverride:
          state.statusOverride === "entregue" ||
          state.statusOverride === "cancelado"
            ? state.statusOverride
            : "em_voo",
      };
    case "set_status_override":
      return {
        ...state,
        statusOverride: action.status,
      };
    case "show_completion_banner":
      return {
        ...state,
        completionBannerVisible: true,
      };
    case "hide_completion_banner":
      return {
        ...state,
        completionBannerVisible: false,
      };
    default:
      return state;
  }
}

function renderLoadingState(): ReactElement {
  return (
    <div className={FULLSCREEN_STATE_CLASS_NAME}>
      <div className="flex h-full w-full gap-4">
        <Skeleton className="h-full w-[70%] rounded-[var(--radius-lg)]" />
        <div className="flex h-full w-[30%] min-w-[320px] max-w-[420px] flex-col gap-4">
          <Skeleton className="h-20 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-56 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  );
}

function renderErrorState(message: string, onRetry: () => void): ReactElement {
  return (
    <div className={FULLSCREEN_STATE_CLASS_NAME}>
      <div className={ERROR_STATE_CARD_CLASS_NAME}>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Falha ao carregar monitoramento
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <Button type="button" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

function renderHeader(
  pedidoId: number,
  status: PedidoStatus,
): ReactElement {
  const badgeClassName = getMonitoringBadgeClassName(status);

  return (
    <header className="border-b border-[var(--surface-border)] px-5 py-[14px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[1.0625rem] font-semibold text-[var(--text-primary)]">
          Pedido #{pedidoId}
        </span>
        <span className={`badge ${badgeClassName}`} translate="no">
          {status}
        </span>
      </div>
    </header>
  );
}

function createSimulationStatus(
  status: SimulacaoVisualStatus,
  mensagem: string,
  progressoPercentual: number | null,
): SimulacaoStatusResponse {
  return {
    status_simulacao: status,
    timestamp_servidor: "",
    drone_id: "",
    latitude: null,
    longitude: null,
    altitude: null,
    velocidade_m_s: null,
    distancia_percorrida_m: null,
    distancia_restante_m: null,
    progresso_percentual: progressoPercentual,
    etapa_atual: 0,
    total_etapas: 0,
    tempo_decorrido: null,
    eta_segundos: null,
    velocidade_simulacao: null,
    horario_estimado_chegada: "",
    tempo_decorrido_segundos: null,
    tempo_total_estimado_segundos: null,
    tempo_restante_segundos: null,
    mensagem,
  };
}

function simulationStatusReducer(
  state: SimulacaoStatusResponse | null,
  action: SimulationStatusAction,
): SimulacaoStatusResponse | null {
  switch (action.type) {
    case "reset":
      return null;
    case "set_status":
      return action.status;
    default:
      return state;
  }
}

function renderRoutePedidosSection(
  routePedidos: RoutePedidoStatusItem[],
): ReactElement | null {
  if (routePedidos.length === 0) {
    return null;
  }

  return (
    <section className={SECTION_CLASS_NAME} aria-label="Pedidos da rota">
      <div className={SECTION_TITLE_CLASS_NAME}>Pedidos da Rota</div>
      <div className="flex flex-col gap-2">
        {routePedidos.map((routePedido) => {
          const status = routePedido.status ?? "pendente";

          return (
            <div
              key={routePedido.pedidoId}
              className={ROUTE_PEDIDO_ITEM_CLASS_NAME}
            >
              <span className="text-sm text-[var(--text-primary)]">
                Pedido #{routePedido.pedidoId}
              </span>
              <span
                className={`badge ${getMonitoringBadgeClassName(status)}`}
                translate="no"
              >
                {status}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OrderMonitoringDashboard({
  pedidoId,
}: OrderMonitoringDashboardProps): ReactElement {
  const queryClient = useQueryClient();
  const [replayVisible, setReplayVisible] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [isStartingFlight, setIsStartingFlight] = useState(false);
  const [isSimulatingNow, setIsSimulatingNow] = useState(false);
  const [isAbortingFlight, setIsAbortingFlight] = useState(false);
  const [simulationStatus, dispatchSimulationStatus] = useReducer(
    simulationStatusReducer,
    null,
  );
  const [heartbeatNow, setHeartbeatNow] = useState(() => Date.now());
  const [monitoringUiState, dispatchMonitoringUi] = useReducer(
    monitoringUiReducer,
    {
      statusOverride: null,
      completionBannerVisible: false,
    },
  );
  const routePreview = useTelemetryStore((state) => state.routePreview);
  const selectedDroneId = useTelemetryStore((state) => state.selectedDroneId);
  const selectedDroneStream = useTelemetryStore((state) =>
    state.getStreamState(state.selectedDroneId),
  );
  const setRoutePreview = useTelemetryStore((state) => state.setRoutePreview);
  const setSelectedDroneId = useTelemetryStore((state) => state.setSelectedDroneId);
  const resetTelemetry = useTelemetryStore((state) => state.reset);
  const pedidoQuery = useQuery({
    queryKey: ["pedido", pedidoId],
    queryFn: () => getPedido(pedidoId),
    staleTime: QUERY_STALE_TIME,
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.status;

      return currentStatus === "despachado" || currentStatus === "em_voo"
        ? selectedDroneStream.connected
          ? ACTIVE_MONITORING_REFETCH_WHILE_STREAMING_MS
          : ACTIVE_MONITORING_REFETCH_MS
        : false;
    },
  });
  const pedidoAtivoQuery = useQuery({
    queryKey: ["pedido-ativo", pedidoId],
    queryFn: () => getPedidoAtivo(pedidoId),
    staleTime: QUERY_STALE_TIME,
    retry: false,
    refetchInterval:
      pedidoQuery.data?.status === "despachado" ||
      pedidoQuery.data?.status === "em_voo"
        ? selectedDroneStream.connected
          ? ACTIVE_MONITORING_REFETCH_WHILE_STREAMING_MS
          : ACTIVE_MONITORING_REFETCH_MS
        : false,
    enabled:
      pedidoQuery.data?.status === "calculado" ||
      pedidoQuery.data?.status === "despachado" ||
      pedidoQuery.data?.status === "em_voo",
  });
  const mapaSnapshotQuery = useQuery({
    queryKey: ["mapa", "snapshot"],
    queryFn: getMapaSnapshot,
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: QUERY_STALE_TIME,
  });
  const depositoQuery = useQuery({
    queryKey: ["farmacias", "deposito"],
    queryFn: getDepositoFarmacia,
    staleTime: QUERY_STALE_TIME,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: QUERY_STALE_TIME,
  });
  const rotaQuery = useQuery({
    queryKey: ["rota", pedidoQuery.data?.rota_id],
    queryFn: () => getRota(pedidoQuery.data?.rota_id ?? 0),
    staleTime: QUERY_STALE_TIME,
    enabled:
      pedidoQuery.data?.rota_id !== null &&
      pedidoQuery.data?.rota_id !== undefined &&
      (pedidoQuery.data?.status === "calculado" ||
        pedidoQuery.data?.status === "despachado" ||
        pedidoQuery.data?.status === "em_voo"),
  });
  const dronesQuery = useQuery({
    queryKey: ["drones", "aguardando"],
    queryFn: () => listDrones({ status: "aguardando" }),
    staleTime: QUERY_STALE_TIME,
    enabled:
      pedidoQuery.data?.status === "pendente" ||
      pedidoQuery.data?.status === "calculado",
  });
  const depositoAtual = depositoQuery.isSuccess ? depositoQuery.data ?? null : null;
  const mapaSnapshotAtual = mapaSnapshotQuery.isSuccess
    ? mapaSnapshotQuery.data ?? null
    : null;
  const routePedidoIds = useMemo(() => {
    const ids = rotaQuery.data?.pedido_ids ?? [];

    return Array.from(new Set([pedidoId, ...ids]));
  }, [pedidoId, rotaQuery.data?.pedido_ids]);
  const routePedidoQueries = useQueries({
    queries: routePedidoIds.map((routePedidoId) => ({
      queryKey: ["pedido", routePedidoId],
      queryFn: () => getPedido(routePedidoId),
      staleTime: QUERY_STALE_TIME,
      enabled: routePedidoId > 0,
    })),
  });
  const snapshot = useMemo(() => {
    return buildMonitoringSnapshot(
      pedidoAtivoQuery.data ?? null,
      pedidoQuery.data ?? null,
    );
  }, [pedidoAtivoQuery.data, pedidoQuery.data]);
  const effectiveSnapshot = useMemo(() => {
    if (snapshot === null) {
      return null;
    }

    if (monitoringUiState.statusOverride === null) {
      return snapshot;
    }

    return {
      ...snapshot,
      status: monitoringUiState.statusOverride,
    };
  }, [monitoringUiState.statusOverride, snapshot]);
  const geoJsonSnapshot = useMemo(() => {
    return buildMonitoringGeoJsonSnapshot(
      mapaSnapshotAtual,
      pedidoId,
      pedidoQuery.data?.rota_id ?? null,
      effectiveSnapshot?.droneId ?? rotaQuery.data?.drone_id ?? selectedDroneId,
    );
  }, [
    effectiveSnapshot?.droneId,
    mapaSnapshotAtual,
    pedidoId,
    pedidoQuery.data?.rota_id,
    rotaQuery.data?.drone_id,
    selectedDroneId,
  ]);
  const routeWaypoints = useMemo(() => {
    if (effectiveSnapshot !== null && effectiveSnapshot.routeWaypoints.length > 0) {
      return effectiveSnapshot.routeWaypoints;
    }

    if (rotaQuery.data !== undefined) {
      return rotaQuery.data.waypoints;
    }

    return routePreview;
  }, [effectiveSnapshot, routePreview, rotaQuery.data]);
  const routePoints = useMemo(() => {
    if (routeWaypoints.length > 0) {
      return routePointsFromWaypoints(routeWaypoints);
    }

    if (effectiveSnapshot !== null && effectiveSnapshot.routePoints.length > 0) {
      return effectiveSnapshot.routePoints;
    }

    if (geoJsonSnapshot.routePoints.length > 0) {
      return geoJsonSnapshot.routePoints;
    }

    return [];
  }, [effectiveSnapshot, geoJsonSnapshot.routePoints, routeWaypoints]);
  const activeDroneId = effectiveSnapshot?.droneId
    ? effectiveSnapshot.droneId
    : pedidoQuery.data?.status === "despachado" ||
        pedidoQuery.data?.status === "em_voo"
      ? rotaQuery.data?.drone_id ?? selectedDroneId
      : "";
  const currentFrame = useTelemetryStore((state) => state.getFrame(activeDroneId));
  const deferredFrame = useDeferredValue(currentFrame);
  const historyLength = useTelemetryStore(
    (state) => state.getHistory(activeDroneId).length,
  );
  const orderStream = useDroneTracking(activeDroneId);
  const pedidoStream = usePedidoStream(pedidoId > 0);
  const routePedidoStatuses = useMemo<RoutePedidoStatusItem[]>(() => {
    const statusByPedidoId = new Map<number, PedidoStatus | null>();

    routePedidoQueries.forEach((query, index) => {
      const routePedidoId = routePedidoIds[index];
      if (routePedidoId === undefined) {
        return;
      }

      statusByPedidoId.set(routePedidoId, query.data?.status ?? null);
    });

    for (const [pedidoIdKey, event] of Object.entries(
      pedidoStream.latestByPedidoId,
    )) {
      if (event === undefined || !isPedidoStatus(event.status_para)) {
        continue;
      }

      const routePedidoId = Number(pedidoIdKey);

      if (!Number.isFinite(routePedidoId)) {
        continue;
      }

      if (!statusByPedidoId.has(routePedidoId)) {
        continue;
      }

      statusByPedidoId.set(routePedidoId, event.status_para);
    }

    return routePedidoIds.map((routePedidoId) => ({
      pedidoId: routePedidoId,
      status: statusByPedidoId.get(routePedidoId) ?? null,
    }));
  }, [pedidoStream.latestByPedidoId, routePedidoIds, routePedidoQueries]);
  const routePedidoStatusById = useMemo<Record<number, PedidoStatus | null>>(() => {
    return Object.fromEntries(
      routePedidoStatuses.map((routePedido) => [
        routePedido.pedidoId,
        routePedido.status,
      ]),
    );
  }, [routePedidoStatuses]);
  const monitoramento = useMemo(() => {
    return buildDroneMonitoramento(effectiveSnapshot, currentFrame);
  }, [currentFrame, effectiveSnapshot]);
  const effectiveEtaSegundos =
    currentFrame?.eta_segundos ?? simulationStatus?.eta_segundos ?? effectiveSnapshot?.etaSegundos ?? null;
  const signalLost = useMemo(() => {
    return isSignalLost(
      currentFrame,
      effectiveSnapshot?.positionSnapshot ?? null,
      heartbeatNow,
    );
  }, [currentFrame, effectiveSnapshot?.positionSnapshot, heartbeatNow]);
  const effectiveDestination = useMemo(() => {
    return effectiveSnapshot?.destination ?? geoJsonSnapshot.destination;
  }, [effectiveSnapshot?.destination, geoJsonSnapshot.destination]);
  const progressPct =
    currentFrame?.progresso_percentual ?? simulationStatus?.progresso_percentual ?? null;
  const tempoDecorridoSegundos =
    currentFrame?.tempo_decorrido_segundos ??
    simulationStatus?.tempo_decorrido_segundos ??
    simulationStatus?.tempo_decorrido ??
    effectiveSnapshot?.tempoDecorridoSegundos ??
    null;
  const tempoRestanteSegundos =
    currentFrame?.tempo_restante_segundos ??
    simulationStatus?.tempo_restante_segundos ??
    null;
  const tempoTotalEstimadoSegundos =
    currentFrame?.tempo_total_estimado_segundos ??
    simulationStatus?.tempo_total_estimado_segundos ??
    null;
  const horarioEstimadoChegada =
    currentFrame?.horario_estimado_chegada ??
    simulationStatus?.horario_estimado_chegada ??
    null;
  const simulationRunning =
    simulationStatus?.status_simulacao === "executando" ||
    isSimulatingNow ||
    effectiveSnapshot?.status === "despachado" ||
    effectiveSnapshot?.status === "em_voo";
  const simulationConnectionMessage = orderStream.error ?? pedidoStream.error;
  const droneOptions = useMemo(() => {
    return (dronesQuery.data?.drones ?? []).map((drone) => ({
      value: drone.id,
      label: `${drone.id} · bateria ${Math.round(drone.bateria_pct * 100)}%`,
    }));
  }, [dronesQuery.data?.drones]);
  const canStartFlight =
    effectiveSnapshot?.status === "calculado" &&
    pedidoQuery.data?.rota_id !== null &&
    pedidoQuery.data?.rota_id !== undefined;
  const depositoDisponivel = depositoAtual !== null;
  const depositoBloqueado = depositoQuery.isError && isNotFoundError(depositoQuery.error);
  const routeCalculationBlockedReason = depositoBloqueado
    ? "Nenhum depósito ativo cadastrado. Reative ou crie a farmácia-polo antes de calcular rotas."
    : depositoQuery.isLoading
      ? "Verificando o depósito principal..."
      : depositoQuery.isError
        ? "Não foi possível validar o depósito principal."
        : null;
  const routeCalculationAvailable =
    depositoDisponivel &&
    !depositoBloqueado &&
    !depositoQuery.isLoading;
  const activeRotaId = pedidoAtivoQuery.data?.rota_id ?? pedidoQuery.data?.rota_id ?? null;
  const refreshQueries = useCallback(
    async (options: RefreshQueriesOptions = {}): Promise<void> => {
      const { includePedidoAtivo = true, includeHistoricoKpis = false } = options;
      const invalidations: Promise<unknown>[] = [
        queryClient.invalidateQueries({ queryKey: ["pedido", pedidoId] }),
        queryClient.invalidateQueries({ queryKey: ["rota"] }),
        queryClient.invalidateQueries({ queryKey: ["drones"] }),
        queryClient.invalidateQueries({ queryKey: ["monitoring-pedidos"] }),
      ];

      if (includePedidoAtivo) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ["pedido-ativo", pedidoId] }),
        );
      }

      if (includeHistoricoKpis) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: ["historico"] }),
        );
      }

      await Promise.all(invalidations);
    },
    [pedidoId, queryClient],
  );
  const pedidoStatus = pedidoQuery.data?.status;
  const pedidoAtivoStatus = pedidoAtivoQuery.data?.status;

  useEffect(() => {
    resetTelemetry();
    dispatchSimulationStatus({ type: "reset" });
    dispatchMonitoringUi({ type: "reset" });
  }, [pedidoId, resetTelemetry]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeartbeatNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (rotaQuery.data === undefined) {
      return;
    }

    setRoutePreview(rotaQuery.data);
  }, [rotaQuery.data, setRoutePreview]);

  useEffect(() => {
    if (effectiveSnapshot?.droneId === undefined || effectiveSnapshot.droneId.length === 0) {
      return;
    }

    setSelectedDroneId(effectiveSnapshot.droneId);
  }, [effectiveSnapshot?.droneId, setSelectedDroneId]);

  useEffect(() => {
    if (rotaQuery.data?.drone_id === undefined || rotaQuery.data.drone_id.length === 0) {
      return;
    }

    setSelectedDroneId(rotaQuery.data.drone_id);
  }, [rotaQuery.data?.drone_id, setSelectedDroneId]);

  useEffect(() => {
    if (currentFrame?.status_missao !== "em_voo") {
      return;
    }

    dispatchMonitoringUi({ type: "mark_em_voo" });
  }, [currentFrame?.status_missao]);

  useEffect(() => {
    if (effectiveSnapshot?.status === "entregue") {
      dispatchSimulationStatus({
        type: "set_status",
        status: createSimulationStatus(
          "concluido",
          "Simulacao concluida com sucesso.",
          null,
        ),
      });
      return;
    }

    if (
      effectiveSnapshot?.status === "falha" ||
      effectiveSnapshot?.status === "cancelado"
    ) {
      dispatchSimulationStatus({
        type: "set_status",
        status: createSimulationStatus(
          "erro",
          "Simulacao encerrada antes da conclusao.",
          progressPct,
        ),
      });
    }
  }, [effectiveSnapshot?.status, progressPct]);

  useEffect(() => {
    const lastEvent = pedidoStream.lastEvent;
    if (lastEvent === null) {
      return;
    }

    const nextStatus = isPedidoStatus(lastEvent.status_para)
      ? lastEvent.status_para
      : null;

    if (nextStatus !== null) {
      queryClient.setQueryData(
        ["pedido", lastEvent.pedido_id],
        (currentData: PedidoQueryData | undefined) =>
          currentData ? { ...currentData, status: nextStatus } : currentData,
      );

      if (lastEvent.pedido_id === pedidoId) {
        dispatchMonitoringUi({ type: "set_status_override", status: nextStatus });
        queryClient.setQueryData(
          ["pedido-ativo", pedidoId],
          (currentData: PedidoAtivoQueryData | undefined) =>
            currentData ? { ...currentData, status: nextStatus } : currentData,
        );
      }
    }

    if (lastEvent.pedido_id !== pedidoId) {
      return;
    }

    if (lastEvent.evento === "pedido_entregue" || nextStatus === "entregue") {
      dispatchMonitoringUi({ type: "show_completion_banner" });
      dispatchSimulationStatus({
        type: "set_status",
        status: createSimulationStatus(
          "concluido",
          "Simulacao concluida com sucesso.",
          null,
        ),
      });
      toast.success("Missão concluída com sucesso.");
      window.setTimeout(() => {
        dispatchMonitoringUi({ type: "hide_completion_banner" });
      }, COMPLETION_BANNER_DURATION_MS);
      void refreshQueries({ includePedidoAtivo: false, includeHistoricoKpis: true });
    }

    if (nextStatus === "cancelado" || nextStatus === "falha" || nextStatus === "pendente") {
      dispatchSimulationStatus({
        type: "set_status",
        status: createSimulationStatus(
          nextStatus === "pendente" ? "aguardando" : "erro",
          nextStatus === "pendente"
            ? "Simulacao pronta para novo acionamento."
            : "Simulacao encerrada antes da conclusao.",
          null,
        ),
      });
      void refreshQueries({ includePedidoAtivo: false });
    }
  }, [
    pedidoId,
    pedidoStream.lastEvent,
    pedidoAtivoStatus,
    pedidoStatus,
    queryClient,
    refreshQueries,
  ]);

  useEffect(() => {
    if (!pedidoAtivoQuery.isError) {
      return;
    }

    if (
      isNotFoundError(pedidoAtivoQuery.error) &&
      pedidoQuery.data?.status !== "em_voo"
    ) {
      return;
    }

    toast.error(getErrorMessage(pedidoAtivoQuery.error));
  }, [
    pedidoAtivoQuery.error,
    pedidoAtivoQuery.isError,
    pedidoQuery.data?.status,
  ]);

  useEffect(() => {
    if (orderStream.error === null) {
      return;
    }

    toast.error(orderStream.error);
  }, [orderStream.error]);

  useEffect(() => {
    if (pedidoStream.error === null) {
      return;
    }

    toast.error(pedidoStream.error);
  }, [pedidoStream.error]);

  useEffect(() => {
    if (!depositoQuery.isError || depositoBloqueado) {
      return;
    }

    toast.error(getErrorMessage(depositoQuery.error));
  }, [depositoBloqueado, depositoQuery.error, depositoQuery.isError]);

  async function handleCalcularRota(): Promise<void> {
    if (selectedDroneId.trim().length === 0) {
      toast.error("Selecione um drone disponível para calcular a rota.");
      return;
    }

    if (!routeCalculationAvailable) {
      toast.error(
        routeCalculationBlockedReason ??
          "Não foi possível validar o depósito principal para calcular a rota.",
      );
      return;
    }

    try {
      setIsCalculatingRoute(true);
      const response = await calcularRotas({
        drone_id: selectedDroneId,
      });
      const rotaCalculada = response.rotas[0] ?? null;

      if (rotaCalculada === null) {
        toast.error(response.mensagem || "Nenhuma rota foi calculada para os pedidos pendentes.");
        return;
      }

      setRoutePreview(rotaCalculada);
      await refreshQueries();
      toast.success("Rota calculada com sucesso.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsCalculatingRoute(false);
    }
  }

  async function handleIniciarVoo(): Promise<void> {
    const rotaId = pedidoQuery.data?.rota_id;

    if (rotaId === null || rotaId === undefined) {
      toast.error("Calcule uma rota antes de iniciar o voo.");
      return;
    }

    try {
      setIsStartingFlight(true);
      await despacharRota(rotaId);
      await refreshQueries();
      toast.success("Voo iniciado com sucesso.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsStartingFlight(false);
    }
  }

  async function handleCancelar(): Promise<void> {
    try {
      await cancelarPedido(pedidoId);
      await refreshQueries();
      toast.success("Pedido cancelado com sucesso.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleEntregar(): Promise<void> {
    try {
      await entregarPedido(pedidoId);
      await refreshQueries({ includeHistoricoKpis: true });
      toast.success("Entrega confirmada com sucesso.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleSimularAgora(): Promise<void> {
    const rotaId = pedidoQuery.data?.rota_id;

    if (rotaId === null || rotaId === undefined) {
      toast.error("Calcule uma rota antes de iniciar a simulação.");
      return;
    }

    try {
      setIsSimulatingNow(true);
      dispatchSimulationStatus({
        type: "set_status",
        status: createSimulationStatus(
          "executando",
          "Solicitando inicio imediato da simulacao.",
          progressPct,
        ),
      });
      const response = await simularRotaAgora(rotaId);
      dispatchSimulationStatus({
        type: "set_status",
        status:
          response ??
          createSimulationStatus(
            "executando",
            "Simulacao iniciada. Aguardando eventos do backend.",
            progressPct,
          ),
      });
      dispatchMonitoringUi({ type: "set_status_override", status: "em_voo" });
      await refreshQueries();
      toast.success("Simulação iniciada imediatamente.");
    } catch (error) {
      const message = getErrorMessage(error);
      dispatchSimulationStatus({
        type: "set_status",
        status: createSimulationStatus(
          "erro",
          message,
          progressPct,
        ),
      });
      toast.error(message);
    } finally {
      setIsSimulatingNow(false);
    }
  }

  async function handleAbortarSimulacao(): Promise<void> {
    if (activeRotaId === null || activeRotaId === undefined) {
      toast.error("Nenhuma rota ativa encontrada para abortar.");
      return;
    }

    try {
      setIsAbortingFlight(true);
      await abortarRota(activeRotaId);
      dispatchMonitoringUi({ type: "set_status_override", status: "pendente" });
      await refreshQueries();
      toast.success("Simulação abortada e drone liberado.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsAbortingFlight(false);
    }
  }

  function handleRetry(): void {
    void Promise.all([pedidoQuery.refetch(), pedidoAtivoQuery.refetch()]);
  }

  if (pedidoQuery.isLoading && pedidoAtivoQuery.isLoading) {
    return renderLoadingState();
  }

  if (effectiveSnapshot === null) {
    return renderErrorState(
      getErrorMessage(pedidoQuery.error ?? pedidoAtivoQuery.error),
      handleRetry,
    );
  }

  return (
    <section className={DASHBOARD_CLASS_NAME}>
      <div className={MAP_PANEL_CLASS_NAME}>
        <MapCanvas
          routePoints={routePoints}
          routeWaypoints={routeWaypoints}
          routePedidoStatusById={routePedidoStatusById}
          destination={effectiveDestination}
          depot={geoJsonSnapshot.depot}
          snapshotDronePosition={geoJsonSnapshot.dronePosition}
          currentFrame={currentFrame}
          positionSnapshot={effectiveSnapshot.positionSnapshot}
          droneDirection={monitoramento?.vetor.direcao ?? null}
          signalLost={signalLost}
        />
      </div>

      <aside className={SIDEBAR_CLASS_NAME}>
        {monitoringUiState.completionBannerVisible ? (
          <div className={COMPLETION_BANNER_CLASS_NAME}>
            Missão encerrada. Drone liberado e pedido concluído.
          </div>
        ) : null}
        {depositoBloqueado ? (
          <div className={DEPOT_WARNING_CLASS_NAME}>
            <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[rgba(245,158,11,0.2)] text-[rgba(245,158,11,0.95)]">
              !
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <strong className="text-[var(--text-primary)]">
                Depósito principal ausente
              </strong>
              <span>
                Sem uma farmácia-polo ativa, o backend retorna 404 ao calcular
                rotas. Reative ou recrie o depósito para liberar a operação.
              </span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/farmacias">Abrir farmácias</Link>
            </Button>
          </div>
        ) : null}
        {renderHeader(effectiveSnapshot.pedidoId, effectiveSnapshot.status)}
        {renderRoutePedidosSection(routePedidoStatuses)}
        <TelemetryGrid
          monitoramento={monitoramento}
          etaSegundos={effectiveEtaSegundos}
          progressPct={progressPct}
          connected={orderStream.connected}
          signalLost={signalLost}
          positionSnapshot={effectiveSnapshot.positionSnapshot}
          currentFrame={deferredFrame}
          historyLength={historyLength}
        />
        <SimulationProgressPanel
          pedidoStatus={effectiveSnapshot.status}
          simulationStatus={simulationStatus}
          currentFrame={currentFrame}
          progressPct={progressPct}
          tempoDecorridoSegundos={tempoDecorridoSegundos}
          etaSegundos={effectiveEtaSegundos}
          tempoRestanteSegundos={tempoRestanteSegundos}
          tempoTotalEstimadoSegundos={tempoTotalEstimadoSegundos}
          horarioEstimadoChegada={horarioEstimadoChegada}
          isSimulatingNow={isSimulatingNow}
          streamConnected={orderStream.connected || pedidoStream.connected}
          signalLost={signalLost}
          connectionMessage={simulationConnectionMessage}
        />
        <StatusControl
          status={effectiveSnapshot.status}
          pedidoId={effectiveSnapshot.pedidoId}
          rotaId={activeRotaId}
          replayEnabled={historyLength > 0}
          replayVisible={replayVisible}
          selectedDroneId={selectedDroneId}
          droneOptions={droneOptions}
          isCalculatingRoute={isCalculatingRoute}
          isStartingFlight={isStartingFlight}
          isSimulatingNow={isSimulatingNow}
          isSimulationRunning={simulationRunning}
          isAbortingFlight={isAbortingFlight}
          canStartFlight={canStartFlight}
          canCalculateRoute={routeCalculationAvailable}
          routeCalculationBlockedReason={routeCalculationBlockedReason}
          onCancelar={handleCancelar}
          onEntregar={handleEntregar}
          onAbortarSimulacao={handleAbortarSimulacao}
          onSimularAgora={handleSimularAgora}
          onToggleReplay={() => setReplayVisible((currentValue) => !currentValue)}
          onSelectedDroneChange={setSelectedDroneId}
          onCalcularRota={handleCalcularRota}
          onIniciarVoo={handleIniciarVoo}
        />
        {replayVisible ? <ReplayTimeline /> : null}
      </aside>
    </section>
  );
}
