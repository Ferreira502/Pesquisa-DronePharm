import type {
  MapaSnapshotFeature,
  MapaSnapshotResponse,
  PedidoAtivoResponse,
  PedidoResponse,
  PedidoResumoTrackingResponse,
  PedidoStatus,
  PosicaoAtualResponse,
  WSTelemetriaPayload,
  WaypointResponse,
} from "@/types/api";

const PENDING_STATUSES: PedidoStatus[] = ["pendente", "calculado"];
const MILLISECONDS_PER_SECOND = 1000;
const HEARTBEAT_TIMEOUT_SECONDS = 10;

export interface MonitoringSnapshot {
  pedidoId: number;
  status: PedidoStatus;
  pedido: PedidoResumoTrackingResponse;
  destination: [number, number] | null;
  positionSnapshot: PosicaoAtualResponse | null;
  routeWaypoints: WaypointResponse[];
  routePoints: [number, number][];
  etaSegundos: number | null;
  tempoDecorridoSegundos: number | null;
  estimativaEntregaEm: string | null;
  despachadoEm: string | null;
  criadoEm: string | null;
  droneId: string;
}

export interface Posicao {
  lat: number;
  lng: number;
}

export interface Vetor {
  velocidade_ms: number;
  direcao: number;
}

export type StatusMissao = "em_voo" | "aguardando" | "emergencia";

export interface DroneMonitoramento {
  drone_id: string;
  pedido_id: number;
  status_pedido: PedidoStatus;
  posicao: Posicao;
  vetor: Vetor;
  status_missao: StatusMissao;
  eta_segundos: number | null;
}

export interface MonitoringGeoJsonSnapshot {
  depot: [number, number] | null;
  destination: [number, number] | null;
  dronePosition: [number, number] | null;
  routePoints: [number, number][];
}

function getPedidoResumo(
  pedidoAtivo: PedidoAtivoResponse | null,
  pedido: PedidoResponse | null,
): PedidoResumoTrackingResponse {
  if (pedidoAtivo !== null) {
    return pedidoAtivo.pedido;
  }

  return {
    prioridade: pedido?.prioridade ?? 2,
    descricao: pedido?.descricao ?? null,
    farmacia_id: pedido?.farmacia_id ?? 0,
    janela_fim: pedido?.janela_fim ?? null,
  };
}

function getDestination(
  pedidoAtivo: PedidoAtivoResponse | null,
  pedido: PedidoResponse | null,
): [number, number] | null {
  if (pedidoAtivo?.destino !== undefined) {
    return [pedidoAtivo.destino.latitude, pedidoAtivo.destino.longitude];
  }

  if (pedido === null) {
    return null;
  }

  return [pedido.coordenada.latitude, pedido.coordenada.longitude];
}

function getRoutePoints(
  pedidoAtivo: PedidoAtivoResponse | null,
): [number, number][] {
  const waypoints = sortWaypoints(pedidoAtivo?.rota?.waypoints ?? []);

  return routePointsFromWaypoints(waypoints);
}

export function waypointToLatLng(
  waypoint: WaypointResponse,
): [number, number] {
  return [waypoint.latitude, waypoint.longitude];
}

export function sortWaypoints(
  waypoints: WaypointResponse[],
): WaypointResponse[] {
  return [...waypoints].sort((left, right) => left.seq - right.seq);
}

export function routePointsFromWaypoints(
  waypoints: WaypointResponse[],
): [number, number][] {
  return sortWaypoints(waypoints).map(waypointToLatLng);
}

