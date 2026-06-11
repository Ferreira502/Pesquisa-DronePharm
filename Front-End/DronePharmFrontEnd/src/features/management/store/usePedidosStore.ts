import { create } from "zustand";

import type { PedidoResponse } from "../../../types/api";

export interface PedidosStoreState {
  pedidos: PedidoResponse[];
  setPedidos: (pedidos: PedidoResponse[]) => void;
  adicionar: (pedido: PedidoResponse) => void;
  atualizar: (pedido: PedidoResponse) => void;
  remover: (id: number) => void;
}

const INITIAL_PEDIDOS: PedidoResponse[] = [];

export const usePedidosStore = create<PedidosStoreState>((set) => ({
  pedidos: INITIAL_PEDIDOS,
  setPedidos: (pedidos) => {
    set({ pedidos });
  },
  adicionar: (pedido) => {
    set((state) => ({
      pedidos: [...state.pedidos, pedido],
    }));
  },
  atualizar: (pedido) => {
    set((state) => ({
      pedidos: state.pedidos.map((item) =>
        item.id === pedido.id ? pedido : item
      ),
    }));
  },
  remover: (id) => {
    set((state) => ({
      pedidos: state.pedidos.filter((item) => item.id !== id),
    }));
  },
}));
