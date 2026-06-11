import { useEffect } from "react";

import type { WSTelemetriaPayload } from "../../../types/api";
import { useTelemetryStore } from "../store/useTelemetryStore";

const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 8;
const NORMAL_CLOSE_CODE = 1000;
const DEFAULT_TELEMETRY_ID = 0;
const LEGACY_NUMBER_FALLBACK = 0;

interface DroneTrackingState {
  connected: boolean;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getRawTelemetry(payload: Record<string, unknown>): Record<string, unknown> {
  return { ...payload };
}

function getTelemetryTimestamp(payload: Record<string, unknown>): string | null {
  return getString(payload.timestamp_servidor) ?? getString(payload.criado_em);
}

function getTelemetryId(payload: Record<string, unknown>, timestamp: string): number {
  const id = getFiniteNumber(payload.id);

  if (id !== null) {
    return id;
  }

  const parsedTimestamp = Date.parse(timestamp);

  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : DEFAULT_TELEMETRY_ID;
}

function normalizeWSTelemetriaPayload(
  value: unknown,
): WSTelemetriaPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const droneId = getString(value.drone_id);
  const latitude = getFiniteNumber(value.latitude);
  const longitude = getFiniteNumber(value.longitude);
  const timestamp = getTelemetryTimestamp(value);

  if (droneId === null || latitude === null || longitude === null || timestamp === null) {
    return null;
  }

  const altitude = getFiniteNumber(value.altitude_m) ?? getFiniteNumber(value.altitude);
  const velocidade =
    getFiniteNumber(value.velocidade_ms) ?? getFiniteNumber(value.velocidade_m_s);
  const status =
    getString(value.status) ?? getString(value.status_simulacao) ?? "em_voo";

  return {
    rawTelemetry: getRawTelemetry(value),
    id: getTelemetryId(value, timestamp),
    drone_id: droneId,
    latitude,
    longitude,
    altitude_m: altitude ?? LEGACY_NUMBER_FALLBACK,
    velocidade_ms: velocidade ?? LEGACY_NUMBER_FALLBACK,
    bateria_pct: getFiniteNumber(value.bateria_pct) ?? LEGACY_NUMBER_FALLBACK,
    vento_ms: getFiniteNumber(value.vento_ms) ?? LEGACY_NUMBER_FALLBACK,
    direcao_vento: getFiniteNumber(value.direcao_vento) ?? LEGACY_NUMBER_FALLBACK,
    status,
    criado_em: timestamp,
    timestamp_servidor: getString(value.timestamp_servidor) ?? timestamp,
    status_simulacao: getString(value.status_simulacao) ?? status,
    velocidade_m_s: velocidade,
    distancia_percorrida_m: getFiniteNumber(value.distancia_percorrida_m),
    distancia_restante_m: getFiniteNumber(value.distancia_restante_m),
    progresso_percentual: getFiniteNumber(value.progresso_percentual),
    eta_segundos: getFiniteNumber(value.eta_segundos),
    horario_estimado_chegada: getString(value.horario_estimado_chegada),
    tempo_decorrido_segundos: getFiniteNumber(value.tempo_decorrido_segundos),
    tempo_total_estimado_segundos: getFiniteNumber(
      value.tempo_total_estimado_segundos,
    ),
    tempo_restante_segundos: getFiniteNumber(value.tempo_restante_segundos),
  };
}

function clearReconnectTimer(timerId: number | null): void {
  if (timerId !== null) {
    window.clearTimeout(timerId);
  }
}

