import { apiFetch } from "./client";
import type {
  DroneCreate,
  DroneListResponse,
  DroneResponse,
  DroneUpdate,
  StatusDroneEnum,
} from "../types/api";

const DRONES_BASE_PATH = "/api/v1/drones";

interface ListDronesParams {
  status?: StatusDroneEnum;
}

function buildListDronesQuery(params?: ListDronesParams): string {
  const searchParams = new URLSearchParams();

  if (params?.status !== undefined) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();

  return query.length > 0 ? `?${query}` : "";
}

export function listDrones(params?: ListDronesParams): Promise<DroneListResponse> {
  return apiFetch<DroneListResponse>(
    `${DRONES_BASE_PATH}/${buildListDronesQuery(params)}`,
  );
}

export function getDrone(id: string): Promise<DroneResponse> {
  return apiFetch<DroneResponse>(`${DRONES_BASE_PATH}/${id}`);
}

export function criarDrone(body: DroneCreate): Promise<DroneResponse> {
  return apiFetch<DroneResponse>(`${DRONES_BASE_PATH}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function atualizarDrone(
  id: string,
  body: DroneUpdate
): Promise<DroneResponse> {
  return apiFetch<DroneResponse>(`${DRONES_BASE_PATH}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function atualizarStatusDrone(
  id: string,
  status: StatusDroneEnum,
): Promise<void> {
  const searchParams = new URLSearchParams({ status });

  return apiFetch<void>(
    `${DRONES_BASE_PATH}/${id}/status?${searchParams.toString()}`,
    {
      method: "PATCH",
    },
  );
}

export function reativarDrone(
  id: string,
  bateriaPct = 1,
): Promise<void> {
  const searchParams = new URLSearchParams({
    bateria_pct: String(bateriaPct),
  });

  return apiFetch<void>(
    `/api/v1/frota/${id}/reativar?${searchParams.toString()}`,
    {
      method: "POST",
    },
  );
}
