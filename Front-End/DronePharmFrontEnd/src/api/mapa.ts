import { apiFetch } from "./client";
import type { MapaSnapshotResponse } from "../types/api";

const MAPA_BASE_PATH = "/api/v1/mapa";

export function getMapaSnapshot(): Promise<MapaSnapshotResponse> {
  return apiFetch<MapaSnapshotResponse>(`${MAPA_BASE_PATH}/snapshot`);
}
