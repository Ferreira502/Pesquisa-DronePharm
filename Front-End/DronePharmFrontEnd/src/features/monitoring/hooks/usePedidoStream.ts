import { useEffect, useState } from "react";

import type { WSPedidoPayload } from "@/types/api";

const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 8;
const NORMAL_CLOSE_CODE = 1000;
const PING_INTERVAL_MS = 15_000;

interface PedidoStreamState {
  connected: boolean;
  error: string | null;
  lastEvent: WSPedidoPayload | null;
  latestByPedidoId: Record<number, WSPedidoPayload | undefined>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWSPedidoPayload(value: unknown): value is WSPedidoPayload {
  return (
    isRecord(value) &&
    value.tipo === "pedido" &&
    typeof value.evento === "string" &&
    typeof value.pedido_id === "number"
  );
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

function buildPedidosWebSocketUrl(): string {
  const token =
    import.meta.env.VITE_API_TOKEN?.trim() ||
    import.meta.env.VITE_WS_TOKEN?.trim() ||
    "";
  const url = new URL("/ws/pedidos", getWebSocketOrigin());
  url.searchParams.set("token", token);
  return url.toString();
}

function getCloseMessage(event: CloseEvent): string {
  if (event.reason.trim().length > 0) {
    return event.reason;
  }

  return `Conexão encerrada (código ${event.code}).`;
}

export function usePedidoStream(enabled: boolean): PedidoStreamState {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<WSPedidoPayload | null>(null);
  const [latestByPedidoId, setLatestByPedidoId] = useState<
    Record<number, WSPedidoPayload | undefined>
  >({});

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      setError(null);
      setLastEvent(null);
      setLatestByPedidoId({});
      return;
    }

    let reconnectAttempts = 0;
    let reconnectTimerId: number | null = null;
    let connectTimerId: number | null = null;
    let pingTimerId: number | null = null;
    let socket: WebSocket | null = null;
    let cancelled = false;

    const cleanupSocket = (): void => {
      if (pingTimerId !== null) {
        window.clearInterval(pingTimerId);
        pingTimerId = null;
      }

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
        setConnected(false);
        setError(message ?? "Não foi possível reconectar ao stream de pedidos.");
        return;
      }

      const delay = getReconnectDelay(reconnectAttempts);
      reconnectAttempts += 1;
      setConnected(false);
      setError(message ?? `Tentando reconectar em ${Math.round(delay / 1000)}s.`);

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
        socket = new WebSocket(buildPedidosWebSocketUrl());

        socket.onopen = () => {
          reconnectAttempts = 0;
          setConnected(true);
          setError(null);
          pingTimerId = window.setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send("ping");
            }
          }, PING_INTERVAL_MS);
        };

        socket.onmessage = (event) => {
          try {
            const parsedPayload: unknown = JSON.parse(event.data);

            if (!isWSPedidoPayload(parsedPayload)) {
              return;
            }

            setLastEvent(parsedPayload);
            setLatestByPedidoId((currentValue) => ({
              ...currentValue,
              [parsedPayload.pedido_id]: parsedPayload,
            }));
            setConnected(true);
            setError(null);
          } catch (caughtError) {
            const message =
              caughtError instanceof Error
                ? caughtError.message
                : "Falha desconhecida ao processar evento de pedido.";
            scheduleReconnect(`Falha ao processar stream de pedidos: ${message}`);
          }
        };

        socket.onerror = () => {
          setConnected(false);
          setError("Erro de conexao no canal de pedidos.");
        };

        socket.onclose = (event) => {
          if (cancelled || event.code === NORMAL_CLOSE_CODE) {
            cleanupSocket();
            setConnected(false);
            setError(null);
            return;
          }

          const extraHint =
            event.code === 1006
              ? " Verifique token e host do ws/pedidos."
              : "";
          scheduleReconnect(getCloseMessage(event));
          if (extraHint.length > 0) {
            setError((currentError) =>
              currentError === null ? `Canal de pedidos fechado inesperadamente.${extraHint}` : `${currentError}${extraHint}`,
            );
          }
        };
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Falha desconhecida ao abrir WebSocket de pedidos.";
        scheduleReconnect(`Não foi possível iniciar o stream de pedidos: ${message}`);
      }
    };

    // Evita o fechamento prematuro do socket durante a montagem dupla do React Strict Mode.
    connectTimerId = window.setTimeout(() => {
      connect();
    }, 50);

    return () => {
      cancelled = true;
      if (connectTimerId !== null) {
        window.clearTimeout(connectTimerId);
      }
      clearReconnectTimer(reconnectTimerId);
      cleanupSocket();
      setConnected(false);
      setError(null);
    };
  }, [enabled]);

  return { connected, error, lastEvent, latestByPedidoId };
}
