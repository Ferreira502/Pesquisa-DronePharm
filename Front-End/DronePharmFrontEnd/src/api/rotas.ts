import { apiFetch } from "./client";
import type {
  RotaResponse,
  RoteirizarRequest,
  RoteirizarResponse,
  SimulacaoStatusResponse,
  SimulacaoVisualStatus,
} from "../types/api";

const ROTAS_BASE_PATH = "/api/v1/rotas";
const MAX_PERCENTUAL = 100;
const STATUS_SIMULACAO_PADRAO: SimulacaoVisualStatus = "aguardando";
const SIMULACAO_STATUS_VALIDOS: SimulacaoVisualStatus[] = [
  "aguardando",
  "executando",
  "pausado",
  "concluido",
  "erro",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeNonNegativeNumber(value: unknown): number | null {
  const normalizedNumber = normalizeNullableNumber(value);

  return normalizedNumber === null ? null : Math.max(normalizedNumber, 0);
}

function normalizeProgress(value: unknown): number | null {
  const progress = normalizeNonNegativeNumber(value);

  return progress === null ? null : Math.min(progress, MAX_PERCENTUAL);
}

function normalizeStatus(value: unknown): SimulacaoVisualStatus {
  if (typeof value !== "string") {
    return STATUS_SIMULACAO_PADRAO;
  }

  const normalizedStatus = value.trim().toLowerCase();

  return SIMULACAO_STATUS_VALIDOS.find((status) => status === normalizedStatus) ??
    STATUS_SIMULACAO_PADRAO;
}

function normalizeMessage(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeSimulacaoStatus(
  payload: unknown,
): SimulacaoStatusResponse | null {
  if (!isRecord(payload)) {
    return null;
  }

  return {
    rawTelemetry: { ...payload },
    status_simulacao: normalizeStatus(payload.status_simulacao),
    timestamp_servidor: normalizeString(payload.timestamp_servidor),
    drone_id: normalizeString(payload.drone_id),
    latitude: normalizeNullableNumber(payload.latitude),
    longitude: normalizeNullableNumber(payload.longitude),
    altitude: normalizeNullableNumber(payload.altitude),
    velocidade_m_s: normalizeNullableNumber(payload.velocidade_m_s),
    distancia_percorrida_m: normalizeNullableNumber(payload.distancia_percorrida_m),
    distancia_restante_m: normalizeNullableNumber(payload.distancia_restante_m),
    progresso_percentual: normalizeProgress(payload.progresso_percentual),
    etapa_atual: normalizeNonNegativeNumber(payload.etapa_atual),
    total_etapas: normalizeNonNegativeNumber(payload.total_etapas),
    tempo_decorrido: normalizeNonNegativeNumber(payload.tempo_decorrido),
    eta_segundos: normalizeNonNegativeNumber(payload.eta_segundos),
    velocidade_simulacao: normalizeNonNegativeNumber(payload.velocidade_simulacao),
    horario_estimado_chegada: normalizeString(payload.horario_estimado_chegada),
    tempo_decorrido_segundos: normalizeNonNegativeNumber(
      payload.tempo_decorrido_segundos,
    ),
    tempo_total_estimado_segundos: normalizeNonNegativeNumber(
      payload.tempo_total_estimado_segundos,
    ),
    tempo_restante_segundos: normalizeNonNegativeNumber(
      payload.tempo_restante_segundos,
    ),
    mensagem: normalizeMessage(payload.mensagem),
  };
}

export function calcularRotas(
  body: RoteirizarRequest,
): Promise<RoteirizarResponse> {
  return apiFetch<RoteirizarResponse>(`${ROTAS_BASE_PATH}/calcular`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function getRota(rotaId: number): Promise<RotaResponse> {
  return apiFetch<RotaResponse>(`${ROTAS_BASE_PATH}/${rotaId}`);
}

export function despacharRota(rotaId: number): Promise<void> {
  return apiFetch<void>(`${ROTAS_BASE_PATH}/${rotaId}/despachar`, {
    method: "POST",
  });
}

export async function simularRotaAgora(
  rotaId: number,
): Promise<SimulacaoStatusResponse | null> {
  const payload = await apiFetch<unknown>(`${ROTAS_BASE_PATH}/${rotaId}/simular-agora`, {
    method: "POST",
  });

  return normalizeSimulacaoStatus(payload);
}

export function abortarRota(rotaId: number, motivo = "Abortada pelo operador"): Promise<void> {
  return apiFetch<void>(`${ROTAS_BASE_PATH}/${rotaId}/abortar`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ motivo }),
  });
}
