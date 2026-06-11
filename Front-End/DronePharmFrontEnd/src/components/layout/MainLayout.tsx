import type { ReactElement } from "react";

import { NavLink, Outlet } from "react-router-dom";

const LAYOUT_CLASS_NAME =
  "flex min-h-dvh flex-col bg-[var(--surface-base)] text-[var(--text-primary)]";
const HEADER_CLASS_NAME =
  "flex h-14 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-panel)] px-6";
const BRAND_CLASS_NAME =
  "text-sm font-semibold tracking-[0.08em] text-[var(--text-primary)]";
const NAV_CLASS_NAME = "flex items-center gap-2 overflow-x-auto";
const LINK_BASE_CLASS_NAME =
  "rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors duration-150";
const LINK_IDLE_CLASS_NAME =
  "text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)] hover:text-[var(--text-primary)]";
const LINK_ACTIVE_CLASS_NAME =
  "bg-[var(--surface-overlay)] text-[var(--text-primary)] ring-1 ring-[var(--surface-border)]";
const MAIN_CLASS_NAME = "flex-1 min-h-0";

interface NavigationItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { to: "/monitoramento", label: "Monitoramento" },
  { to: "/kpis", label: "KPIs" },
  { to: "/pedidos", label: "Pedidos", end: true },
  { to: "/pedidos/novo", label: "Novo Pedido" },
  { to: "/farmacias", label: "Farmácias", end: true },
  { to: "/drones", label: "Drones" },
];

function getNavLinkClassName(isActive: boolean): string {
  if (isActive) {
    return `${LINK_BASE_CLASS_NAME} ${LINK_ACTIVE_CLASS_NAME}`;
  }

  return `${LINK_BASE_CLASS_NAME} ${LINK_IDLE_CLASS_NAME}`;
}

function renderNavigationItem(item: NavigationItem): ReactElement {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) => getNavLinkClassName(isActive)}
    >
      {item.label}
    </NavLink>
  );
}

export function MainLayout(): ReactElement {
  return (
    <div className={LAYOUT_CLASS_NAME}>
      <header className={HEADER_CLASS_NAME}>
        <div className={BRAND_CLASS_NAME}>DRONEPHARM</div>
        <nav className={NAV_CLASS_NAME}>
          {NAVIGATION_ITEMS.map((item) => renderNavigationItem(item))}
        </nav>
      </header>
      <main className={MAIN_CLASS_NAME}>
        <Outlet />
      </main>
    </div>
  );
}
