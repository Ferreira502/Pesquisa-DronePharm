import { create } from "zustand";

import type { FarmaciaResponse } from "../../../types/api";

export interface FarmaciasStoreState {
  farmacias: FarmaciaResponse[];
  setFarmacias: (farmacias: FarmaciaResponse[]) => void;
  adicionar: (farmacia: FarmaciaResponse) => void;
  atualizar: (farmacia: FarmaciaResponse) => void;
  remover: (id: number) => void;
}

const INITIAL_FARMACIAS: FarmaciaResponse[] = [];

export const useFarmaciasStore = create<FarmaciasStoreState>((set) => ({
  farmacias: INITIAL_FARMACIAS,
  setFarmacias: (farmacias) => {
    set({ farmacias });
  },
  adicionar: (farmacia) => {
    set((state) => ({
      farmacias: [...state.farmacias, farmacia],
    }));
  },
  atualizar: (farmacia) => {
    set((state) => ({
      farmacias: state.farmacias.map((item) =>
        item.id === farmacia.id ? farmacia : item
      ),
    }));
  },
  remover: (id) => {
    set((state) => ({
      farmacias: state.farmacias.filter((item) => item.id !== id),
    }));
  },
}));
