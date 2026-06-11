import type { ReactElement } from "react";

import { AlertTriangle } from "lucide-react";

import type { PosicaoAtualResponse, WSTelemetriaPayload } from "@/types/api";

import type { DroneMonitoramento } from "../monitoringUtils";

const BATTERY_ALERT_THRESHOLD = 0.2;
const NUMBER_LOCALE = "pt-BR";
const EMPTY_VALUE = "--";
const GRID_CLASS_NAME = "grid grid-cols-2 gap-[7px]";
const CARD_CLASS_NAME =
  "rounded-[var(--radius-md)] border border-[var(--surface-border)] bg-[var(--surface-card)] px-[13px] py-[11px] shadow-[var(--shadow-card)]";
const ALERT_CARD_CLASS_NAME =
  "border-[var(--status-danger)] bg-[rgba(239,68,68,0.06)]";
const ACCENT_CARD_CLASS_NAME =
  "border-[var(--surface-border)] bg-[var(--surface-card)] [&_.metric-value]:text-[var(--accent)]";
const LABEL_CLASS_NAME =
  "mb-[5px] flex items-center gap-[5px] text-[0.6875rem] uppercase tracking-[0.06em] text-[var(--text-secondary)]";
const VALUE_CLASS_NAME =
  "metric-value font-[var(--font-data)] text-[1.4375rem] leading-none tabular-nums text-[var(--text-primary)]";
const UNIT_CLASS_NAME =
  "ml-1 font-sans text-xs text-[var(--text-muted)] not-italic";

interface TelemetryGridProps {
  monitoramento: DroneMonitoramento | null;
  etaSegundos: number | null;
  progressPct: number | null;
  connected: boolean;
  signalLost: boolean;
  positionSnapshot: PosicaoAtualResponse | null;
  currentFrame: WSTelemetriaPayload | null;
  historyLength: number;
}

