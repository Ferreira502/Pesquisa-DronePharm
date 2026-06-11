import {
  memo,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactElement,
} from "react";

import L, { type DivIcon, type LatLngExpression } from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import { lerp } from "@/lib/utils";
import { getPedidoIdFromWaypointLabel } from "../monitoringUtils";
import type {
  PedidoStatus,
  PosicaoAtualResponse,
  WSTelemetriaPayload,
  WaypointResponse,
} from "@/types/api";

const MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ROUTE_COLOR = "var(--map-route)";
const ROUTE_OUTLINE_COLOR = "var(--map-route-outline)";
const DESTINATION_COLOR = "var(--map-destination)";
const ORIGIN_COLOR = "var(--map-origin)";
const WAYPOINT_COLOR = "var(--map-waypoint)";
const DEFAULT_CENTER: [number, number] = [-19.932, -43.9408];
const DEFAULT_ZOOM = 15;
const DESTINATION_RADIUS_METERS = 18;
const FIT_BOUNDS_PADDING: [number, number] = [32, 32];
const DRONE_OPACITY_LOST = 0.5;
const DRONE_OPACITY_DEFAULT = 1;
const DEFAULT_PACKET_INTERVAL_MS = 2_000;
const INSTANT_ANIMATION_DURATION_MS = 0;
const NUMBER_LOCALE = "pt-BR";
const MAP_WRAPPER_CLASS_NAME =
  "relative h-full min-h-[420px] w-full overflow-hidden bg-[var(--map-base)]";
const MAP_CLASS_NAME = "h-full w-full";
const MAP_LABEL_CLASS_NAME =
  "pointer-events-none absolute bottom-5 left-5 z-[500] rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-1 font-[var(--font-data)] text-[11px] text-[var(--text-muted)]";

interface MapCanvasProps {
  routePoints: [number, number][];
  routeWaypoints: WaypointResponse[];
  routePedidoStatusById?: Record<number, PedidoStatus | null>;
  destination: [number, number] | null;
  depot: [number, number] | null;
  snapshotDronePosition: [number, number] | null;
  currentFrame: WSTelemetriaPayload | null;
  positionSnapshot: PosicaoAtualResponse | null;
  droneDirection: number | null;
  signalLost: boolean;
}

interface FitBoundsControllerProps {
  points: [number, number][];
}

interface StaticRouteLayerProps {
  routePoints: [number, number][];
  routeWaypoints: WaypointResponse[];
  routePedidoStatusById: Record<number, PedidoStatus | null>;
  destination: [number, number] | null;
  depot: [number, number] | null;
}

interface DroneMarkerLayerProps {
  dronePosition: [number, number] | null;
  droneDirection: number | null;
  packetTimestamp: string | null;
  simulationStatus: string | null;
  signalLost: boolean;
}

function createDroneIconHtml(direction: number, signalLost: boolean): string {
  const fillColor = signalLost ? "#94a3b8" : ROUTE_COLOR;
  const opacity = signalLost ? DRONE_OPACITY_LOST : DRONE_OPACITY_DEFAULT;
  const filter = signalLost ? "grayscale(1)" : "none";

  return `
    <div style="width:28px;height:28px;transform:rotate(${direction}deg);transform-origin:center center;display:flex;align-items:center;justify-content:center;opacity:${opacity};filter:${filter} drop-shadow(0 2px 4px var(--map-marker-shadow));">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2L21 22L12 17L3 22L12 2Z" fill="${fillColor}" stroke="var(--map-marker-halo)" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke fill" />
      </svg>
    </div>
  `;
}

function createStaticIcon(color: string, size: number): DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid var(--map-marker-halo);box-shadow:0 2px 8px var(--map-marker-shadow),0 0 0 1px var(--surface-border);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function getWaypointBorderColor(status: PedidoStatus | null): string {
  switch (status) {
    case "entregue":
      return "var(--status-ok)";
    case "em_voo":
      return "var(--accent)";
    case "despachado":
    case "calculado":
      return "var(--status-warn)";
    case "cancelado":
    case "falha":
      return "var(--status-danger)";
    case "pendente":
    default:
      return ROUTE_COLOR;
  }
}

