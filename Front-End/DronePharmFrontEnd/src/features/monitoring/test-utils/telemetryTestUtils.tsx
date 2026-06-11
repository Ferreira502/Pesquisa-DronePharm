import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";

import { SimulationProgressPanel } from "../components/SimulationProgressPanel";
import { makeTelemetryFrame } from "./telemetry.mock";

type PanelProps = React.ComponentProps<typeof SimulationProgressPanel>;

export function renderSimulationPanel(
  overrides: Partial<PanelProps> = {},
): ReturnType<typeof render> {
  const currentFrame = overrides.currentFrame ?? makeTelemetryFrame();

  return render(
    <SimulationProgressPanel
      pedidoStatus="em_voo"
      simulationStatus={null}
      currentFrame={currentFrame}
      progressPct={currentFrame.progresso_percentual ?? null}
      tempoDecorridoSegundos={currentFrame.tempo_decorrido_segundos ?? null}
      etaSegundos={currentFrame.eta_segundos ?? null}
      tempoRestanteSegundos={currentFrame.tempo_restante_segundos ?? null}
      tempoTotalEstimadoSegundos={
        currentFrame.tempo_total_estimado_segundos ?? null
      }
      horarioEstimadoChegada={currentFrame.horario_estimado_chegada ?? null}
      isSimulatingNow={false}
      streamConnected
      signalLost={false}
      connectionMessage={null}
      {...overrides}
    />,
  );
}

export function getMetricValue(label: string): string {
  const labelElement = screen.getByText(label);
  const card = labelElement.closest("div");

  if (card === null) {
    throw new Error(`Metric card for ${label} was not found.`);
  }

  return within(card).getAllByText(/.+/).at(-1)?.textContent ?? "";
}

export function renderWithElement(element: ReactElement): ReturnType<typeof render> {
  return render(element);
}
