import { describe, expect, it } from "vitest";

import { pedidoItemSchema } from "./pedidoSchema";

const VALID_LATITUDE_WITH_COMMA = "-19,932000000000123";
const VALID_LONGITUDE = "-43.940800000000123";
const INVALID_LONGITUDE = "-43.9408000000001234";

function createPedidoInput(latitude: string, longitude: string) {
  return {
    farmacia_id: "1",
    latitude,
    longitude,
    peso_kg: "0.85",
    prioridade: "2",
    descricao: "Insulina",
    janela_fim: "",
  };
}

describe("pedidoItemSchema", () => {
  it("aceita coordenadas com ate 15 casas decimais e separador por virgula", () => {
    const result = pedidoItemSchema.safeParse(
      createPedidoInput(VALID_LATITUDE_WITH_COMMA, VALID_LONGITUDE),
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    expect(result.data.latitude).toBe(Number(VALID_LATITUDE_WITH_COMMA.replace(",", ".")));
    expect(result.data.longitude).toBe(Number(VALID_LONGITUDE));
  });

  it("rejeita coordenadas com mais de 15 casas decimais", () => {
    const result = pedidoItemSchema.safeParse(
      createPedidoInput(VALID_LATITUDE_WITH_COMMA, INVALID_LONGITUDE),
    );

    expect(result.success).toBe(false);
  });
});
