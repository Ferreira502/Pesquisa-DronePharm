import { screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { makeTelemetryFrame } from "../test-utils/telemetry.mock";
import {
  getMetricValue,
  renderSimulationPanel,
} from "../test-utils/telemetryTestUtils";

function formatExpectedTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeStyle: "medium",
  }).format(new Date(value));
}

describe("SimulationProgressPanel", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe os KPIs exatamente a partir do payload bruto recebido", () => {
    const frame = makeTelemetryFrame();

    renderSimulationPanel({ currentFrame: frame });

    expect(getMetricValue("Status")).toBe("Executando");
    expect(getMetricValue("Velocidade atual")).toBe("8,42 m/s");
    expect(getMetricValue("Dist. percorrida")).toBe("315,9876 m");
    expect(getMetricValue("Dist. restante")).toBe("684,0124 m");
    expect(getMetricValue("Progresso")).toBe("31,59876%");
    expect(getMetricValue("ETA")).toBe("81,2378 s");
    expect(getMetricValue("Tempo restante")).toBe("81,2378 s");
    expect(getMetricValue("Tempo decorrido")).toBe("37,5123 s");
    expect(getMetricValue("Tempo total")).toBe("118,7501 s");
    expect(getMetricValue("Altitude")).toBe("120,75 m");
    expect(getMetricValue("Latitude")).toBe("-19,9245");
    expect(getMetricValue("Longitude")).toBe("-43,9352");
    expect(getMetricValue("Chegada estimada")).toBe(
      formatExpectedTime("2026-06-09T23:01:21Z"),
    );
  });

  it("exibe payload inconsistente sem recalcular ETA, progresso ou tempo restante", () => {
    renderSimulationPanel({
      currentFrame: makeTelemetryFrame({
        velocidade_m_s: 10,
        distancia_restante_m: 999,
        eta_segundos: 123,
        tempo_restante_segundos: 456,
        progresso_percentual: 42.12345,
      }),
    });

    expect(getMetricValue("Dist. restante")).toBe("999 m");
    expect(getMetricValue("Velocidade atual")).toBe("10 m/s");
    expect(getMetricValue("ETA")).toBe("123 s");
    expect(getMetricValue("Tempo restante")).toBe("456 s");
    expect(getMetricValue("Progresso")).toBe("42,12345%");
    expect(screen.queryByText("99,9 s")).not.toBeInTheDocument();
  });

  it("nao deriva valores quando campos de KPI estao ausentes", () => {
    const frame = makeTelemetryFrame();
    const partialFrame = {
      ...frame,
      rawTelemetry: {
        timestamp_servidor: frame.timestamp_servidor,
        status_simulacao: frame.status_simulacao,
        drone_id: frame.drone_id,
        latitude: frame.latitude,
        longitude: frame.longitude,
        altitude: frame.rawTelemetry.altitude,
        velocidade_m_s: frame.rawTelemetry.velocidade_m_s,
      },
      progresso_percentual: null,
      eta_segundos: null,
      tempo_restante_segundos: null,
    };

    renderSimulationPanel({
      currentFrame: partialFrame,
      progressPct: null,
      etaSegundos: null,
      tempoRestanteSegundos: null,
    });

    expect(getMetricValue("Progresso")).toBe("--");
    expect(getMetricValue("ETA")).toBe("--");
    expect(getMetricValue("Tempo restante")).toBe("--");
  });

  it("estado concluido nao força progresso nem ETA localmente", () => {
    renderSimulationPanel({
      currentFrame: makeTelemetryFrame({
        status_simulacao: "concluido",
        progresso_percentual: 98.7654,
        eta_segundos: 7.25,
      }),
      pedidoStatus: "entregue",
    });

    expect(getMetricValue("Status")).toBe("Concluido");
    expect(getMetricValue("Progresso")).toBe("98,7654%");
    expect(getMetricValue("ETA")).toBe("7,25 s");
  });

  it("estado pausado mantem o ultimo payload recebido sem recalcular metricas", () => {
    renderSimulationPanel({
      currentFrame: makeTelemetryFrame({
        status_simulacao: "pausado",
        eta_segundos: 127.6,
        tempo_restante_segundos: 140.4,
      }),
    });

    expect(getMetricValue("Status")).toBe("Pausado");
    expect(getMetricValue("ETA")).toBe("127,6 s");
    expect(getMetricValue("Tempo restante")).toBe("140,4 s");
  });

  it("atualiza KPIs conforme sequencia de frames recebidos", () => {
    const firstFrame = makeTelemetryFrame({
      timestamp_servidor: "2026-06-09T23:00:00Z",
      progresso_percentual: 31.59876,
      eta_segundos: 81.2378,
      latitude: -19.9245,
      longitude: -43.9352,
    });
    const secondFrame = makeTelemetryFrame({
      timestamp_servidor: "2026-06-09T23:00:02Z",
      progresso_percentual: 33.1111,
      eta_segundos: 79.5,
      latitude: -19.9251,
      longitude: -43.9361,
    });
    const view = renderSimulationPanel({ currentFrame: firstFrame });

    expect(getMetricValue("Progresso")).toBe("31,59876%");
    expect(getMetricValue("ETA")).toBe("81,2378 s");
    expect(getMetricValue("Latitude")).toBe("-19,9245");

    view.rerender(
      <div>
        <button type="button">placeholder</button>
      </div>,
    );
    view.unmount();
    renderSimulationPanel({ currentFrame: secondFrame });

    expect(getMetricValue("Progresso")).toBe("33,1111%");
    expect(getMetricValue("ETA")).toBe("79,5 s");
    expect(getMetricValue("Latitude")).toBe("-19,9251");
    expect(screen.queryByText("31,59876%")).not.toBeInTheDocument();
  });
});