interface MetricCard {
  key: string;
  label: string;
  value: string;
  unit?: string;
  variant?: "default" | "alert" | "accent";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRoundedNumber(value: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE, {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return formatRoundedNumber(value * 100);
}

function formatDegrees(value: number): string {
  return formatRoundedNumber(value);
}

function getSignalValue(
  connected: boolean,
  historyLength: number,
  signalLost: boolean,
): string {
  if (signalLost) {
    return "Perda de Sinal";
  }

  if (connected) {
    return "Ao vivo";
  }

  if (historyLength > 0) {
    return "Replay";
  }

  return "Offline";
}

function getAltitudeValue(
  currentFrame: WSTelemetriaPayload | null,
  positionSnapshot: PosicaoAtualResponse | null,
): string {
  const rawAltitude = currentFrame?.rawTelemetry.altitude;
  const rawAltitudeMeters = currentFrame?.rawTelemetry.altitude_m;
  const altitude =
    typeof rawAltitude === "number" && Number.isFinite(rawAltitude)
      ? rawAltitude
      : typeof rawAltitudeMeters === "number" && Number.isFinite(rawAltitudeMeters)
        ? rawAltitudeMeters
        : positionSnapshot?.altitude_m;

  if (altitude === null || altitude === undefined) {
    return EMPTY_VALUE;
  }

  return formatNumber(altitude);
}

function getVelocityValue(currentFrame: WSTelemetriaPayload | null): string {
  if (currentFrame === null) {
    return EMPTY_VALUE;
  }

  const velocidade = currentFrame.rawTelemetry.velocidade_m_s;

  if (typeof velocidade !== "number" || !Number.isFinite(velocidade)) {
    return EMPTY_VALUE;
  }

  return formatNumber(velocidade);
}

function getBatteryValue(currentFrame: WSTelemetriaPayload | null): string {
  if (currentFrame === null || !Number.isFinite(currentFrame.bateria_pct)) {
    return EMPTY_VALUE;
  }

  return formatPercent(currentFrame.bateria_pct);
}

function getDirectionValue(monitoramento: DroneMonitoramento | null): string {
  if (monitoramento === null) {
    return EMPTY_VALUE;
  }

  return formatDegrees(monitoramento.vetor.direcao);
}

function getEtaValue(etaSegundos: number | null): string {
  if (etaSegundos === null) {
    return EMPTY_VALUE;
  }

  return `${formatNumber(etaSegundos)} s`;
}

function getProgressValue(progressPct: number | null): string {
  if (progressPct === null) {
    return EMPTY_VALUE;
  }

  return String(progressPct);
}

function getMissionValue(monitoramento: DroneMonitoramento | null): string {
  if (monitoramento === null) {
    return EMPTY_VALUE;
  }

  return monitoramento.status_missao;
}

function getCardClassName(card: MetricCard): string {
  if (card.variant === "alert") {
    return `${CARD_CLASS_NAME} ${ALERT_CARD_CLASS_NAME}`;
  }

  if (card.variant === "accent") {
    return `${CARD_CLASS_NAME} ${ACCENT_CARD_CLASS_NAME}`;
  }

  return CARD_CLASS_NAME;
}

function renderAlertIcon(card: MetricCard): ReactElement | null {
  if (card.variant !== "alert") {
    return null;
  }

  return (
    <AlertTriangle
      aria-hidden="true"
      className="size-3 text-[var(--status-danger)]"
    />
  );
}

function renderUnit(unit?: string): ReactElement | null {
  if (unit === undefined) {
    return null;
  }

  return <span className={UNIT_CLASS_NAME}>{unit}</span>;
}

function buildMetricCards(
  monitoramento: DroneMonitoramento | null,
  currentFrame: WSTelemetriaPayload | null,
  positionSnapshot: PosicaoAtualResponse | null,
  connected: boolean,
  historyLength: number,
  signalLost: boolean,
  etaSegundos: number | null,
  progressPct: number | null,
): MetricCard[] {
  return [
    {
      key: "velocidade",
      label: "Velocidade",
      value: getVelocityValue(currentFrame),
      unit: "m/s",
    },
    {
      key: "altura",
      label: "Altura",
      value: getAltitudeValue(currentFrame, positionSnapshot),
      unit: "m",
    },
    {
      key: "bateria",
      label: "Bateria",
      value: getBatteryValue(currentFrame),
      unit: "%",
      variant:
        currentFrame !== null &&
        Number.isFinite(currentFrame.bateria_pct) &&
        currentFrame.bateria_pct < BATTERY_ALERT_THRESHOLD
          ? "alert"
          : "default",
    },
    {
      key: "eta",
      label: "ETA",
      value: getEtaValue(etaSegundos),
      variant: "accent",
    },
    {
      key: "sinal",
      label: "Sinal",
      value: getSignalValue(connected, historyLength, signalLost),
      variant: signalLost ? "alert" : "default",
    },
    {
      key: "progresso",
      label: "Progresso",
      value: getProgressValue(progressPct),
      unit: "%",
    },
    {
      key: "direcao",
      label: "Direção",
      value: getDirectionValue(monitoramento),
      unit: "°",
    },
    {
      key: "missao",
      label: "Missão",
      value: getMissionValue(monitoramento),
    },
  ];
}

export function TelemetryGrid({
  monitoramento,
  etaSegundos,
  progressPct,
  connected,
  signalLost,
  positionSnapshot,
  currentFrame,
  historyLength,
}: TelemetryGridProps): ReactElement {
  const cards = buildMetricCards(
    monitoramento,
    currentFrame,
    positionSnapshot,
    connected,
    historyLength,
    signalLost,
    etaSegundos,
    progressPct,
  );

  return (
    <section
      aria-label="Telemetria"
      className="flex flex-col gap-[10px] border-b border-[var(--surface-border)] px-5 py-[14px]"
    >
      <div className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Telemetria
      </div>
      <div className={GRID_CLASS_NAME}>
        {cards.map((card) => (
          <article key={card.key} className={getCardClassName(card)}>
            <div className={LABEL_CLASS_NAME}>
              {renderAlertIcon(card)}
              {card.label}
            </div>
            <div className={VALUE_CLASS_NAME}>
              {card.value}
              {renderUnit(card.unit)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