function getReconnectDelay(attempt: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function getWebSocketOrigin(): string {
  const configuredOrigin = import.meta.env.VITE_WS_URL?.trim();

  if (configuredOrigin && configuredOrigin.length > 0) {
    return configuredOrigin;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

function buildWebSocketUrl(droneId: string): string {
  const token = import.meta.env.VITE_API_TOKEN?.trim() ?? "";
  const url = new URL(`/ws/telemetria/${encodeURIComponent(droneId)}`, getWebSocketOrigin());
  url.searchParams.set("token", token);

  return url.toString();
}

function getCloseMessage(event: CloseEvent): string {
  if (event.reason.trim().length > 0) {
    return event.reason;
  }

  return `Conexao encerrada (codigo ${event.code}).`;
}

export function useDroneTracking(droneId: string): DroneTrackingState {
  const setFrame = useTelemetryStore((state) => state.setFrame);
  const appendHistory = useTelemetryStore((state) => state.appendHistory);
  const setStreamState = useTelemetryStore((state) => state.setStreamState);
  const streamState = useTelemetryStore((state) => state.getStreamState(droneId));

  useEffect(() => {
    if (!droneId) {
      return;
    }

    let reconnectAttempts = 0;
    let reconnectTimerId: number | null = null;
    let connectTimerId: number | null = null;
    let socket: WebSocket | null = null;
    let cancelled = false;

    const cleanupSocket = (): void => {
      if (socket === null) {
        return;
      }

      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;

      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close(NORMAL_CLOSE_CODE, "cleanup");
      }

      socket = null;
    };

    const scheduleReconnect = (message: string | null): void => {
      cleanupSocket();
      clearReconnectTimer(reconnectTimerId);

      if (cancelled) {
        return;
      }

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setStreamState(
          droneId,
          false,
          message ?? "Não foi possível reconectar ao stream de telemetria.",
        );
        return;
      }

      const delay = getReconnectDelay(reconnectAttempts);
      reconnectAttempts += 1;
      setStreamState(
        droneId,
        false,
        message ?? `Tentando reconectar em ${Math.round(delay / 1000)}s.`,
      );

      reconnectTimerId = window.setTimeout(() => {
        connect();
      }, delay);
    };

    const connect = (): void => {
      if (cancelled) {
        return;
      }

      clearReconnectTimer(reconnectTimerId);
      cleanupSocket();

      try {
        socket = new WebSocket(buildWebSocketUrl(droneId));

        socket.onopen = () => {
          reconnectAttempts = 0;
          setStreamState(droneId, true, null);
        };

        socket.onmessage = (event) => {
          try {
            const parsedPayload: unknown = JSON.parse(event.data);

            const normalizedPayload = normalizeWSTelemetriaPayload(parsedPayload);

            if (normalizedPayload === null) {
              console.warn("Payload de telemetria invalido recebido pelo WebSocket.", {
                droneId,
                payload: parsedPayload,
              });
              return;
            }

            setFrame(normalizedPayload.drone_id, normalizedPayload);
            appendHistory(normalizedPayload.drone_id, normalizedPayload);
            setStreamState(normalizedPayload.drone_id, true, null);
          } catch (caughtError) {
            const message =
              caughtError instanceof Error
                ? caughtError.message
                : "Falha desconhecida ao processar telemetria.";

            scheduleReconnect(
              `Falha ao processar mensagem do WebSocket: ${message}`,
            );
          }
        };

        socket.onerror = () => {
          console.error(`WebSocket error: Falha na conexao com o servidor de telemetria para o drone ${droneId}`);
          setStreamState(droneId, false, "Erro de conexao no canal de telemetria.");
        };

        socket.onclose = (event) => {
          console.warn("WebSocket closed", {
            droneId,
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          if (cancelled || event.code === NORMAL_CLOSE_CODE) {
            cleanupSocket();
            setStreamState(droneId, false, null);
            return;
          }

          scheduleReconnect(getCloseMessage(event));
        };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Falha desconhecida ao abrir WebSocket.";

        scheduleReconnect(`Não foi possível iniciar o stream: ${message}`);
      }
    };

    // Evita erro de "WebSocket is closed before the connection is established"
    // causado pela montagem e desmontagem imediata no React Strict Mode.
    connectTimerId = window.setTimeout(() => {
      connect();
    }, 50);

    return () => {
      cancelled = true;
      if (connectTimerId !== null) window.clearTimeout(connectTimerId);
      clearReconnectTimer(reconnectTimerId);
      cleanupSocket();
      setStreamState(droneId, false, null);
    };
  }, [appendHistory, droneId, setFrame, setStreamState]);

  return streamState;
}
