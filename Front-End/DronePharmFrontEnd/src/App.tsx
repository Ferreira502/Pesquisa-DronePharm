import { Suspense, lazy, type ReactElement } from "react";
import {
  BrowserRouter,
  Link,
  Outlet,
  Route,
  Routes,
  useParams,
} from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { MonitoringSelector } from "@/features/monitoring/components/MonitoringSelector";
import { OrderMonitoringDashboard } from "@/features/monitoring/OrderMonitoringDashboard";

const ListaPedidos = lazy(
  () => import("@/features/management/ListaPedidos"),
);
const FormPedido = lazy(
  () => import("@/features/management/FormPedido"),
);
const ListaDrones = lazy(
  () => import("@/features/drones/ListaDrones"),
);
const ListaFarmacias = lazy(
  () => import("@/features/farmacias/ListaFarmacias"),
);
const FormFarmacia = lazy(
  () => import("@/features/farmacias/FormFarmacia"),
);
const FormDrone = lazy(
  () => import("@/features/drones/FormDrone"),
);
const KpiDashboard = lazy(
  () => import("@/features/kpis/KpiDashboard"),
);

function getPedidoIdParamValue(pedidoIdParam: string | undefined): number {
  if (pedidoIdParam === undefined) {
    return 0;
  }

  const parsedPedidoId = Number(pedidoIdParam);

  if (!Number.isInteger(parsedPedidoId) || parsedPedidoId <= 0) {
    return 0;
  }

  return parsedPedidoId;
}

function LazyRouteOutlet(): ReactElement {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Outlet />
    </Suspense>
  );
}

function MonitoringRoute(): ReactElement {
  const { pedidoId } = useParams<{ pedidoId?: string }>();
  const resolvedPedidoId = getPedidoIdParamValue(pedidoId);

  if (resolvedPedidoId === 0) {
    return <MonitoringSelector />;
  }

  return <OrderMonitoringDashboard pedidoId={resolvedPedidoId} />;
}

function NotFoundRoute(): ReactElement {
  return (
    <div className="flex min-h-[calc(100dvh-56px)] items-center justify-center bg-[var(--surface-base)] p-6">
      <div className="flex max-w-md flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 text-center shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Rota não encontrada
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          A URL informada não corresponde a nenhuma tela do DronePharm.
        </p>
        <Button asChild>
          <Link to="/monitoramento">Ir para monitoramento</Link>
        </Button>
      </div>
    </div>
  );
}

export default function App(): ReactElement {
  return (
    <div className="dark min-h-dvh bg-[var(--surface-base)] text-[var(--text-primary)]">
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<MonitoringRoute />} />
            <Route path="monitoramento/:pedidoId?" element={<MonitoringRoute />} />

            <Route element={<LazyRouteOutlet />}>
              <Route path="pedidos" element={<ListaPedidos />} />
              <Route path="pedidos/novo" element={<FormPedido />} />
              <Route path="farmacias" element={<ListaFarmacias />} />
              <Route path="farmacias/nova" element={<FormFarmacia />} />
              <Route path="farmacias/:id/editar" element={<FormFarmacia />} />
              <Route path="drones" element={<ListaDrones />} />
              <Route path="drones/:droneId/editar" element={<ListaDrones />} />
              <Route path="drones/novo" element={<FormDrone />} />
              <Route path="kpis" element={<KpiDashboard />} />
            </Route>

            <Route path="*" element={<NotFoundRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
