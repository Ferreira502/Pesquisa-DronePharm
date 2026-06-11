import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, vi } from "vitest";

import { makeTelemetryFrame } from "../test-utils/telemetry.mock";
import { MapCanvas } from "./MapCanvas";

const markerCalls = vi.hoisted(() => [] as Array<{ position: unknown }>);

vi.mock("leaflet", () => ({
  default: {
    divIcon: (options: unknown) => options,
    latLngBounds: (points: unknown) => points,
  },
}));

vi.mock("react-leaflet", () => ({
  Circle: ({ children }: { children?: ReactNode }) => (
    <div data-testid="circle">{children}</div>
  ),
  MapContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  Marker: ({
    children,
    position,
  }: {
    children?: ReactNode;
    position: unknown;
  }) => {
    markerCalls.push({ position });

    return <div data-testid="marker">{children}</div>;
  },
  Polyline: () => <div data-testid="polyline" />,
  TileLayer: () => <div data-testid="tile-layer" />,
  Tooltip: ({ children }: { children?: ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  useMap: () => ({
    fitBounds: vi.fn(),
  }),
}));

describe("MapCanvas drone tracking", () => {
  beforeEach(() => {
    markerCalls.length = 0;
  });

  it("renderiza o marcador usando latitude e longitude recebidas do backend", () => {
    const frame = makeTelemetryFrame({
      latitude: -19.9245,
      longitude: -43.9352,
      altitude: 120.75,
      timestamp_servidor: "2026-06-09T23:00:00Z",
    });

    render(
      <MapCanvas
        routePoints={[]}
        routeWaypoints={[]}
        destination={null}
        depot={null}
        snapshotDronePosition={null}
        currentFrame={frame}
        positionSnapshot={null}
        droneDirection={0}
        signalLost={false}
      />,
    );

    expect(markerCalls.at(-1)?.position).toEqual([-19.9245, -43.9352]);
    expect(
      screen.getByText("-19,9245, -43,9352 - alt 120,75m"),
    ).toBeVisible();
  });
});