function getWaypointFillColor(status: PedidoStatus | null): string {
  switch (status) {
    case "entregue":
      return "var(--status-ok)";
    default:
      return WAYPOINT_COLOR;
  }
}

function createWaypointIcon(seq: number, status: PedidoStatus | null): DivIcon {
  const borderColor = getWaypointBorderColor(status);
  const fillColor = getWaypointFillColor(status);
  const textColor = status === "entregue" ? "#f8fafc" : "#020617";

  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${fillColor};color:${textColor};border:2px solid ${borderColor};font-family:var(--font-data);font-size:11px;font-weight:700;box-shadow:0 8px 20px var(--map-marker-shadow),0 0 0 2px var(--map-marker-halo);">
        ${seq}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function createDroneIcon(direction: number, signalLost: boolean): DivIcon {
  return L.divIcon({
    className: "",
    html: createDroneIconHtml(direction, signalLost),
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function getPointsSignature(points: [number, number][]): string {
  return points.map((point) => point.join(",")).join("|");
}

function getFallbackPosition(
  positionSnapshot: PosicaoAtualResponse | null,
): [number, number] | null {
  if (
    positionSnapshot?.latitude === null ||
    positionSnapshot?.latitude === undefined ||
    positionSnapshot?.longitude === null ||
    positionSnapshot?.longitude === undefined
  ) {
    return null;
  }

  return [positionSnapshot.latitude, positionSnapshot.longitude];
}

function getDronePosition(
  currentFrame: WSTelemetriaPayload | null,
  positionSnapshot: PosicaoAtualResponse | null,
  snapshotDronePosition: [number, number] | null,
): [number, number] | null {
  if (currentFrame !== null) {
    return [currentFrame.latitude, currentFrame.longitude];
  }

  return getFallbackPosition(positionSnapshot) ?? snapshotDronePosition;
}

function getPacketTimestamp(currentFrame: WSTelemetriaPayload | null): string | null {
  return currentFrame?.timestamp_servidor ?? currentFrame?.criado_em ?? null;
}

function getSimulationStatus(currentFrame: WSTelemetriaPayload | null): string | null {
  return currentFrame?.status_simulacao ?? currentFrame?.status ?? null;
}

function getMapCenter(
  routePoints: [number, number][],
  destination: [number, number] | null,
  dronePosition: [number, number] | null,
  depot: [number, number] | null,
): [number, number] {
  if (dronePosition !== null) {
    return dronePosition;
  }

  if (routePoints.length > 0) {
    return routePoints[0];
  }

  if (depot !== null) {
    return depot;
  }

  if (destination !== null) {
    return destination;
  }

  return DEFAULT_CENTER;
}

function getMapLabel(
  currentFrame: WSTelemetriaPayload | null,
  positionSnapshot: PosicaoAtualResponse | null,
  snapshotDronePosition: [number, number] | null,
): string {
  const latitude =
    typeof currentFrame?.rawTelemetry.latitude === "number"
      ? currentFrame.rawTelemetry.latitude
      : positionSnapshot?.latitude ?? null;
  const longitude =
    typeof currentFrame?.rawTelemetry.longitude === "number"
      ? currentFrame.rawTelemetry.longitude
      : positionSnapshot?.longitude ?? null;
  const altitude =
    typeof currentFrame?.rawTelemetry.altitude === "number"
      ? currentFrame.rawTelemetry.altitude
      : typeof currentFrame?.rawTelemetry.altitude_m === "number"
        ? currentFrame.rawTelemetry.altitude_m
        : positionSnapshot?.altitude_m ?? null;
  const numberFormatter = new Intl.NumberFormat(NUMBER_LOCALE, {
    maximumFractionDigits: 20,
  });

  if (
    (latitude === null || longitude === null) &&
    snapshotDronePosition !== null
  ) {
    return `${numberFormatter.format(snapshotDronePosition[0])}, ${numberFormatter.format(snapshotDronePosition[1])} - snapshot inicial`;
  }

  if (latitude === null || longitude === null) {
    return "Aguardando posição do drone";
  }

  const altitudeLabel = altitude === null ? "--" : numberFormatter.format(altitude);

  return `${numberFormatter.format(latitude)}, ${numberFormatter.format(longitude)} - alt ${altitudeLabel}m`;
}

function FitBoundsController({
  points,
}: FitBoundsControllerProps): ReactElement | null {
  const map = useMap();
  const previousSignatureRef = useRef("");

  useEffect(() => {
    if (points.length === 0) {
      return;
    }

    const pointsSignature = getPointsSignature(points);

    if (pointsSignature === previousSignatureRef.current) {
      return;
    }

    previousSignatureRef.current = pointsSignature;
    map.fitBounds(L.latLngBounds(points as LatLngExpression[]), {
      padding: FIT_BOUNDS_PADDING,
    });
  }, [map, points]);

  return null;
}

const ORIGIN_ICON = createStaticIcon(ORIGIN_COLOR, 12);

const StaticRouteLayer = memo(function StaticRouteLayer({
  routePoints,
  routeWaypoints,
  routePedidoStatusById,
  destination,
  depot,
}: StaticRouteLayerProps): ReactElement {
  return (
    <>
      {routePoints.length > 1 ? (
        <>
          <Polyline
            positions={routePoints}
            pathOptions={{
              color: ROUTE_OUTLINE_COLOR,
              weight: 7,
              opacity: 0.95,
            }}
          />
          <Polyline
            positions={routePoints}
            pathOptions={{ color: ROUTE_COLOR, weight: 3, opacity: 0.9 }}
          />
        </>
      ) : null}
      {depot !== null ? (
        <Marker position={depot} icon={ORIGIN_ICON}>
          <Tooltip direction="top" offset={[0, -8]}>
            Depósito
          </Tooltip>
        </Marker>
      ) : routePoints[0] !== undefined ? (
        <Marker position={routePoints[0]} icon={ORIGIN_ICON}>
          <Tooltip direction="top" offset={[0, -8]}>
            Origem da rota
          </Tooltip>
        </Marker>
      ) : null}
      {routeWaypoints.map((waypoint) => (
        (() => {
          const waypointPedidoId = getPedidoIdFromWaypointLabel(waypoint.label);
          const waypointStatus =
            waypointPedidoId === null
              ? null
              : routePedidoStatusById[waypointPedidoId] ?? null;
          const tooltipLabel =
            waypointStatus === null
              ? waypoint.label
              : `${waypoint.label} - ${waypointStatus}`;

          return (
            <Marker
              key={`${waypoint.seq}-${waypoint.latitude}-${waypoint.longitude}`}
              position={[waypoint.latitude, waypoint.longitude]}
              icon={createWaypointIcon(waypoint.seq, waypointStatus)}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                {tooltipLabel}
              </Tooltip>
            </Marker>
          );
        })()
      ))}
      {destination !== null ? (
        <Circle
          center={destination}
          radius={DESTINATION_RADIUS_METERS}
          pathOptions={{
            color: DESTINATION_COLOR,
            fillColor: DESTINATION_COLOR,
            fillOpacity: 0.12,
            opacity: 0.78,
            weight: 2,
          }}
        />
      ) : null}
    </>
  );
});

const DroneMarkerLayer = memo(function DroneMarkerLayer({
  dronePosition,
  droneDirection,
  packetTimestamp,
  simulationStatus,
  signalLost,
}: DroneMarkerLayerProps): ReactElement | null {
  const animationFrameRef = useRef<number | null>(null);
  const animatedPositionRef = useRef<[number, number] | null>(dronePosition);
  const previousPacketTimestampRef = useRef<string | null>(packetTimestamp);
  const [animatedPosition, setAnimatedPosition] = useReducer(
    (_current: [number, number] | null, next: [number, number] | null) => next,
    dronePosition,
  );
  const droneIcon = useMemo(
    () => createDroneIcon(droneDirection ?? 0, signalLost),
    [droneDirection, signalLost],
  );

  useEffect(() => {
    if (dronePosition === null) {
      animatedPositionRef.current = null;
      setAnimatedPosition(null);
      return;
    }

    const status = simulationStatus?.toLowerCase() ?? "";
    const shouldHoldPosition = status === "pausado" || status === "erro";
    const shouldFixExactPosition = status === "concluido";

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (shouldHoldPosition) {
      return;
    }

    if (shouldFixExactPosition) {
      animatedPositionRef.current = dronePosition;
      setAnimatedPosition(dronePosition);
      return;
    }

    const startPosition = animatedPositionRef.current ?? dronePosition;
    const [startLat, startLng] = startPosition;
    const [targetLat, targetLng] = dronePosition;
    const previousPacketTimestamp = previousPacketTimestampRef.current;
    const parsedPreviousTimestamp =
      previousPacketTimestamp === null ? Number.NaN : Date.parse(previousPacketTimestamp);
    const parsedPacketTimestamp =
      packetTimestamp === null ? Number.NaN : Date.parse(packetTimestamp);
    const packetIntervalMs =
      Number.isNaN(parsedPreviousTimestamp) || Number.isNaN(parsedPacketTimestamp)
        ? DEFAULT_PACKET_INTERVAL_MS
        : Math.max(parsedPacketTimestamp - parsedPreviousTimestamp, INSTANT_ANIMATION_DURATION_MS);
    const animationDurationMs =
      previousPacketTimestamp === null ? INSTANT_ANIMATION_DURATION_MS : packetIntervalMs;
    const startedAt = window.performance.now();

    previousPacketTimestampRef.current = packetTimestamp;

    const animate = (timestamp: number): void => {
      const elapsed = timestamp - startedAt;
      const progress =
        animationDurationMs === INSTANT_ANIMATION_DURATION_MS
          ? 1
          : Math.min(elapsed / animationDurationMs, 1);
      const nextPosition: [number, number] = [
        lerp(startLat, targetLat, progress),
        lerp(startLng, targetLng, progress),
      ];

      animatedPositionRef.current = nextPosition;
      setAnimatedPosition(nextPosition);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dronePosition, packetTimestamp, simulationStatus]);

  if (animatedPosition === null) {
    return null;
  }

  return (
    <Marker position={animatedPosition} icon={droneIcon}>
      <Tooltip direction="top" offset={[0, -10]}>
        {signalLost ? "Sinal do drone indisponível" : "Drone em operação"}
      </Tooltip>
    </Marker>
  );
});

export function MapCanvas({
  routePoints,
  routeWaypoints,
  routePedidoStatusById = {},
  destination,
  depot,
  snapshotDronePosition,
  currentFrame,
  positionSnapshot,
  droneDirection,
  signalLost,
}: MapCanvasProps): ReactElement {
  const dronePosition = getDronePosition(
    currentFrame,
    positionSnapshot,
    snapshotDronePosition,
  );
  const packetTimestamp = getPacketTimestamp(currentFrame);
  const simulationStatus = getSimulationStatus(currentFrame);
  const mapCenter = getMapCenter(routePoints, destination, dronePosition, depot);
  const overlayPoints = useMemo(() => {
    const points = [...routePoints];

    if (depot !== null) {
      points.push(depot);
    }

    if (destination !== null) {
      points.push(destination);
    }

    if (dronePosition !== null) {
      points.push(dronePosition);
    }

    return points;
  }, [depot, destination, dronePosition, routePoints]);
  const mapLabel = getMapLabel(
    currentFrame,
    positionSnapshot,
    snapshotDronePosition,
  );

  return (
    <div className={MAP_WRAPPER_CLASS_NAME}>
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        className={MAP_CLASS_NAME}
        scrollWheelZoom
      >
        <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
        <FitBoundsController points={overlayPoints} />
        <StaticRouteLayer
          routePoints={routePoints}
          routeWaypoints={routeWaypoints}
          routePedidoStatusById={routePedidoStatusById}
          destination={destination}
          depot={depot}
        />
        <DroneMarkerLayer
          dronePosition={dronePosition}
          droneDirection={droneDirection}
          packetTimestamp={packetTimestamp}
          simulationStatus={simulationStatus}
          signalLost={signalLost}
        />
      </MapContainer>
      <div className={MAP_LABEL_CLASS_NAME}>{mapLabel}</div>
    </div>
  );
}
