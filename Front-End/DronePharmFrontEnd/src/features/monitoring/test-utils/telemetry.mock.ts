import type { RawTelemetryPayload, WSTelemetriaPayload } from "@/types/api";

export const baseTelemetryPayload = {
  timestamp_servidor: "2026-06-09T23:00:00Z",
  status_simulacao: "executando",
  drone_id: "DRONE-001",
  latitude: -19.9245,
  longitude: -43.9352,
  altitude: 120.75,
  velocidade_m_s: 8.42,
  distancia_percorrida_m: 315.9876,
  distancia_restante_m: 684.0124,
  progresso_percentual: 31.59876,
  eta_segundos: 81.2378,
  tempo_restante_segundos: 81.2378,
  tempo_decorrido_segundos: 37.5123,
  tempo_total_estimado_segundos: 118.7501,
  horario_estimado_chegada: "2026-06-09T23:01:21Z",
} satisfies RawTelemetryPayload;

export function makeTelemetryPayload(
  overrides: Partial<typeof baseTelemetryPayload> = {},
): RawTelemetryPayload {
  return {
    ...baseTelemetryPayload,
    ...overrides,
  };
}

function getNumber(payload: RawTelemetryPayload, key: string): number {
  const value = payload[key];

  if (typeof value !== "number") {
    throw new Error(`Telemetry field ${key} must be a number in this mock.`);
  }

  return value;
}

function getString(payload: RawTelemetryPayload, key: string): string {
  const value = payload[key];

  if (typeof value !== "string") {
    throw new Error(`Telemetry field ${key} must be a string in this mock.`);
  }

  return value;
}

export function makeTelemetryFrame(
  overrides: Partial<typeof baseTelemetryPayload> = {},
): WSTelemetriaPayload {
  const rawTelemetry = makeTelemetryPayload(overrides);

  return {
    rawTelemetry,
    id: Date.parse(getString(rawTelemetry, "timestamp_servidor")),
    drone_id: getString(rawTelemetry, "drone_id"),
    latitude: getNumber(rawTelemetry, "latitude"),
    longitude: getNumber(rawTelemetry, "longitude"),
    altitude_m: getNumber(rawTelemetry, "altitude"),
    velocidade_ms: getNumber(rawTelemetry, "velocidade_m_s"),
    bateria_pct: 0.78,
    vento_ms: 0,
    direcao_vento: 0,
    status: getString(rawTelemetry, "status_simulacao"),
    criado_em: getString(rawTelemetry, "timestamp_servidor"),
    timestamp_servidor: getString(rawTelemetry, "timestamp_servidor"),
    status_simulacao: getString(rawTelemetry, "status_simulacao"),
    velocidade_m_s: getNumber(rawTelemetry, "velocidade_m_s"),
    distancia_percorrida_m: getNumber(rawTelemetry, "distancia_percorrida_m"),
    distancia_restante_m: getNumber(rawTelemetry, "distancia_restante_m"),
    progresso_percentual: getNumber(rawTelemetry, "progresso_percentual"),
    eta_segundos: getNumber(rawTelemetry, "eta_segundos"),
    tempo_restante_segundos: getNumber(rawTelemetry, "tempo_restante_segundos"),
    tempo_decorrido_segundos: getNumber(rawTelemetry, "tempo_decorrido_segundos"),
    tempo_total_estimado_segundos: getNumber(
      rawTelemetry,
      "tempo_total_estimado_segundos",
    ),
    horario_estimado_chegada: getString(
      rawTelemetry,
      "horario_estimado_chegada",
    ),
  };
}
