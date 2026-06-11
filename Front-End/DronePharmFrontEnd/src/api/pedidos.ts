import { apiFetch } from "./client";
import type {
  PedidoAtivoResponse,
  PedidoCreate,
  PedidoListResponse,
  PedidoResponse,
  PrioridadeEnum,
  PedidoStatus,
} from "../types/api";

interface ListPedidosParams {
  status?: PedidoStatus;
  prioridade?: PrioridadeEnum;
  farmacia_id?: number;
  limite?: number;
  offset?: number;
}

const PEDIDOS_BASE_PATH = "/api/v1/pedidos";

function buildListPedidosQuery(params?: ListPedidosParams): string {
  const searchParams = new URLSearchParams();

  if (params?.status !== undefined) {
    searchParams.set("status", params.status);
  }

  if (params?.prioridade !== undefined) {
    searchParams.set("prioridade", String(params.prioridade));
  }

  if (params?.farmacia_id !== undefined) {
    searchParams.set("farmacia_id", String(params.farmacia_id));
  }

  if (params?.limite !== undefined) {
    searchParams.set("limite", String(params.limite));
  }

  if (params?.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

export function criarPedido(body: PedidoCreate): Promise<PedidoResponse> {
  return apiFetch<PedidoResponse>(`${PEDIDOS_BASE_PATH}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function criarPedidosEmLote(
  bodies: PedidoCreate[],
): Promise<PedidoResponse[]> {
  const createdPedidos: PedidoResponse[] = [];

  for (const body of bodies) {
    const createdPedido = await criarPedido(body);
    createdPedidos.push(createdPedido);
  }

  return createdPedidos;
}

export function getPedido(id: number): Promise<PedidoResponse> {
  return apiFetch<PedidoResponse>(`${PEDIDOS_BASE_PATH}/${id}`);
}

export function getPedidoAtivo(id: number): Promise<PedidoAtivoResponse> {
  return apiFetch<PedidoAtivoResponse>(`${PEDIDOS_BASE_PATH}/${id}/ativo`);
}

export function listPedidos(
  params?: ListPedidosParams,
): Promise<PedidoListResponse> {
  const query = buildListPedidosQuery(params);

  return apiFetch<PedidoListResponse>(`${PEDIDOS_BASE_PATH}/${query}`);
}

export function cancelarPedido(id: number): Promise<void> {
  return apiFetch<void>(`${PEDIDOS_BASE_PATH}/${id}/cancelar`, {
    method: "PATCH",
  });
}

export function entregarPedido(id: number): Promise<void> {
  return apiFetch<void>(`${PEDIDOS_BASE_PATH}/${id}/entregar`, {
    method: "PATCH",
  });
}
