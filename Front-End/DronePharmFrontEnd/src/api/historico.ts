import { apiFetch } from "./client";
import type {
  HistoricoListResponse,
  KpiFarmaciaListResponse,
  KpiGeralResponse,
  KpiTempoRealResponse,
} from "../types/api";

const HISTORICO_BASE_PATH = "/api/v1/historico";

export interface ListHistoricoParams {
  drone_id?: string;
  farmacia_id?: number;
  limite?: number;
}

function buildHistoricoQuery(params?: ListHistoricoParams): string {
  const searchParams = new URLSearchParams();

  if (params?.drone_id !== undefined && params.drone_id.trim() !== "") {
    searchParams.set("drone_id", params.drone_id);
  }

  if (params?.farmacia_id !== undefined) {
    searchParams.set("farmacia_id", String(params.farmacia_id));
  }

  if (params?.limite !== undefined) {
    searchParams.set("limite", String(params.limite));
  }

  const query = searchParams.toString();

  return query.length > 0 ? `?${query}` : "";
}

export function getKpisGerais(): Promise<KpiGeralResponse> {
  return apiFetch<KpiGeralResponse>(`${HISTORICO_BASE_PATH}/kpis`);
}

export function getKpisTempoReal(): Promise<KpiTempoRealResponse> {
  return apiFetch<KpiTempoRealResponse>(
    `${HISTORICO_BASE_PATH}/kpis/tempo-real`,
  );
}

export function listHistorico(
  params?: ListHistoricoParams,
): Promise<HistoricoListResponse> {
  return apiFetch<HistoricoListResponse>(
    `${HISTORICO_BASE_PATH}/${buildHistoricoQuery(params)}`,
  );
}

export function getKpisFarmacias(): Promise<KpiFarmaciaListResponse> {
  return apiFetch<KpiFarmaciaListResponse>(
    `${HISTORICO_BASE_PATH}/kpis/farmacias`,
  );
}