export function getPedidoIdFromWaypointLabel(label: string): number | null {
  const match = /pedido\s+#(\d+)/i.exec(label);

  if (match === null) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function pointCoordinatesToLatLng(
  feature: MapaSnapshotFeature,
): [number, number] | null {
  if (feature.geometry.type !== "Point") {
    return null;
  }

  const [longitude, latitude] = feature.geometry.coordinates;

  return [latitude, longitude];
}

function lineCoordinatesToLatLng(
  feature: MapaSnapshotFeature,
): [number, number][] {
  if (feature.geometry.type !== "LineString") {
    return [];
  }

  return feature.geometry.coordinates.map(([longitude, latitude]) => [
    latitude,
    longitude,
  ]);
}

export function buildMonitoringGeoJsonSnapshot(
  snapshot: MapaSnapshotResponse | null,
  pedidoId: number,
  rotaId: number | null,
  droneId: string,
): MonitoringGeoJsonSnapshot {
  if (snapshot === null) {
    return {
      depot: null,
      destination: null,
      dronePosition: null,
      routePoints: [],
    };
  }

  let depot: [number, number] | null = null;
  let destination: [number, number] | null = null;
  let dronePosition: [number, number] | null = null;
  let routePoints: [number, number][] = [];

  for (const feature of snapshot.features) {
    const featureType = feature.properties.tipo;

    if (featureType === "deposito" && depot === null) {
      depot = pointCoordinatesToLatLng(feature);
      continue;
    }

    if (
      featureType === "pedido" &&
      feature.properties.id === pedidoId &&
      destination === null
    ) {
      destination = pointCoordinatesToLatLng(feature);
      continue;
    }

    if (
      featureType === "drone" &&
      typeof feature.properties.id === "string" &&
      feature.properties.id === droneId &&
      dronePosition === null
    ) {
      dronePosition = pointCoordinatesToLatLng(feature);
      continue;
    }

    if (
      featureType === "rota_linha" &&
      rotaId !== null &&
      feature.properties.id === rotaId &&
      routePoints.length === 0
    ) {
      routePoints = lineCoordinatesToLatLng(feature);
    }
  }

  return {
    depot,
    destination,
    dronePosition,
    routePoints,
  };
}

export function isPedidoSelectable(status: PedidoStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

export function getMonitoringBadgeClassName(status: PedidoStatus): string {
  switch (status) {
    case "calculado":
    case "despachado":
      return "bi";
    case "em_voo":
      return "bk";
    case "entregue":
      return "bo";
    case "cancelado":
    case "falha":
      return "bd";
    case "pendente":
    default:
      return "bn";
  }
}

export function hasFlightLock(status: PedidoStatus): boolean {
  return status === "em_voo";
}

export function canCancelPedido(status: PedidoStatus): boolean {
  return status === "pendente" || status === "calculado";
}

export function canReplayTelemetry(historyLength: number): boolean {
  return historyLength > 0;
}

export function buildMonitoringSnapshot(
  pedidoAtivo: PedidoAtivoResponse | null,
  pedido: PedidoResponse | null,
): MonitoringSnapshot | null {
  if (pedidoAtivo === null && pedido === null) {
    return null;
  }

  return {
    pedidoId: pedidoAtivo?.pedido_id ?? pedido?.id ?? 0,
    status: pedidoAtivo?.status ?? pedido?.status ?? "pendente",
    pedido: getPedidoResumo(pedidoAtivo, pedido),
    destination: getDestination(pedidoAtivo, pedido),
    positionSnapshot: pedidoAtivo?.posicao_atual ?? null,
    routeWaypoints: sortWaypoints(pedidoAtivo?.rota?.waypoints ?? []),
    routePoints: getRoutePoints(pedidoAtivo),
    etaSegundos:
      pedidoAtivo?.eta_segundos ?? pedidoAtivo?.tempo_restante_seg ?? null,
    tempoDecorridoSegundos:
      pedidoAtivo?.tempo_decorrido_s ?? pedidoAtivo?.tempo_decorrido_seg ?? null,
    estimativaEntregaEm: pedidoAtivo?.estimativa_entrega_em ?? null,
    despachadoEm: pedidoAtivo?.despachado_em ?? pedido?.despachado_em ?? null,
    criadoEm: pedidoAtivo?.criado_em ?? pedido?.criado_em ?? null,
    droneId: pedidoAtivo?.drone?.id ?? pedidoAtivo?.drone_id ?? "",
  };
}

export function isSignalLost(
  currentFrame: WSTelemetriaPayload | null,
  positionSnapshot: PosicaoAtualResponse | null,
  nowTimestamp: number,
): boolean {
  const referenceTimestamp =
    currentFrame?.criado_em ?? positionSnapshot?.atualizado_em ?? null;

  if (referenceTimestamp === null) {
    return false;
  }

  const parsedTimestamp = Date.parse(referenceTimestamp);

  if (Number.isNaN(parsedTimestamp)) {
    return false;
  }

  return (
    nowTimestamp - parsedTimestamp >
    HEARTBEAT_TIMEOUT_SECONDS * MILLISECONDS_PER_SECOND
  );
}

function getMissionStatus(
  monitoringSnapshot: MonitoringSnapshot,
  currentFrame: WSTelemetriaPayload | null,
): StatusMissao {
  if (
    monitoringSnapshot.status === "em_voo" ||
    currentFrame?.status === "em_voo" ||
    currentFrame?.status_missao === "em_voo"
  ) {
    return "em_voo";
  }

  if (currentFrame?.status === "emergencia") {
    return "emergencia";
  }

  return "aguardando";
}

export function buildDroneMonitoramento(
  monitoringSnapshot: MonitoringSnapshot | null,
  currentFrame: WSTelemetriaPayload | null,
): DroneMonitoramento | null {
  if (monitoringSnapshot === null) {
    return null;
  }

  const latitude =
    currentFrame?.latitude ?? monitoringSnapshot.positionSnapshot?.latitude;
  const longitude =
    currentFrame?.longitude ?? monitoringSnapshot.positionSnapshot?.longitude;

  if (latitude === null || latitude === undefined) {
    return null;
  }

  if (longitude === null || longitude === undefined) {
    return null;
  }

  return {
    drone_id: monitoringSnapshot.droneId,
    pedido_id: monitoringSnapshot.pedidoId,
    status_pedido: monitoringSnapshot.status,
    posicao: {
      lat: latitude,
      lng: longitude,
    },
    vetor: {
      velocidade_ms: currentFrame?.velocidade_ms ?? 0,
      direcao: currentFrame?.direcao ?? currentFrame?.direcao_vento ?? 0,
    },
    status_missao: getMissionStatus(monitoringSnapshot, currentFrame),
    eta_segundos: monitoringSnapshot.etaSegundos,
  };
}
