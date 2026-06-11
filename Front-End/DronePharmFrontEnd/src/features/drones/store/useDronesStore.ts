import { create } from "zustand";

import type { DroneResponse } from "../../../types/api";

export interface DronesStoreState {
  drones: DroneResponse[];
  setDrones: (drones: DroneResponse[]) => void;
  adicionar: (drone: DroneResponse) => void;
  atualizar: (drone: DroneResponse) => void;
  remover: (id: string) => void;
}

const INITIAL_DRONES: DroneResponse[] = [];

export const useDronesStore = create<DronesStoreState>((set) => ({
  drones: INITIAL_DRONES,
  setDrones: (drones) => {
    set({ drones });
  },
  adicionar: (drone) => {
    set((state) => ({
      drones: [...state.drones, drone],
    }));
  },
  atualizar: (drone) => {
    set((state) => ({
      drones: state.drones.map((item) => (item.id === drone.id ? drone : item)),
    }));
  },
  remover: (id) => {
    set((state) => ({
      drones: state.drones.filter((item) => item.id !== id),
    }));
  },
}));
