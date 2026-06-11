import { useEffect, useMemo, useState, type ReactElement } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  PauseCircle,
  Radio,
} from "lucide-react";

import type {
  DisplayTelemetry,
  PedidoStatus,
  RawTelemetryPayload,
  SimulacaoStatusResponse,
  SimulacaoVisualStatus,
  WSTelemetriaPayload,
} from "@/types/api";

const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;
const PROGRESS_ANIMATION_MS = 700;
const NUMBER_LOCALE = "pt-BR";
const STATUS_LABELS: Record<SimulacaoVisualStatus, string> = {
  aguardando: "Aguardando",
  executando: "Executando",
  pausado: "Pausado",
  concluido: "Concluido",
  erro: "Erro",
};

interface SimulationProgressPanelProps {
  pedidoStatus: PedidoStatus;
  simulationStatus: SimulacaoStatusResponse | null;
  currentFrame: WSTelemetriaPayload | null;
  progressPct: number | null;
  tempoDecorridoSegundos: number | null;
  etaSegundos: number | null;
  tempoRestanteSegundos: number | null;
  tempoTotalEstimadoSegundos: number | null;
  horarioEstimadoChegada: string | null;
  isSimulatingNow: boolean;
  streamConnected: boolean;
  signalLost: boolean;
  connectionMessage: string | null;
}

interface MetricItem {
  label: string;
  value: string;
}

function getProgressBarWidth(value: number | null): number {
  if (value === null) {
    return MIN_PROGRESS;
  }

  return Math.min(Math.max(value, MIN_PROGRESS), MAX_PROGRESS);
}

