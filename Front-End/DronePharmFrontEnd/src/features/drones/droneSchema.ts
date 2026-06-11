import { z } from "zod";

import { useDronesStore } from "./store/useDronesStore";

const DRONE_ID_REGEX = /^DP-\d{2,4}$/;
const MODELO_MIN_LENGTH = 2;
const MODELO_MAX_LENGTH = 80;

function isDroneIdUnique(id: string): boolean {
  const drones = useDronesStore.getState().drones;

  return !drones.some((drone) => drone.id === id);
}

export const droneSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(DRONE_ID_REGEX, "O ID deve seguir o formato DP-00, DP-000 ou DP-0000.")
    .refine(isDroneIdUnique, {
      message: "Este ID já está em uso",
    }),
  modelo: z
    .string()
    .trim()
    .min(MODELO_MIN_LENGTH, "O modelo deve ter pelo menos 2 caracteres.")
    .max(MODELO_MAX_LENGTH, "O modelo deve ter no máximo 80 caracteres."),
  autonomia_km: z.coerce
    .number({
      error: "A autonomia deve ser um número válido.",
    })
    .positive("A autonomia deve ser maior que zero."),
  carga_max_kg: z.coerce
    .number({
      error: "A carga máxima deve ser um número válido.",
    })
    .positive("A carga máxima deve ser maior que zero."),
  velocidade_ms: z.coerce
    .number({
      error: "A velocidade deve ser um número válido.",
    })
    .positive("A velocidade deve ser maior que zero."),
});

export type DroneFormInput = z.input<typeof droneSchema>;
export type DroneFormData = z.output<typeof droneSchema>;
