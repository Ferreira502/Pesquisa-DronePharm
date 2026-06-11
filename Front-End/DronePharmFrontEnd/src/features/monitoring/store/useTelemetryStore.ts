import { create } from "zustand";

import type {
  RotaResponse,
  WSTelemetriaPayload,
  WaypointResponse,
} from "../../../types/api";
import { sortWaypoints } from "../monitoringUtils";

interface DroneStreamState {
  connected: boolean;
  error: string | null;
}

type TelemetryFrameMap = Record<string, WSTelemetriaPayload | undefined>;
type TelemetryHistoryMap = Record<string, WSTelemetriaPayload[] | undefined>;
type DroneStreamStateMap = Record<string, DroneStreamState | undefined>;

export interface StoreState {
  framesByDroneId: TelemetryFrameMap;
  historyByDroneId: TelemetryHistoryMap;
  streamStateByDroneId: DroneStreamStateMap;
  isReplaying: boolean;
  routePreview: WaypointResponse[];
  selectedDroneId: string;
  getFrame: (droneId: string) => WSTelemetriaPayload | null;
  getHistory: (droneId: string) => WSTelemetriaPayload[];
  getStreamState: (droneId: string) => DroneStreamState;
  setFrame: (droneId: string, frame: WSTelemetriaPayload) => void;
  appendHistory: (droneId: string, frame: WSTelemetriaPayload) => void;
  setReplaying: (value: boolean) => void;
  setStreamState: (
    droneId: string,
    connected: boolean,
    error: string | null,
  ) => void;
  setRoutePreview: (rota: RotaResponse | null) => void;
  setSelectedDroneId: (droneId: string) => void;
  reset: () => void;
}

const EMPTY_HISTORY: WSTelemetriaPayload[] = [];
const DISCONNECTED_STREAM_STATE: DroneStreamState = {
  connected: false,
  error: null,
};

function isSameFrame(
  currentFrame: WSTelemetriaPayload,
  nextFrame: WSTelemetriaPayload,
): boolean {
  return (
    currentFrame.criado_em === nextFrame.criado_em ||
    currentFrame.timestamp_servidor === nextFrame.timestamp_servidor
  );
}

function getFrameTimestamp(frame: WSTelemetriaPayload): number {
  const timestamp = Date.parse(frame.timestamp_servidor ?? frame.criado_em);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isOlderFrame(
  currentFrame: WSTelemetriaPayload | undefined,
  nextFrame: WSTelemetriaPayload,
): boolean {
  if (currentFrame === undefined) {
    return false;
  }

  return getFrameTimestamp(nextFrame) < getFrameTimestamp(currentFrame);
}

function logTelemetryStorage(frame: WSTelemetriaPayload): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug("DronePharm telemetry storage parity", {
    receivedPayload: frame.rawTelemetry,
    storedFrame: frame,
  });
}

function getHistoryByDroneId(
  historyByDroneId: TelemetryHistoryMap,
  droneId: string,
): WSTelemetriaPayload[] {
  return historyByDroneId[droneId] ?? EMPTY_HISTORY;
}

function getStreamStateByDroneId(
  streamStateByDroneId: DroneStreamStateMap,
  droneId: string,
): DroneStreamState {
  return streamStateByDroneId[droneId] ?? DISCONNECTED_STREAM_STATE;
}

export const useTelemetryStore = create<StoreState>((set, get) => ({
  framesByDroneId: {},
  historyByDroneId: {},
  streamStateByDroneId: {},
  isReplaying: false,
  routePreview: [],
  selectedDroneId: "",
  getFrame: (droneId) => {
    if (droneId.length === 0) {
      return null;
    }

    return get().framesByDroneId[droneId] ?? null;
  },
  getHistory: (droneId) => {
    if (droneId.length === 0) {
      return EMPTY_HISTORY;
    }

    return getHistoryByDroneId(get().historyByDroneId, droneId);
  },
  getStreamState: (droneId) => {
    if (droneId.length === 0) {
      return DISCONNECTED_STREAM_STATE;
    }

    return getStreamStateByDroneId(get().streamStateByDroneId, droneId);
  },
  setFrame: (droneId, frame) => {
    if (droneId.length === 0) {
      return;
    }

    set((state) => {
      if (isOlderFrame(state.framesByDroneId[droneId], frame)) {
        return state;
      }

      logTelemetryStorage(frame);

      return {
        framesByDroneId: {
          ...state.framesByDroneId,
          [droneId]: frame,
        },
      };
    });
  },
  appendHistory: (droneId, frame) => {
    if (droneId.length === 0) {
      return;
    }

    set((state) => {
      const currentHistory = getHistoryByDroneId(state.historyByDroneId, droneId);
      const lastFrame = currentHistory[currentHistory.length - 1];

      if (lastFrame !== undefined && isSameFrame(lastFrame, frame)) {
        return state;
      }

      if (isOlderFrame(lastFrame, frame)) {
        return state;
      }

      return {
        historyByDroneId: {
          ...state.historyByDroneId,
          [droneId]: [...currentHistory, frame],
        },
      };
    });
  },
  setReplaying: (value) => {
    set({ isReplaying: value });
  },
  setStreamState: (droneId, connected, error) => {
    if (droneId.length === 0) {
      return;
    }

    set((state) => ({
      streamStateByDroneId: {
        ...state.streamStateByDroneId,
        [droneId]: {
          connected,
          error,
        },
      },
    }));
  },
  setRoutePreview: (rota) => {
    set({
      routePreview: sortWaypoints(rota?.waypoints ?? []),
    });
  },
  setSelectedDroneId: (droneId) => {
    set({ selectedDroneId: droneId });
  },
  reset: () => {
    set({
      framesByDroneId: {},
      historyByDroneId: {},
      streamStateByDroneId: {},
      isReplaying: false,
      routePreview: [],
      selectedDroneId: "",
    });
  },
}));
