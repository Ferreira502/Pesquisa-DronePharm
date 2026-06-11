import { afterEach, beforeEach, vi } from "vitest";

import { makeTelemetryFrame } from "../test-utils/telemetry.mock";
import { useTelemetryStore } from "./useTelemetryStore";

describe("useTelemetryStore telemetry parity", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    useTelemetryStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserva rawTelemetry como fonte bruta recebida do backend", () => {
    const frame = makeTelemetryFrame({
      progresso_percentual: 73.8421,
      eta_segundos: 127.6,
    });

    useTelemetryStore.getState().setFrame(frame.drone_id, frame);

    const storedFrame = useTelemetryStore.getState().getFrame(frame.drone_id);

    expect(storedFrame?.rawTelemetry).toEqual(frame.rawTelemetry);
    expect(storedFrame?.rawTelemetry.progresso_percentual).toBe(73.8421);
    expect(storedFrame?.rawTelemetry.eta_segundos).toBe(127.6);
  });

  it("atualiza o frame atual quando chega pacote mais recente", () => {
    const firstFrame = makeTelemetryFrame({
      timestamp_servidor: "2026-06-09T23:00:00Z",
      progresso_percentual: 31.59876,
    });
    const secondFrame = makeTelemetryFrame({
      timestamp_servidor: "2026-06-09T23:00:02Z",
      latitude: -19.925,
      longitude: -43.936,
      progresso_percentual: 32.7777,
    });

    useTelemetryStore.getState().setFrame(firstFrame.drone_id, firstFrame);
    useTelemetryStore.getState().setFrame(secondFrame.drone_id, secondFrame);

    const storedFrame = useTelemetryStore.getState().getFrame(firstFrame.drone_id);

    expect(storedFrame?.timestamp_servidor).toBe("2026-06-09T23:00:02Z");
    expect(storedFrame?.rawTelemetry.progresso_percentual).toBe(32.7777);
    expect(storedFrame?.rawTelemetry.latitude).toBe(-19.925);
    expect(storedFrame?.rawTelemetry.longitude).toBe(-43.936);
  });

  it("nao deixa pacote antigo sobrescrever o estado consolidado mais recente", () => {
    const newestFrame = makeTelemetryFrame({
      timestamp_servidor: "2026-06-09T23:00:04Z",
      eta_segundos: 80,
    });
    const olderFrame = makeTelemetryFrame({
      timestamp_servidor: "2026-06-09T23:00:02Z",
      eta_segundos: 999,
    });

    useTelemetryStore.getState().setFrame(newestFrame.drone_id, newestFrame);
    useTelemetryStore.getState().setFrame(olderFrame.drone_id, olderFrame);

    const storedFrame = useTelemetryStore.getState().getFrame(newestFrame.drone_id);

    expect(storedFrame?.timestamp_servidor).toBe("2026-06-09T23:00:04Z");
    expect(storedFrame?.rawTelemetry.eta_segundos).toBe(80);
  });

  it("nao duplica pacote com mesmo timestamp no historico", () => {
    const frame = makeTelemetryFrame();

    useTelemetryStore.getState().appendHistory(frame.drone_id, frame);
    useTelemetryStore.getState().appendHistory(frame.drone_id, frame);

    expect(useTelemetryStore.getState().getHistory(frame.drone_id)).toHaveLength(1);
  });
});
