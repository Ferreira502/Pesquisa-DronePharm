import { describe, expect, it } from "vitest";

import { farmaciaSchema } from "./farmaciaSchema";

const VALID_LATITUDE = "-19.932000000000123";
const VALID_LONGITUDE_WITH_COMMA = "-43,940800000000123";
const INVALID_LATITUDE = "-19.9320000000001234";

function createFarmaciaInput(latitude: string, longitude: string) {
  return {
    cnpj: "12345678000190",
    nome: "Farmacia Popular Centro",
    endereco: "Av. Afonso Pena, 1234",
    cidade: "Belo Horizonte",
    uf: "mg",
    latitude,
    longitude,
    deposito: false,
    ativa: true,
  };
}

describe("farmaciaSchema", () => {
  it("aceita coordenadas com ate 15 casas decimais e separador por virgula", () => {
    const result = farmaciaSchema.safeParse(
      createFarmaciaInput(VALID_LATITUDE, VALID_LONGITUDE_WITH_COMMA),
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    expect(result.data.latitude).toBe(Number(VALID_LATITUDE));
    expect(result.data.longitude).toBe(Number(VALID_LONGITUDE_WITH_COMMA.replace(",", ".")));
  });

  it("rejeita coordenadas com mais de 15 casas decimais", () => {
    const result = farmaciaSchema.safeParse(
      createFarmaciaInput(INVALID_LATITUDE, VALID_LONGITUDE_WITH_COMMA),
    );

    expect(result.success).toBe(false);
  });
});
