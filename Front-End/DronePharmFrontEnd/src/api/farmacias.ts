import { apiFetch } from "./client";
import type {
  FarmaciaCreate,
  FarmaciaListResponse,
  FarmaciaResponse,
  FarmaciaUpdate,
} from "../types/api";

const FARMACIAS_BASE_PATH = "/api/v1/farmacias";

export function listFarmacias(): Promise<FarmaciaListResponse> {
  return apiFetch<FarmaciaListResponse>(`${FARMACIAS_BASE_PATH}/`);
}

export function getDepositoFarmacia(): Promise<FarmaciaResponse> {
  return apiFetch<FarmaciaResponse>(`${FARMACIAS_BASE_PATH}/deposito`);
}

export function getFarmacia(id: number): Promise<FarmaciaResponse> {
  return apiFetch<FarmaciaResponse>(`${FARMACIAS_BASE_PATH}/${id}`);
}

export function criarFarmacia(
  body: FarmaciaCreate,
): Promise<FarmaciaResponse> {
  return apiFetch<FarmaciaResponse>(`${FARMACIAS_BASE_PATH}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function atualizarFarmacia(
  id: number,
  body: FarmaciaUpdate,
): Promise<FarmaciaResponse> {
  return apiFetch<FarmaciaResponse>(`${FARMACIAS_BASE_PATH}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function desativarFarmacia(id: number): Promise<void> {
  return apiFetch<void>(`${FARMACIAS_BASE_PATH}/${id}`, {
    method: "DELETE",
  });
}