function getRawNumber(
  rawTelemetry: RawTelemetryPayload | null,
  key: string,
): number | null {
  const value = rawTelemetry?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getRawString(
  rawTelemetry: RawTelemetryPayload | null,
  key: string,
): string | null {
  const value = rawTelemetry?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getRawTelemetry(
  currentFrame: WSTelemetriaPayload | null,
  simulationStatus: SimulacaoStatusResponse | null,
): RawTelemetryPayload | null {
  return currentFrame?.rawTelemetry ?? simulationStatus?.rawTelemetry ?? null;
}

function getProgressValue(
  simulationStatus: SimulacaoStatusResponse | null,
  currentFrame: WSTelemetriaPayload | null,
  progressPct: number | null,
): number | null {
  const rawTelemetry = getRawTelemetry(currentFrame, simulationStatus);
  const rawProgress = getRawNumber(rawTelemetry, "progresso_percentual");

  if (rawProgress !== null) {
    return rawProgress;
  }

  return (
    currentFrame?.progresso_percentual ??
    simulationStatus?.progresso_percentual ??
    progressPct
  );
}

function normalizeSimulationStatus(
  status: SimulacaoStatusResponse["status_simulacao"] | undefined,
): SimulacaoVisualStatus | null {
  if (
    status === "aguardando" ||
    status === "executando" ||
    status === "pausado" ||
    status === "concluido" ||
    status === "erro"
  ) {
    return status;
  }

  return null;
}

function getVisualStatus(
  pedidoStatus: PedidoStatus,
  simulationStatus: SimulacaoStatusResponse | null,
  currentFrame: WSTelemetriaPayload | null,
  isSimulatingNow: boolean,
): SimulacaoVisualStatus {
  const backendStatus = normalizeSimulationStatus(
    currentFrame?.status_simulacao ?? simulationStatus?.status_simulacao,
  );

  if (backendStatus !== null) {
    return backendStatus;
  }

  if (pedidoStatus === "entregue") {
    return "concluido";
  }

  if (pedidoStatus === "falha" || pedidoStatus === "cancelado") {
    return "erro";
  }

  if (isSimulatingNow || pedidoStatus === "despachado" || pedidoStatus === "em_voo") {
    return "executando";
  }

  return "aguardando";
}

function getStatusClassName(status: SimulacaoVisualStatus): string {
  switch (status) {
    case "executando":
      return "border-[rgba(0,255,156,0.24)] bg-[var(--accent-ghost)] text-[var(--accent)]";
    case "pausado":
      return "border-[rgba(245,158,11,0.35)] bg-[var(--status-warn-bg)] text-[var(--status-warn)]";
    case "concluido":
      return "border-[rgba(34,197,94,0.35)] bg-[var(--status-ok-bg)] text-[var(--status-ok)]";
    case "erro":
      return "border-[rgba(239,68,68,0.35)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]";
    case "aguardando":
    default:
      return "border-[var(--surface-border)] bg-[var(--surface-overlay)] text-[var(--text-secondary)]";
  }
}

function renderStatusIcon(status: SimulacaoVisualStatus): ReactElement {
  switch (status) {
    case "executando":
      return <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />;
    case "pausado":
      return <PauseCircle className="size-4" aria-hidden="true" />;
    case "concluido":
      return <CheckCircle2 className="size-4" aria-hidden="true" />;
    case "erro":
      return <AlertTriangle className="size-4" aria-hidden="true" />;
    case "aguardando":
    default:
      return <Activity className="size-4" aria-hidden="true" />;
  }
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return "--";
  }

  return new Intl.NumberFormat(NUMBER_LOCALE, {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNullablePercent(value: number | null): string {
  return value === null ? "--" : `${formatNumber(value)}%`;
}

function formatWithUnit(value: number | null, unit: string): string {
  return value === null ? "--" : `${formatNumber(value)} ${unit}`;
}

function formatSeconds(value: number | null): string {
  return formatWithUnit(value, "s");
}

function formatDateTime(value: string | null): string {
  if (value === null || value === undefined || value.trim().length === 0) {
    return "--";
  }

  const parsedTimestamp = Date.parse(value);

  if (Number.isNaN(parsedTimestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "medium",
  }).format(new Date(parsedTimestamp));
}

function buildDisplayTelemetry(
  progressValue: number | null,
  simulationStatus: SimulacaoStatusResponse | null,
  visualStatus: SimulacaoVisualStatus,
  props: SimulationProgressPanelProps,
): DisplayTelemetry {
  const currentFrame = props.currentFrame;
  const rawTelemetry = getRawTelemetry(currentFrame, simulationStatus);
  const velocidadeAtual =
    getRawNumber(rawTelemetry, "velocidade_m_s") ??
    getRawNumber(rawTelemetry, "velocidade_ms") ??
    simulationStatus?.velocidade_m_s ??
    null;
  const distanciaPercorrida =
    getRawNumber(rawTelemetry, "distancia_percorrida_m") ??
    simulationStatus?.distancia_percorrida_m ??
    null;
  const distanciaRestante =
    getRawNumber(rawTelemetry, "distancia_restante_m") ??
    simulationStatus?.distancia_restante_m ??
    null;
  const tempoDecorrido =
    getRawNumber(rawTelemetry, "tempo_decorrido_segundos") ??
    simulationStatus?.tempo_decorrido_segundos ??
    simulationStatus?.tempo_decorrido ??
    props.tempoDecorridoSegundos;
  const eta =
    getRawNumber(rawTelemetry, "eta_segundos") ??
    simulationStatus?.eta_segundos ??
    props.etaSegundos;
  const tempoRestante =
    getRawNumber(rawTelemetry, "tempo_restante_segundos") ??
    simulationStatus?.tempo_restante_segundos ??
    props.tempoRestanteSegundos;
  const tempoTotal =
    getRawNumber(rawTelemetry, "tempo_total_estimado_segundos") ??
    simulationStatus?.tempo_total_estimado_segundos ??
    props.tempoTotalEstimadoSegundos;
  const horarioEstimado =
    getRawString(rawTelemetry, "horario_estimado_chegada") ??
    simulationStatus?.horario_estimado_chegada ??
    props.horarioEstimadoChegada;
  const altitude =
    getRawNumber(rawTelemetry, "altitude") ??
    getRawNumber(rawTelemetry, "altitude_m") ??
    simulationStatus?.altitude ??
    null;
  const latitude =
    getRawNumber(rawTelemetry, "latitude") ?? simulationStatus?.latitude ?? null;
  const longitude =
    getRawNumber(rawTelemetry, "longitude") ?? simulationStatus?.longitude ?? null;
  const velocidadeSimulacao = simulationStatus?.velocidade_simulacao ?? null;

  return {
    statusSimulacao: STATUS_LABELS[visualStatus],
    velocidadeAtual: formatWithUnit(velocidadeAtual, "m/s"),
    distanciaPercorrida: formatWithUnit(distanciaPercorrida, "m"),
    distanciaRestante: formatWithUnit(distanciaRestante, "m"),
    progresso: formatNullablePercent(progressValue),
    eta: formatSeconds(eta),
    tempoRestante: formatSeconds(tempoRestante),
    tempoDecorrido: formatSeconds(tempoDecorrido),
    tempoTotal: formatSeconds(tempoTotal),
    horarioEstimadoChegada: formatDateTime(horarioEstimado),
    altitude: formatWithUnit(altitude, "m"),
    latitude: formatNumber(latitude),
    longitude: formatNumber(longitude),
    velocidadeSimulacao: formatWithUnit(velocidadeSimulacao, "x"),
  };
}

function getMetricItems(displayTelemetry: DisplayTelemetry): MetricItem[] {
  return [
    { label: "Status", value: displayTelemetry.statusSimulacao },
    { label: "Velocidade atual", value: displayTelemetry.velocidadeAtual },
    { label: "Dist. percorrida", value: displayTelemetry.distanciaPercorrida },
    { label: "Dist. restante", value: displayTelemetry.distanciaRestante },
    { label: "Progresso", value: displayTelemetry.progresso },
    { label: "ETA", value: displayTelemetry.eta },
    { label: "Tempo restante", value: displayTelemetry.tempoRestante },
    { label: "Tempo decorrido", value: displayTelemetry.tempoDecorrido },
    { label: "Tempo total", value: displayTelemetry.tempoTotal },
    { label: "Chegada estimada", value: displayTelemetry.horarioEstimadoChegada },
    { label: "Altitude", value: displayTelemetry.altitude },
    { label: "Latitude", value: displayTelemetry.latitude },
    { label: "Longitude", value: displayTelemetry.longitude },
    { label: "Velocidade sim.", value: displayTelemetry.velocidadeSimulacao },
  ];
}

function getPanelMessage(
  simulationStatus: SimulacaoStatusResponse | null,
  visualStatus: SimulacaoVisualStatus,
): string {
  if (simulationStatus?.mensagem.trim()) {
    return simulationStatus.mensagem;
  }

  switch (visualStatus) {
    case "executando":
      return "Simulacao em andamento. Dados sincronizados com o backend.";
    case "pausado":
      return "Simulacao pausada. As animacoes permanecem interrompidas.";
    case "concluido":
      return "Simulacao concluida com sucesso.";
    case "erro":
      return "Nao foi possivel concluir a simulacao.";
    case "aguardando":
    default:
      return "Interface pronta para iniciar a simulacao.";
  }
}

function getConnectionMessage(
  connected: boolean,
  signalLost: boolean,
  message: string | null,
): string | null {
  if (message !== null) {
    return message;
  }

  if (signalLost) {
    return "Sinal temporariamente perdido. Aguardando novo pacote do backend.";
  }

  if (!connected) {
    return "Conectando aos canais de atualizacao em tempo real.";
  }

  return null;
}

export function SimulationProgressPanel(
  props: SimulationProgressPanelProps,
): ReactElement {
  const {
    pedidoStatus,
    simulationStatus,
    currentFrame,
    progressPct,
    isSimulatingNow,
    streamConnected,
    signalLost,
    connectionMessage,
  } = props;
  const progressValue = getProgressValue(
    simulationStatus,
    currentFrame,
    progressPct,
  );
  const visualStatus = getVisualStatus(
    pedidoStatus,
    simulationStatus,
    currentFrame,
    isSimulatingNow,
  );
  const [displayedProgress, setDisplayedProgress] = useState(
    getProgressBarWidth(progressValue),
  );
  const isActive = visualStatus === "executando";
  const isPaused = visualStatus === "pausado";
  const displayTelemetry = useMemo(
    () => buildDisplayTelemetry(progressValue, simulationStatus, visualStatus, props),
    [progressValue, props, simulationStatus, visualStatus],
  );
  const metrics = useMemo(
    () => getMetricItems(displayTelemetry),
    [displayTelemetry],
  );
  const panelMessage = getPanelMessage(simulationStatus, visualStatus);
  const liveConnectionMessage = getConnectionMessage(
    streamConnected,
    signalLost,
    connectionMessage,
  );

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setDisplayedProgress(getProgressBarWidth(progressValue));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPaused, progressValue]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const rawTelemetry = getRawTelemetry(currentFrame, simulationStatus);

    if (rawTelemetry === null) {
      return;
    }

    console.debug("DronePharm telemetry parity", {
      rawTelemetry,
      displayTelemetry,
    });
  }, [currentFrame, displayTelemetry, simulationStatus]);

  return (
    <section
      className="border-b border-[var(--surface-border)] px-5 py-[14px]"
      aria-label="Simulacao em tempo real"
    >
      <div className="mb-[10px] text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Simulacao
      </div>
      <div className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Simular agora
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {panelMessage}
            </span>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-1 text-xs font-medium ${getStatusClassName(visualStatus)}`}
          >
            {renderStatusIcon(visualStatus)}
            {STATUS_LABELS[visualStatus]}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-secondary)]">
              Progresso da simulacao
            </span>
            <span className="font-mono text-sm tabular-nums text-[var(--text-primary)]">
              {formatNullablePercent(progressValue)}
            </span>
          </div>
          <div
            className="relative h-3 overflow-hidden rounded-full bg-[var(--surface-border)]"
            aria-valuemax={MAX_PROGRESS}
            aria-valuemin={MIN_PROGRESS}
            aria-valuenow={displayedProgress}
            role="progressbar"
          >
            <div
              className={`h-full rounded-full bg-[var(--accent)] transition-[width] ease-out ${
                isActive ? "simulation-progress-active" : ""
              }`}
              style={{
                transitionDuration: `${PROGRESS_ANIMATION_MS}ms`,
                width: `${displayedProgress}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-panel)] px-3 py-2"
            >
              <span className="block text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-muted)]">
                {metric.label}
              </span>
              <span className="font-mono text-sm tabular-nums text-[var(--text-primary)]">
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {liveConnectionMessage !== null ? (
          <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[rgba(245,158,11,0.3)] bg-[var(--status-warn-bg)] px-3 py-2 text-xs text-[var(--status-warn)]">
            <Radio className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>{liveConnectionMessage}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
